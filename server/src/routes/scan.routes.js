import express from "express";
import { triggerScan } from "../controllers/scan.controller.js";
import { requireApiKey } from "../middlewares/auth.js";

const router = express.Router();

router.use(requireApiKey);
router.post("/", triggerScan);

export default router;
