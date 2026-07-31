const { checkAdminToken } = require("../../lib/adminAuth");
const { listUsers } = require("../../lib/users");
const { sendMessage } = require("../../lib/telegram");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method not allowed" });
  }
  if (!checkAdminToken(req)) {
    return res.status(401).json({ error: "unauthorized" });
  }

  const { chatId, text } = req.body || {};
  if (!text || !String(text).trim()) {
    return res.status(400).json({ error: "text is required" });
  }

  let targets;
  if (chatId) {
    targets = [String(chatId)];
  } else {
    const users = await listUsers();
    targets = users.map((u) => u.chatId);
  }

  if (!targets.length) {
    return res.status(200).json({ sent: 0, failed: 0, total: 0 });
  }

  let sent = 0;
  let failed = 0;
  for (const id of targets) {
    try {
      await sendMessage(id, text);
      sent += 1;
    } catch {
      failed += 1;
    }
    // stay comfortably under Telegram's ~30 msg/sec limit
    await sleep(40);
  }

  return res.status(200).json({ sent, failed, total: targets.length });
};
