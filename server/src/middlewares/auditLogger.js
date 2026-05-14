import { getPool } from "../db/db.js";

export async function auditLogger(req, res, next) {
  const getAccountId = () => {
    if (req.accountId) return req.accountId;
    if (req.user?.accountId) return req.user.accountId;
    return null;
  };

  const resourceMap = {
    "POST /api/repos": { type: "repository", action: "register" },
    "DELETE /api/repos": { type: "repository", action: "delete" },
    "POST /api/scans": { type: "scan", action: "trigger" },
    "POST /api/auth/github": { type: "oauth", action: "initiate" },
    "GET /api/auth/github/callback": { type: "oauth", action: "callback" },
    "POST /api/auth/logout": { type: "oauth", action: "logout" },
  };

  const routeKey = `${req.method} ${req.path}`;
  const resource = resourceMap[routeKey];

  if (resource && getAccountId()) {
    const client = getPool();
    try {
      await client.query(
        `INSERT INTO audit_logs (account_id, action, resource_type, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          getAccountId(),
          `${resource.type}_${resource.action}`,
          resource.type,
          req.ip || req.connection.remoteAddress,
          req.get("User-Agent") || "",
        ]
      );
    } catch (err) {
      console.error("Failed to log audit:", err.message);
    }
  }

  next();
}
