import crypto from "crypto";
import { getPool } from "../db/db.js";
import { HttpError } from "../middlewares/errorHandler.js";
import { encryptToken, decryptToken } from "./token.service.js";

const GITHUB_OAUTH_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const GITHUB_OAUTH_TOKEN_URL = "https://github.com/login/oauth/access_token";

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new HttpError(500, "SESSION_SECRET is not configured");
  }
  return secret;
}

export function generatePKCEPair() {
  const verifier = base64UrlEncode(crypto.randomBytes(32));
  const challenge = base64UrlEncode(
    crypto.createHash("sha256").update(verifier).digest()
  );
  return { verifier, challenge };
}

export function base64UrlEncode(buffer) {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function initiateOAuth(req) {
  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
  if (!clientId) {
    throw new HttpError(500, "GitHub OAuth is not configured");
  }

  const { verifier, challenge } = generatePKCEPair();
  const state = base64UrlEncode(crypto.randomBytes(24));

  const redirectUri = process.env.OAUTH_CALLBACK_URL || `${req.protocol}://${req.get('host')}/api/auth/github/callback`;

  const encryptedVerifier = encryptToken(verifier);

  const oauthRecord = {
    state,
    pkce_verifier_hash: crypto.createHash("sha256").update(verifier).digest("hex"),
    code_verifier_encrypted: encryptedVerifier.encryptedToken,
    code_verifier_iv: encryptedVerifier.ivHex,
    code_verifier_tag: encryptedVerifier.authTagHex,
    redirect_uri: redirectUri,
    ip_address: req.ip || req.connection.remoteAddress,
    user_agent: req.get("User-Agent") || "",
    expires_at: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
  };

  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query(
      `INSERT INTO oauth_sessions (
        state, pkce_verifier_hash, code_verifier_encrypted, code_verifier_iv, code_verifier_tag,
        redirect_uri, ip_address, user_agent, expires_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (state) DO UPDATE SET
        pkce_verifier_hash = EXCLUDED.pkce_verifier_hash,
        code_verifier_encrypted = EXCLUDED.code_verifier_encrypted,
        code_verifier_iv = EXCLUDED.code_verifier_iv,
        code_verifier_tag = EXCLUDED.code_verifier_tag,
        redirect_uri = EXCLUDED.redirect_uri,
        ip_address = EXCLUDED.ip_address,
        user_agent = EXCLUDED.user_agent,
        expires_at = EXCLUDED.expires_at,
        created_at = CURRENT_TIMESTAMP`,
      [
        oauthRecord.state,
        oauthRecord.pkce_verifier_hash,
        oauthRecord.code_verifier_encrypted,
        oauthRecord.code_verifier_iv,
        oauthRecord.code_verifier_tag,
        oauthRecord.redirect_uri,
        oauthRecord.ip_address,
        oauthRecord.user_agent,
        oauthRecord.expires_at,
      ]
    );
  } finally {
    client.release();
  }

  const authorizeUrl = new URL(GITHUB_OAUTH_AUTHORIZE_URL);
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("scope", "repo read:user user:email admin:repo_hook");
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("allow_signup", "true");
  authorizeUrl.searchParams.set("code_challenge", challenge);
  authorizeUrl.searchParams.set("code_challenge_method", "S256");

  return {
    authorizationUrl: authorizeUrl.toString(),
    expiresAt: oauthRecord.expires_at,
    state,
  };
}

export async function exchangeCodeForToken(code, state, redirectUri, codeVerifier) {
  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new HttpError(500, "GitHub OAuth is not configured");
  }

  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("client_secret", clientSecret);
  params.append("code", code);
  params.append("redirect_uri", redirectUri);
  params.append("state", state);
  params.append("code_verifier", codeVerifier);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(GITHUB_OAUTH_TOKEN_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
      body: params,
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new HttpError(502, `GitHub OAuth failed: ${errorData.error_description || response.statusText}`);
    }

    const data = await response.json();

    if (!data.access_token) {
      throw new HttpError(502, "GitHub OAuth did not return an access token");
    }

    return {
      access_token: data.access_token,
      token_type: data.token_type || "bearer",
      scope: data.scope || "",
      expires_at: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null,
      refresh_token: data.refresh_token || null,
      refresh_expires_at: data.refresh_token_expires_in ? new Date(Date.now() + data.refresh_token_expires_in * 1000) : null,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchGitHubUserInfo(accessToken) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "patch-patrol",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new HttpError(502, "Failed to fetch GitHub user information");
    }

    return response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

export function generateSessionToken(accountId, username) {
  const payload = JSON.stringify({ accountId, username, issuedAt: Date.now() });
  const secret = getSessionSecret();
  const signature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  return Buffer.from(JSON.stringify({ payload, signature })).toString("base64url");
}

export function verifySessionToken(token) {
  try {
    const decoded = JSON.parse(Buffer.from(token, "base64url").toString("utf8"));
    const { payload, signature } = decoded;
    const secret = getSessionSecret();
    const expected = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      return null;
    }

    const { accountId, username } = JSON.parse(payload);
    return { accountId, username };
  } catch {
    return null;
  }
}

export async function logAudit(clientOrPool, { accountId, action, resourceType, resourceId, ipAddress, userAgent, metadata }) {
  const executor = clientOrPool || getPool();
  try {
    await executor.query(
      `INSERT INTO audit_logs (account_id, action, resource_type, resource_id, ip_address, user_agent, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [accountId, action, resourceType, resourceId, ipAddress, userAgent, JSON.stringify(metadata || {})]
    );
  } catch (err) {
    console.error("Audit log failed:", err.message);
  }
}

export async function getActiveAccountToken(accountId) {
  const pool = getPool();
  const result = await pool.query(
    `SELECT * FROM github_tokens
     WHERE account_id = $1 AND token_type = 'oauth' AND is_active = TRUE
     ORDER BY last_used_at DESC NULLS LAST, created_at DESC
     LIMIT 1`,
    [accountId]
  );

  if (!result.rows.length) {
    throw new HttpError(401, "No GitHub token found for user. Please reconnect your GitHub account.");
  }

  const tokenRecord = result.rows[0];

  if (tokenRecord.expires_at && tokenRecord.expires_at < new Date()) {
    throw new HttpError(401, "GitHub token has expired. Please reconnect your GitHub account.");
  }

  return decryptToken({
    access_token_encrypted: tokenRecord.access_token_encrypted,
    iv_hex: tokenRecord.iv_hex,
    auth_tag_hex: tokenRecord.auth_tag_hex,
  });
}