import express from "express";
import {
  regenerateAiExplanations,
  triggerScan,
  simulatePatch,
} from "../controllers/scan.controller.js";
import { requireAuth } from "../middlewares/session.js";
import { validate } from "../middlewares/validation.js";
import { ownerRepoScanSchema, simulatePatchSchema, regenerateExplanationsSchema } from "../middlewares/validation.js";

const router = express.Router();

// Protected routes - require authentication
router.post("/simulate-patch", requireAuth, validate(simulatePatchSchema), simulatePatch);
router.post("/", requireAuth, validate(ownerRepoScanSchema), triggerScan);
router.post("/:scanId/explanations", requireAuth, validate(regenerateExplanationsSchema), regenerateAiExplanations);

export default router;
