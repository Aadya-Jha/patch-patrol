import crypto from "crypto";
import { HttpError } from "./errorHandler.js";

export function requireApiKey(req, res, next) {
  const configuredToken = process.env.APP_API_TOKEN;

  if (!configuredToken) {
    if (process.env.NODE_ENV === "production") {
      return next(new HttpError(500, "APP_API_TOKEN is required in production"));
    }
    return next();
  }

  const bearer = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.slice(7)
    : null;
  const apiKey = req.headers["x-api-key"] || bearer;

  if (!apiKey) {
    return next(new HttpError(401, "API token required"));
  }

  if (!crypto.timingSafeEqual(
    Buffer.from(apiKey),
    Buffer.from(configuredToken)
  )) {
    return next(new HttpError(401, "Unauthorized"));
  }

  next();
}
