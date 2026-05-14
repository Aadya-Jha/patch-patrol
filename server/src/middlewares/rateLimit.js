import { HttpError } from "./errorHandler.js";

const rateLimits = new Map();

// Periodic cleanup of old rate limit entries (every minute)
setInterval(() => {
  const now = Date.now();
  for (const [key, window] of rateLimits.entries()) {
    if (now - window.start > 2 * 60 * 1000) {
      rateLimits.delete(key);
    }
  }
}, 60 * 1000);

export function rateLimit(options = {}) {
  const {
    windowMs = 60 * 1000,
    max = 100,
    keyGenerator = (req) => req.ip || "anonymous",
    skip = () => false,
    onLimitReached = (req) => {
      console.warn(`Rate limit exceeded for ${keyGenerator(req)}`);
    },
  } = options;

  return (req, res, next) => {
    if (skip(req)) {
      return next();
    }

    const key = keyGenerator(req);
    const now = Date.now();
    const windowStart = now - windowMs;

    let window = rateLimits.get(key);
    if (!window || window.start < windowStart) {
      window = {
        start: now,
        count: 0,
      };
      rateLimits.set(key, window);
    }

    window.count++;

    const remaining = Math.max(0, max - window.count);
    res.setHeader("X-RateLimit-Limit", max.toString());
    res.setHeader("X-RateLimit-Remaining", remaining.toString());
    res.setHeader("X-RateLimit-Reset", new Date(window.start + windowMs).toISOString());

    if (window.count > max) {
      onLimitReached(req);
      return next(
        new HttpError(429, "Too many requests. Please try again later.")
      );
    }

    next();
  };
}
