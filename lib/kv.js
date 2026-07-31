// Shared REST client for Vercel KV (Upstash Redis under the hood).
// Every module that needs persistence (memory, users, pending-action state)
// goes through this so there's one place that knows about the REST API shape.

function kvConfigured() {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

async function kvCommand(command) {
  if (!kvConfigured()) return null;
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });
  return res.json();
}

// Run several Redis commands in one round trip via Upstash's pipeline endpoint.
async function kvPipeline(commands) {
  if (!kvConfigured()) return null;
  const url = `${process.env.KV_REST_API_URL}/pipeline`;
  const token = process.env.KV_REST_API_TOKEN;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commands),
  });
  return res.json();
}

async function kvGetJSON(key) {
  try {
    const result = await kvCommand(["GET", key]);
    if (!result?.result) return null;
    return JSON.parse(result.result);
  } catch {
    return null;
  }
}

async function kvSetJSON(key, value, exSeconds) {
  try {
    const cmd = ["SET", key, JSON.stringify(value)];
    if (exSeconds) cmd.push("EX", String(exSeconds));
    await kvCommand(cmd);
  } catch {
    // best-effort
  }
}

async function kvDel(key) {
  try {
    await kvCommand(["DEL", key]);
  } catch {
    // ignore
  }
}

module.exports = {
  kvConfigured,
  kvCommand,
  kvPipeline,
  kvGetJSON,
  kvSetJSON,
  kvDel,
};
