import { HttpError } from "./errorHandler.js";
import { isValidGithubWebhookSignature } from "../security/verifyWebhook.js";

export function verifyGithubWebhook(req, res, next) {
  const secret = process.env.WEBHOOK_SECRET;
  const signature = req.headers["x-hub-signature-256"];
  const event = req.headers["x-github-event"];
  const deliveryId = req.headers["x-github-delivery"];

  if (!secret) {
    return next(new HttpError(500, "WEBHOOK_SECRET is not configured"));
  }

  if (!signature) {
    return next(new HttpError(401, "Missing GitHub webhook signature"));
  }

  if (!event) {
    return next(new HttpError(400, "Missing X-GitHub-Event header"));
  }

  if (!deliveryId) {
    return next(new HttpError(400, "Missing X-GitHub-Delivery header"));
  }

  if (!Buffer.isBuffer(req.body)) {
    return next(new HttpError(400, "Webhook payload must be provided as raw JSON"));
  }

  // Enforce max payload size (1 MB)
  if (req.body.length > 1024 * 1024) {
    return next(new HttpError(413, "Payload too large"));
  }

  if (!isValidGithubWebhookSignature(secret, req.body, signature)) {
    return next(new HttpError(401, "Invalid GitHub webhook signature"));
  }

  try {
    const payload = JSON.parse(req.body.toString("utf8"));
    req.body = payload;
    req.githubEvent = event;
    req.githubDeliveryId = deliveryId;
  } catch {
    return next(new HttpError(400, "Webhook payload is not valid JSON"));
  }

  next();
}
