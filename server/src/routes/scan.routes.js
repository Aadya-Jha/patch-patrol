import express from "express";
import { regenerateAiExplanations, triggerScan } from "../controllers/scan.controller.js";
import { requireApiKey } from "../middlewares/auth.js";

const router = express.Router();

router.use(requireApiKey);
router.post("/", triggerScan);
router.post("/:scanId/explanations", regenerateAiExplanations);

export default router;
