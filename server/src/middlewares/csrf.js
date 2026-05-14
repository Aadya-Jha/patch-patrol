import crypto from "crypto";
import { HttpError } from "./errorHandler.js";

// Generate a CSRF token and set it as a non-httpOnly cookie
export function csrfTokenMiddleware(req, res, next) {
  // Only set token on safe methods (GET, HEAD, OPTIONS) and if not already set
  if (["GET", "HEAD", "OPTIONS"].includes(req.method) && !req.cookies?.csrfToken) {
    const token = crypto.randomBytes(32).toString("hex");
    res.cookie("csrfToken", token, {
      httpOnly: false,
      secure: true,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: "/",
    });
  }
  next();
}

// Verify CSRF token on state-changing methods
export function csrfVerifyMiddleware(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  const tokenFromHeader = req.headers["x-csrf-token"];
  const tokenFromCookie = req.cookies?.csrfToken;

  if (!tokenFromHeader || !tokenFromCookie) {
    return next(new HttpError(403, "CSRF token missing"));
  }

  if (!crypto.timingSafeEqual(
    Buffer.from(tokenFromHeader, "hex"),
    Buffer.from(tokenFromCookie, "hex")
  )) {
    return next(new HttpError(403, "Invalid CSRF token"));
  }

  next();
}