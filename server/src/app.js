import cors from "cors";
import express from "express";
import repoRoutes from "./routes/repo.routes.js";
import scanRoutes from "./routes/scan.routes.js";
import webhookRoutes from "./routes/webhook.routes.js";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.js";

const app = express();

app.use(cors());

app.get("/", (req, res) => {
  res.json({ status: "ok", service: "patch-patrol" });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/webhooks/github", webhookRoutes);
app.use(express.json({ limit: "1mb" }));
app.use("/api/repos", repoRoutes);
app.use("/api/scans", scanRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
