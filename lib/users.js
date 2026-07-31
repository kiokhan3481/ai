// Keeps a directory of everyone who has messaged the bot, so the admin
// panel can list them and broadcast messages. Also holds tiny bits of
// "pending action" state (e.g. "the next message from this chat is an
// image prompt") since a serverless function has no memory of its own
// between requests.
//
// Requires Vercel KV (see README). Without it, the bot still works for
// normal chat, but the admin panel will show an empty/unavailable list.

const { kvCommand, kvConfigured } = require("./kv");

const USERS_HASH = "bot:users";

function isAdmin(chatId) {
  const admins = (process.env.ADMIN_CHAT_IDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return admins.includes(String(chatId));
}

async function recordUser(message) {
  if (!kvConfigured()) return;
  const chat = message.chat || {};
  const from = message.from || {};
  const chatId = String(chat.id);

  const profile = {
    chatId,
    firstName: from.first_name || chat.first_name || "",
    lastName: from.last_name || chat.last_name || "",
    username: from.username || chat.username || "",
    lastSeen: new Date().toISOString(),
    isAdmin: isAdmin(chatId),
  };

  try {
    await kvCommand(["HSET", USERS_HASH, chatId, JSON.stringify(profile)]);
  } catch {
    // best-effort — a failed write here shouldn't break the chat reply
  }
}

async function listUsers() {
  if (!kvConfigured()) return [];
  try {
    const result = await kvCommand(["HGETALL", USERS_HASH]);
    const flat = result?.result || [];
    // Upstash returns HGETALL as a flat [field, value, field, value, ...] array
    const users = [];
    for (let i = 0; i < flat.length; i += 2) {
      try {
        users.push(JSON.parse(flat[i + 1]));
      } catch {
        // skip malformed entries
      }
    }
    users.sort((a, b) => (b.lastSeen || "").localeCompare(a.lastSeen || ""));
    return users;
  } catch {
    return [];
  }
}

// --- tiny pending-action state (e.g. "awaiting_image", "awaiting_broadcast") ---

async function setPendingAction(chatId, action, ttlSeconds = 600) {
  if (!kvConfigured()) return;
  try {
    await kvCommand(["SET", `state:${chatId}`, action, "EX", String(ttlSeconds)]);
  } catch {
    // ignore
  }
}

async function getPendingAction(chatId) {
  if (!kvConfigured()) return null;
  try {
    const result = await kvCommand(["GET", `state:${chatId}`]);
    return result?.result || null;
  } catch {
    return null;
  }
}

async function clearPendingAction(chatId) {
  if (!kvConfigured()) return;
  try {
    await kvCommand(["DEL", `state:${chatId}`]);
  } catch {
    // ignore
  }
}

module.exports = {
  isAdmin,
  recordUser,
  listUsers,
  setPendingAction,
  getPendingAction,
  clearPendingAction,
};
