import {
  initiateOAuth,
  verifySessionToken,
  logAudit,
  exchangeCodeForToken,
  fetchGitHubUserInfo,
  generateSessionToken,
} from "../services/oauth.service.js";
import { encryptToken, decryptToken } from "../services/token.service.js";
import { getPool } from "../db/db.js";
import { HttpError } from "../middlewares/errorHandler.js";

export async function initGitHubAuth(req, res) {
  try {
    const result = await initiateOAuth(req);

    if (req.query.redirect === "false") {
      return res.status(200).json(result);
    }

    return res.redirect(302, result.authorizationUrl);
  } catch (error) {
    const status = error.statusCode || error.status || 500;
    return res.status(status).json({ error: error.message });
  }
}

export async function handleGitHubCallback(req, res, next) {
  try {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    if (req.query.error) {
      return res.redirect(`${frontendUrl}/?error=auth_denied`);
    }

    const { code, state } = req.query;
    if (!code || !state) {
      return res.redirect(`${frontendUrl}/?error=missing_params`);
    }

    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Atomically claim the OAuth state using SKIP LOCKED to prevent race conditions
      const updateResult = await client.query(
        `UPDATE oauth_sessions
         SET used_at = NOW()
         WHERE id = (
           SELECT id FROM oauth_sessions
           WHERE state = $1 AND expires_at > NOW() AND used_at IS NULL
           FOR UPDATE SKIP LOCKED
           LIMIT 1
         )
         RETURNING *`,
        [state]
      );

      if (!updateResult.rows.length) {
        throw new HttpError(400, "Invalid or expired OAuth state");
      }
      const sessionRecord = updateResult.rows[0];

      const plainVerifier = decryptToken({
        access_token_encrypted: sessionRecord.code_verifier_encrypted,
        iv_hex: sessionRecord.code_verifier_iv,
        auth_tag_hex: sessionRecord.code_verifier_tag,
      });

      const tokenResponse = await exchangeCodeForToken(code, state, sessionRecord.redirect_uri, plainVerifier);
      const userInfo = await fetchGitHubUserInfo(tokenResponse.access_token);

      let accountResult = await client.query(
        `SELECT id FROM github_accounts WHERE github_user_id = $1`,
        [String(userInfo.id)]
      );

      let accountId;
      if (!accountResult.rows.length) {
        const insertResult = await client.query(
          `INSERT INTO github_accounts (github_user_id, username, email, avatar_url)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (github_user_id) DO UPDATE SET
             username = EXCLUDED.username,
             email = EXCLUDED.email,
             avatar_url = EXCLUDED.avatar_url,
             updated_at = CURRENT_TIMESTAMP
           RETURNING id`,
          [String(userInfo.id), userInfo.login, userInfo.email, userInfo.avatar_url]
        );
        accountId = insertResult.rows[0].id;
      } else {
        accountId = accountResult.rows[0].id;
      }

      const encryptedToken = encryptToken(tokenResponse.access_token);
      await client.query(
        `INSERT INTO github_tokens (
          account_id, token_type, access_token_encrypted, iv_hex, auth_tag_hex,
          scope, expires_at, token_metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (account_id, token_type) DO UPDATE SET
          access_token_encrypted = EXCLUDED.access_token_encrypted,
          iv_hex = EXCLUDED.iv_hex,
          auth_tag_hex = EXCLUDED.auth_tag_hex,
          scope = EXCLUDED.scope,
          expires_at = EXCLUDED.expires_at,
          token_metadata = EXCLUDED.token_metadata,
          last_used_at = CURRENT_TIMESTAMP,
          revoked_at = NULL,
          is_active = TRUE`,
        [
          accountId,
          "oauth",
          encryptedToken.encryptedToken,
          encryptedToken.ivHex,
          encryptedToken.authTagHex,
          tokenResponse.scope,
          tokenResponse.expires_at ? new Date(tokenResponse.expires_at) : null,
          JSON.stringify({
            refresh_token: tokenResponse.refresh_token || null,
            refresh_expires_at: tokenResponse.refresh_expires_at || null,
            token_type: tokenResponse.token_type,
          }),
        ]
      );

      await logAudit(client, {
        accountId,
        action: "oauth_login",
        resourceType: "account",
        resourceId: accountId,
        ipAddress: sessionRecord.ip_address,
        userAgent: sessionRecord.user_agent,
        metadata: { scope: tokenResponse.scope },
      });

      await client.query("COMMIT");

      const sessionToken = generateSessionToken(accountId, userInfo.login);
      res
        .cookie("session", sessionToken, {
          httpOnly: true,
          secure: true, // Always true since we are on Vercel/HTTPS
          sameSite: "none", // Required for cross-site cookies between different Vercel domains
          maxAge: 24 * 60 * 60 * 1000,
          path: "/",
        })
        .redirect(process.env.FRONTEND_URL || "http://localhost:5173");
    } catch (dbError) {
      await client.query("ROLLBACK");
      throw dbError;
    } finally {
      client.release();
    }
  } catch (error) {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    if (error instanceof HttpError && error.status === 400) {
      return res.redirect(`${frontendUrl}/?error=${encodeURIComponent(error.message)}`);
    }
    next(error);
  }
}

export async function logoutHandler(req, res) {
  const sessionToken = req.cookies?.session;
  if (sessionToken) {
    const decoded = verifySessionToken(sessionToken);
    if (decoded) {
      const pool = getPool();
      await pool.query(
        `UPDATE github_tokens SET revoked_at = NOW(), is_active = FALSE WHERE account_id = $1 AND token_type = 'oauth'`,
        [decoded.accountId]
      );
    }
  }

  res
    .clearCookie("session", {
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "none",
    })
    .status(200)
    .json({ success: true, message: "Logged out successfully" });
}

export async function getCurrentUser(req, res) {
  const sessionToken = req.cookies?.session;
  if (!sessionToken) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const decoded = verifySessionToken(sessionToken);
  if (!decoded) {
    return res.status(401).json({ error: "Invalid session" });
  }

  const pool = getPool();
  const result = await pool.query(
    `SELECT github_user_id as userId, username, email, avatar_url as avatarUrl FROM github_accounts WHERE id = $1`,
    [decoded.accountId]
  );

  if (!result.rows.length) {
    return res.status(404).json({ error: "User not found" });
  }

  res.json({ user: result.rows[0] });
}
