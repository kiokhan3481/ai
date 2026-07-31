const { checkAdminToken } = require("../../lib/adminAuth");
const { listUsers } = require("../../lib/users");
const { kvConfigured } = require("../../lib/kv");

module.exports = async (req, res) => {
  if (!checkAdminToken(req)) {
    return res.status(401).json({ error: "unauthorized" });
  }
  if (!kvConfigured()) {
    return res.status(200).json({ users: [], kvConfigured: false });
  }
  const users = await listUsers();
  return res.status(200).json({ users, kvConfigured: true });
};
