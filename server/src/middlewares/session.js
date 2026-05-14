import { verifySessionToken } from "../services/oauth.service.js";
import { HttpError } from "./errorHandler.js";

export function requireAuth(req, res, next) {
  const sessionToken = req.cookies?.session;

  if (!sessionToken) {
    return next(new HttpError(401, "Authentication required"));
  }

  const decoded = verifySessionToken(sessionToken);
  if (!decoded) {
    return next(new HttpError(401, "Invalid or expired session"));
  }

  req.accountId = decoded.accountId;
  req.user = {
    accountId: decoded.accountId,
    username: decoded.username,
  };

  next();
}

export function optionalAuth(req, res, next) {
  const sessionToken = req.cookies?.session;

  if (sessionToken) {
    const decoded = verifySessionToken(sessionToken);
    if (decoded) {
      req.accountId = decoded.accountId;
      req.user = {
        accountId: decoded.accountId,
        username: decoded.username,
      };
    }
  }

  next();
}
