// Simple shared-secret auth for the admin panel + its API endpoints.
// Not a full login system — just enough to keep the panel private.
// Set ADMIN_PANEL_TOKEN in Vercel env vars to a long random string
// (e.g. `openssl rand -hex 24`) and never share the resulting URL.

function checkAdminToken(req) {
  const expected = process.env.ADMIN_PANEL_TOKEN;
  if (!expected) return false; // fail closed if not configured
  const provided =
    req.query?.token ||
    req.headers["x-admin-token"] ||
    (req.body && req.body.token);
  return Boolean(provided) && provided === expected;
}

module.exports = { checkAdminToken };
