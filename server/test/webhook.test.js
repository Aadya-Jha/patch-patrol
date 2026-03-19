import test from "node:test";
import assert from "node:assert/strict";
import {
  computeGithubWebhookSignature,
  isValidGithubWebhookSignature,
} from "../src/security/verifyWebhook.js";

test("GitHub webhook signatures are verified with timing-safe comparison", () => {
  const secret = "super-secret";
  const payload = Buffer.from(JSON.stringify({ hello: "world" }));
  const signature = computeGithubWebhookSignature(secret, payload);

  assert.equal(isValidGithubWebhookSignature(secret, payload, signature), true);
  assert.equal(isValidGithubWebhookSignature(secret, payload, "sha256=invalid"), false);
});
