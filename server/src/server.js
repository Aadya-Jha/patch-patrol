import dotenv from "dotenv";
import app from "./app.js";
import { closePool } from "./db/db.js";

dotenv.config();
const PORT = Number(process.env.PORT || 5000);

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
