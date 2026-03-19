import crypto from "crypto";

export function computeGithubWebhookSignature(secret, payloadBuffer) {
  return `sha256=${crypto.createHmac("sha256", secret).update(payloadBuffer).digest("hex")}`;
}

export function isValidGithubWebhookSignature(secret, payloadBuffer, signature) {
  const expectedSignature = computeGithubWebhookSignature(secret, payloadBuffer);
  const provided = Buffer.from(signature, "utf8");
  const expected = Buffer.from(expectedSignature, "utf8");

  return provided.length === expected.length && crypto.timingSafeEqual(provided, expected);
}
