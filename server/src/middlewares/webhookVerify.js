import { HttpError } from "./errorHandler.js";
import { isValidGithubWebhookSignature } from "../security/verifyWebhook.js";

export function verifyGithubWebhook(req, res, next) {
  const secret = process.env.WEBHOOK_SECRET;
  const signature = req.headers["x-hub-signature-256"];

  if (!secret) {
    return next(new HttpError(500, "WEBHOOK_SECRET is not configured"));
  }

  if (!signature) {
    return next(new HttpError(401, "Missing GitHub webhook signature"));
  }

  if (!Buffer.isBuffer(req.body)) {
    return next(new HttpError(400, "Webhook payload must be provided as raw JSON"));
  }

  if (!isValidGithubWebhookSignature(secret, req.body, signature)) {
    return next(new HttpError(401, "Invalid GitHub webhook signature"));
  }

  try {
    req.body = JSON.parse(req.body.toString("utf8"));
  } catch {
    return next(new HttpError(400, "Webhook payload is not valid JSON"));
  }

  return next();
}
