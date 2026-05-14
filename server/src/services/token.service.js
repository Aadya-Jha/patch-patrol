import crypto from "crypto";
import { HttpError } from "../middlewares/errorHandler.js";

function getEncryptionKey() {
  const rawKey = process.env.ENCRYPTION_KEY;
  if (!rawKey) {
    throw new HttpError(500, "ENCRYPTION_KEY is not configured");
  }

  if (/^[0-9a-fA-F]{64}$/.test(rawKey)) {
    return Buffer.from(rawKey, "hex");
  }

  try {
    const base64Key = Buffer.from(rawKey, "base64");
    if (base64Key.length === 32) {
      return base64Key;
    }
  } catch {
    // Ignore invalid base64
  }

  return crypto.createHash("sha256").update(rawKey).digest();
}

export function encryptToken(token) {
  if (!token || typeof token !== "string") {
    throw new HttpError(400, "GitHub token is required");
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    encryptedToken: encrypted.toString("base64"),
    ivHex: iv.toString("hex"),
    authTagHex: authTag.toString("hex"),
  };
}

export function decryptToken(record) {
  if (!record?.access_token_encrypted || !record?.iv_hex || !record?.auth_tag_hex) {
    throw new HttpError(500, "Stored GitHub token is incomplete");
  }

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(record.iv_hex, "hex")
  );
  decipher.setAuthTag(Buffer.from(record.auth_tag_hex, "hex"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(record.access_token_encrypted, "base64")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

export function rotateEncryptionKey(_oldKeyHex, _newKeyBase64) {
  // Placeholder for future key rotation implementation
  throw new HttpError(501, "Encryption key rotation not implemented");
}
