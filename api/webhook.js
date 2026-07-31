const { askGroq } = require("../lib/groq");
const {
  sendMessage,
  sendChatAction,
  sendPhoto,
  downloadFile,
  mainKeyboard,
  forceReplyMarkup,
  inlineUrlButton,
} = require("../lib/telegram");
const { summarizeUploadedFile } = require("../lib/fileReview");
const { looksLikeImageRequest, extractImagePrompt, buildImageUrl } = require("../lib/image");
const { getHistory, saveHistory, clearHistory } = require("../lib/memory");
const { deliverCodeIfAny } = require("../lib/codeDelivery");
const { looksLikeFileRequest } = require("../lib/codeExtract");
const {
  isAdmin,
  recordUser,
  listUsers,
  setPendingAction,
  getPendingAction,
  clearPendingAction,
} = require("../lib/users");

const HELP_TEXT =
  "می‌تونی هر سوالی بپرسی، کد بخوای، یا کمک بگیری برای طراحی پروژه — کافیه بنویسی.\n\n" +
  "دکمه‌های پایین صفحه:\n" +
  "🖼 ساخت تصویر — توضیح تصویر رو می‌گیرم و برات می‌سازمش\n" +
  "🧹 پاک کردن حافظه — گفتگوی قبلی رو فراموش می‌کنم\n" +
  "ℹ️ راهنما — همین پیام\n\n" +
  "📎 یه فایل zip یا کد هم برام بفرستی، بازش می‌کنم و بررسیش می‌کنم.";

