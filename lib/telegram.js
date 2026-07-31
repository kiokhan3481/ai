// Minimal Telegram Bot API client using global fetch (Node 18+).

const TELEGRAM_API = (token) => `https://api.telegram.org/bot${token}`;

function getToken() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not set");
  return token;
}

// Telegram's hard message length limit is 4096 chars.
const TELEGRAM_MAX_LEN = 4096;

function splitMessage(text, maxLen = TELEGRAM_MAX_LEN - 100) {
  if (text.length <= maxLen) return [text];
  const chunks = [];
  let remaining = text;
  while (remaining.length > maxLen) {
    // try to split on the last newline before the limit so code blocks
    // don't get cut mid-line when possible
    let splitAt = remaining.lastIndexOf("\n", maxLen);
    if (splitAt <= 0) splitAt = maxLen;
    chunks.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt);
  }
  if (remaining.length) chunks.push(remaining);
  return chunks;
}

async function sendMessage(chatId, text, opts = {}) {
  const token = getToken();
  const chunks = splitMessage(text);
  const results = [];
  for (const chunk of chunks) {
    const res = await fetch(`${TELEGRAM_API(token)}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: chunk,
        disable_web_page_preview: true,
        ...opts,
      }),
    });
    const data = await res.json().catch(() => ({}));
    results.push(data);
  }
  return results;
}

async function sendChatAction(chatId, action = "typing") {
  const token = getToken();
  try {
    await fetch(`${TELEGRAM_API(token)}/sendChatAction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, action }),
    });
  } catch {
    // best-effort only, ignore failures
  }
}

async function sendPhoto(chatId, photoUrl, caption = "") {
  const token = getToken();
  const res = await fetch(`${TELEGRAM_API(token)}/sendPhoto`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, photo: photoUrl, caption }),
  });
  return res.json().catch(() => ({}));
}

async function sendDocument(chatId, fileContent, filename, caption = "", mimeType = "text/plain") {
  const token = getToken();
  const form = new FormData();
  form.append("chat_id", chatId);
  if (caption) form.append("caption", caption);
  form.append(
    "document",
    new Blob([fileContent], { type: mimeType }),
    filename
  );
  const res = await fetch(`${TELEGRAM_API(token)}/sendDocument`, {
    method: "POST",
    body: form,
  });
  return res.json().catch(() => ({}));
}

async function downloadFile(fileId) {
  const token = getToken();
  const infoRes = await fetch(`${TELEGRAM_API(token)}/getFile?file_id=${encodeURIComponent(fileId)}`);
  const info = await infoRes.json();
  const filePath = info?.result?.file_path;
  if (!filePath) throw new Error("Telegram getFile returned no file_path");
  const fileRes = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`);
  if (!fileRes.ok) throw new Error(`Failed to download file: ${fileRes.status}`);
  const arrayBuffer = await fileRes.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function answerCallbackQuery(callbackQueryId, text) {
  const token = getToken();
  try {
    await fetch(`${TELEGRAM_API(token)}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: callbackQueryId, text, show_alert: false }),
    });
  } catch {
    // best-effort
  }
}

// --- Keyboard builders --------------------------------------------------

// Persistent menu shown under the text input (replaces slash commands).
function mainKeyboard({ admin = false } = {}) {
  const rows = [
    ["🖼 ساخت تصویر", "🧹 پاک کردن حافظه"],
    ["ℹ️ راهنما"],
  ];
  if (admin) rows.push(["🛠 پنل ادمین"]);
  return {
    keyboard: rows.map((row) => row.map((text) => ({ text }))),
    resize_keyboard: true,
    is_persistent: true,
  };
}

// Forces the user to reply with free text for the next message (used to
// collect the image prompt after tapping "ساخت تصویر").
function forceReplyMarkup(placeholder) {
  return { force_reply: true, input_field_placeholder: placeholder };
}

function inlineUrlButton(text, url) {
  return { inline_keyboard: [[{ text, url }]] };
}

module.exports = {
  sendMessage,
  sendChatAction,
  sendPhoto,
  sendDocument,
  splitMessage,
  downloadFile,
  answerCallbackQuery,
  mainKeyboard,
  forceReplyMarkup,
  inlineUrlButton,
};
