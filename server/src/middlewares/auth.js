import { HttpError } from "./errorHandler.js";

export function requireApiKey(req, res, next) {
  const configuredToken = process.env.APP_API_TOKEN;

  if (!configuredToken) {
    return next();
  }

  const bearer = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.slice(7)
    : null;
  const apiKey = req.headers["x-api-key"] || bearer;

  if (apiKey !== configuredToken) {
    return next(new HttpError(401, "Unauthorized"));
  }

  return next();
}
