import express from "express";
import { regenerateAiExplanations, triggerScan } from "../controllers/scan.controller.js";
import { requireApiKey } from "../middlewares/auth.js";
import { simulatePatch } from "../controllers/scan.controller.js";

const router = express.Router();
router.post("/simulate-patch", simulatePatch);
router.post("/", triggerScan);
router.use(requireApiKey);
router.post("/:scanId/explanations", regenerateAiExplanations);

export default router;
