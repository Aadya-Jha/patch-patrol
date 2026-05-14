import { randomUUID } from "crypto";

export function requestIdMiddleware(req, res, next) {
  const requestId = randomUUID();
  req.id = requestId;
  res.setHeader("X-Request-Id", requestId);
  next();
}