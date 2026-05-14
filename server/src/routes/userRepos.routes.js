import express from "express";
import { getUserReposHandler } from "../controllers/userRepository.controller.js";
import { requireAuth } from "../middlewares/session.js";

const router = express.Router();

router.get("/", requireAuth, getUserReposHandler);

export default router;
