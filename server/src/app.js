import cors from "cors";
import express from "express";
import cookieParser from "cookie-parser";
import repoRoutes from "./routes/repo.routes.js";
import scanRoutes from "./routes/scan.routes.js";
import webhookRoutes from "./routes/webhook.routes.js";
import authRoutes from "./routes/auth.routes.js";
import userReposRoutes from "./routes/userRepos.routes.js";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.js";
import { securityHeadersMiddleware } from "./middlewares/securityHeaders.js";
import { rateLimit } from "./middlewares/rateLimit.js";
import { auditLogger } from "./middlewares/auditLogger.js";
import { requestIdMiddleware } from "./middlewares/requestId.js";
import { csrfTokenMiddleware, csrfVerifyMiddleware } from "./middlewares/csrf.js";
import { getPool } from "./db/db.js";

const app = express();

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-api-key", "X-CSRF-Token", "X-Request-ID"],
  credentials: true,
  maxAge: 86400, // Cache preflight for 24h
};

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));
app.use(requestIdMiddleware);
app.use(securityHeadersMiddleware);

// Set CSRF token cookie on safe requests
app.use(csrfTokenMiddleware);

// Apply CSRF verification only in production (same-origin via nginx)
// In development, we skip CSRF because frontend and backend are on different ports
if (process.env.NODE_ENV === "production") {
  const csrfSkipPaths = ["/api/webhooks/github", "/api/auth/github/callback"];
  app.use((req, res, next) => {
    if (csrfSkipPaths.includes(req.path) || ["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      return next();
    }
    return csrfVerifyMiddleware(req, res, next);
  });
}

app.use("/api/auth", rateLimit({ windowMs: 60 * 1000, max: 10 }), authRoutes);
app.use("/api/scans", rateLimit({ windowMs: 60 * 1000, max: 20 }), scanRoutes);
app.use("/api/repos", rateLimit({ windowMs: 60 * 1000, max: 30 }), repoRoutes);
app.use("/api/my-repos", rateLimit({ windowMs: 60 * 1000, max: 30 }), userReposRoutes);
app.use("/api/webhooks/github", webhookRoutes);

app.get("/", (req, res) => {
  res.json({ status: "ok", service: "patch-patrol" });
});

app.get("/health", async (req, res) => {
  try {
    // Lightweight DB connectivity check
    await getPool().query("SELECT 1");
    res.json({ status: "ok", timestamp: new Date().toISOString(), database: "connected" });
  } catch (_err) {
    res.status(503).json({ status: "degraded", timestamp: new Date().toISOString(), database: "disconnected" });
  }
});

app.use(auditLogger);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
