import express from "express";
import { handleGitHubWebhook } from "../controllers/webhook.controller.js";
import { verifyGithubWebhook } from "../middlewares/webhookVerify.js";

const router = express.Router();

router.post("/", express.raw({ type: "application/json", limit: "1mb" }), verifyGithubWebhook, handleGitHubWebhook);

export default router;
