import dotenv from "dotenv";
dotenv.config({ path: "./.env" });
import fetch from "node-fetch";
global.fetch = fetch;
import app from "./app.js";
import { closePool, getPool } from "./db/db.js";

// Validate required environment variables at startup
function validateEnvironment() {
  const required = [
    "ENCRYPTION_KEY",
    "WEBHOOK_SECRET",
    "SESSION_SECRET",
    "GITHUB_OAUTH_CLIENT_ID",
    "GITHUB_OAUTH_CLIENT_SECRET",
  ];

  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  // In production, APP_API_TOKEN is required
  if (process.env.NODE_ENV === "production" && !process.env.APP_API_TOKEN) {
    throw new Error("APP_API_TOKEN is required in production environment");
  }

  // Validate ENCRYPTION_KEY format (must be 32 bytes base64 or 64 hex chars)
  const encKey = process.env.ENCRYPTION_KEY;
  if (!/^[0-9a-fA-F]{64}$/.test(encKey) && !(Buffer.from(encKey, "base64").length === 32)) {
    throw new Error("ENCRYPTION_KEY must be 32 bytes base64 or 64 hex characters");
  }
}

// Ensure database schema is up-to-date before starting server
async function ensureSchema() {
  const pool = getPool();
  const client = await pool.connect();
  try {
    // Check if account_id column exists in repositories table
    const res = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'repositories' AND column_name = 'account_id'
    `);
    if (res.rows.length === 0) {
      console.log('Adding missing column account_id to repositories...');
      await client.query(`
        ALTER TABLE repositories 
        ADD COLUMN account_id INTEGER REFERENCES github_accounts(id) ON DELETE CASCADE
      `);
      console.log('Column added successfully.');
    }
  } finally {
    client.release();
  }
}

const PORT = Number(process.env.PORT || 5000);

// Global error handlers for unhandled rejections and exceptions
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  // Don't exit immediately - give time for logs, but do exit after
  setTimeout(() => process.exit(1), 1000);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  setTimeout(() => process.exit(1), 1000);
});

// Initialize environment, then schema, then start server
try {
  validateEnvironment();
  ensureSchema().then(() => {
    const server = app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });

    async function shutdown(signal) {
      console.log(`${signal} received, shutting down`);
      server.close(async () => {
        await closePool();
        process.exit(0);
      });
    }

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  }).catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
  });
} catch (err) {
  console.error("Startup validation failed:", err.message);
  process.exit(1);
}
