import { Router } from "express";
import {
  initGitHubAuth,
  handleGitHubCallback,
  logoutHandler,
  getCurrentUser,
} from "../controllers/auth.controller.js";

const router = Router();

router.get("/github", initGitHubAuth);
router.get("/github/callback", handleGitHubCallback);
router.post("/logout", logoutHandler);
router.get("/me", getCurrentUser);

export default router;
