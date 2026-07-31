// Optional short-term conversation memory.
//
// Serverless functions are stateless between invocations, so without a
// database the bot forgets everything between messages. This module adds
// memory automatically IF you attach a Vercel KV store (Storage tab in the
// Vercel dashboard -> Create Database -> KV).
//
// If KV isn't configured, the bot runs in stateless mode (each message
// handled independently) and everything else still works fine.

const { kvGetJSON, kvSetJSON, kvDel, kvConfigured } = require("./kv");

const MAX_TURNS = 12; // keep last N messages (user+assistant combined)
const HISTORY_TTL = 60 * 60 * 6; // 6 hours of inactivity

async function getHistory(chatId) {
  if (!kvConfigured()) return [];
  const history = await kvGetJSON(`chat:${chatId}:history`);
  return history || [];
}

async function saveHistory(chatId, history) {
  if (!kvConfigured()) return;
  const trimmed = history.slice(-MAX_TURNS);
  await kvSetJSON(`chat:${chatId}:history`, trimmed, HISTORY_TTL);
}

async function clearHistory(chatId) {
  if (!kvConfigured()) return;
  await kvDel(`chat:${chatId}:history`);
}

module.exports = { getHistory, saveHistory, clearHistory, kvConfigured };
