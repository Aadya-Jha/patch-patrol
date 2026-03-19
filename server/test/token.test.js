import test from "node:test";
import assert from "node:assert/strict";
import { decryptToken, encryptToken } from "../src/services/token.service.js";

test("encryptToken and decryptToken round-trip the GitHub token", () => {
  process.env.ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

  const token = "github_pat_example";
  const encrypted = encryptToken(token);
  const decrypted = decryptToken({
    encrypted_token: encrypted.encryptedToken,
    iv_hex: encrypted.ivHex,
    auth_tag_hex: encrypted.authTagHex,
  });

  assert.equal(decrypted, token);
});