function adminPanelUrl(req) {
  const base =
    process.env.APP_URL ||
    `https://${req.headers["x-forwarded-host"] || req.headers.host}`;
  const token = process.env.ADMIN_PANEL_TOKEN || "";
  return `${base}/api/admin?token=${encodeURIComponent(token)}`;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(200).send("OK - webhook is alive. Configure it with setWebhook.");
  }

  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (expectedSecret) {
    const gotSecret = req.headers["x-telegram-bot-api-secret-token"];
    if (gotSecret !== expectedSecret) {
      return res.status(401).send("unauthorized");
    }
  }

  const update = req.body;
  let chatIdForErrors;

  try {
    const message = update?.message;
    if (!message) {
      return res.status(200).send("ignored");
    }

    const chatId = message.chat.id;
    chatIdForErrors = chatId;
    const text = (message.text || "").trim();
    const admin = isAdmin(chatId);

    await recordUser(message);

    // --- Uploaded file (zip or code/text file) --------------------------------
    if (message.document) {
      const doc = message.document;
      const filename = doc.file_name || "file";
      const caption = (message.caption || "").trim();

      const MAX_TELEGRAM_BOT_FILE = 20 * 1024 * 1024;
      if (doc.file_size && doc.file_size > MAX_TELEGRAM_BOT_FILE) {
        await sendMessage(chatId, "این فایل بزرگ‌تر از ۲۰ مگابایته و بات‌های تلگرام نمی‌تونن دانلودش کنن 😕");
        return res.status(200).send("ok");
      }

      await sendChatAction(chatId, "typing");
      try {
        const buffer = await downloadFile(doc.file_id);
        const summary = await summarizeUploadedFile(buffer, filename, doc.mime_type || "");

        if (!summary) {
          await sendMessage(
            chatId,
            "این نوع فایل رو نمی‌تونم بررسی کنم — فعلاً فقط zip یا فایل‌های متنی/کد (js, py, json, md, ...) پشتیبانی می‌شن."
          );
          return res.status(200).send("ok");
        }

        const instruction =
          caption ||
          "این فایل/پروژه رو بررسی کن: ساختارش رو خلاصه بگو، مشکلات یا باگ‌های احتمالی رو پیدا کن، و اگه پیشنهادی برای بهترش کردن داری بگو.";

        const messages = [{ role: "user", content: `${instruction}\n\n${summary}` }];
        const reply = await askGroq(messages, { maxTokens: 2048 });
        await sendMessage(chatId, reply);
      } catch (err) {
        console.error("File review error:", err);
        await sendMessage(chatId, "توی خوندن یا بررسی این فایل مشکلی پیش اومد 🙏");
      }
      return res.status(200).send("ok");
    }

    if (!text) {
      await sendMessage(chatId, "فعلاً فقط پیام متنی رو می‌فهمم 🙂", {
        reply_markup: mainKeyboard({ admin }),
      });
      return res.status(200).send("ok");
    }

    // --- Entry point / menu -------------------------------------------------
    if (text === "/start") {
      await sendMessage(
        chatId,
        "سلام! من دستیار هوش‌مصنوعی‌ت هستم 🤖\nهرچی بخوای می‌تونم انجام بدم: کدنویسی، توضیح مفاهیم، طراحی پروژه و غیره.\n\n" +
          HELP_TEXT,
        { reply_markup: mainKeyboard({ admin }) }
      );
      return res.status(200).send("ok");
    }

    if (text === "ℹ️ راهنما" || text === "/help") {
      await sendMessage(chatId, HELP_TEXT, { reply_markup: mainKeyboard({ admin }) });
      return res.status(200).send("ok");
    }

    if (text === "🧹 پاک کردن حافظه" || text === "/reset") {
      await clearHistory(chatId);
      await clearPendingAction(chatId);
      await sendMessage(chatId, "حافظه‌ی گفتگو پاک شد. از نو شروع می‌کنیم 🧹", {
        reply_markup: mainKeyboard({ admin }),
      });
      return res.status(200).send("ok");
    }

    if (text === "🖼 ساخت تصویر" || text === "/image") {
      await setPendingAction(chatId, "awaiting_image");
      await sendMessage(chatId, "توضیح تصویری که می‌خوای رو بنویس:", {
        reply_markup: forceReplyMarkup("مثلاً: یک گربه فضانورد روی ماه"),
      });
      return res.status(200).send("ok");
    }

    if (text === "🛠 پنل ادمین") {
      if (!admin) {
        await sendMessage(chatId, "این بخش فقط برای مدیر بات در دسترسه.");
        return res.status(200).send("ok");
      }
      const users = await listUsers();
      await sendMessage(
        chatId,
        `👥 تعداد اعضا: ${users.length}\n\nبرای دیدن لیست کامل و ارسال پیام به اعضا، پنل ادمین رو باز کن:`,
        { reply_markup: inlineUrlButton("🛠 باز کردن پنل ادمین", adminPanelUrl(req)) }
      );
      return res.status(200).send("ok");
    }

    // --- Resolve any pending action (e.g. we just asked for an image prompt) --
    const pending = await getPendingAction(chatId);
    if (pending === "awaiting_image") {
      await clearPendingAction(chatId);
      await sendChatAction(chatId, "upload_photo");
      const imageUrl = buildImageUrl(text);
      await sendPhoto(chatId, imageUrl, `🖼️ ${text}`);
      return res.status(200).send("ok");
    }

    // --- "send that as a file" follow-up (reuses the last assistant reply) ---
    if (looksLikeFileRequest(text)) {
      const history = await getHistory(chatId);
      const lastAssistant = [...history].reverse().find((m) => m.role === "assistant");
      if (!lastAssistant) {
        await sendMessage(chatId, "هنوز کدی برای فرستادن ندارم — اول یه چیزی ازم بخواه بسازم یا بنویسم.");
        return res.status(200).send("ok");
      }
      const result = await deliverCodeIfAny(chatId, lastAssistant.content, { force: true });
      if (!result.sent) {
        await sendMessage(chatId, "توی پیام قبلی کدی پیدا نکردم که به‌صورت فایل بفرستم.");
      }
      return res.status(200).send("ok");
    }

    // --- Legacy natural-language image detection (still supported) -----------
    if (looksLikeImageRequest(text)) {
      const prompt = extractImagePrompt(text) || text;
      await sendChatAction(chatId, "upload_photo");
      const imageUrl = buildImageUrl(prompt);
      await sendPhoto(chatId, imageUrl, `🖼️ ${prompt}`);
      return res.status(200).send("ok");
    }

    // --- Regular chat / code / project help via Groq -------------------------
    await sendChatAction(chatId, "typing");

    const history = await getHistory(chatId);
    const messages = [...history, { role: "user", content: text }];

    const reply = await askGroq(messages);

    const updatedHistory = [...messages, { role: "assistant", content: reply }];
    await saveHistory(chatId, updatedHistory);

    const delivery = await deliverCodeIfAny(chatId, reply);
    if (!delivery.isProject) {
      // Project responses already got their own narrative message inside
      // deliverCodeIfAny; for everything else, send the normal chat reply
      // (deliverCodeIfAny may have additionally attached a file/zip above).
      await sendMessage(chatId, reply);
    }
    return res.status(200).send("ok");
  } catch (err) {
    console.error("Webhook error:", err);
    try {
      if (chatIdForErrors) {
        await sendMessage(chatIdForErrors, "یه مشکلی پیش اومد، دوباره امتحان کن 🙏");
      }
    } catch {
      // swallow secondary errors
    }
    return res.status(200).send("handled-with-error");
  }
};
