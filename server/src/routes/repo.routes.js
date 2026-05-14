import express from "express";
import {
  createRepository,
  getRepositoryHandler,
  getRepositoryScanHandler,
  listRepositoriesHandler,
  listRepositoryScansHandler,
} from "../controllers/repo.controller.js";
import { requireAuth } from "../middlewares/session.js";
import { validate } from "../middlewares/validation.js";
import { ownerRepoSchema } from "../middlewares/validation.js";

const router = express.Router();

router.use(requireAuth);
router.post("/", validate(ownerRepoSchema), createRepository);
router.get("/", listRepositoriesHandler);
router.get("/:owner/:repo", getRepositoryHandler);
router.get("/:owner/:repo/scans", listRepositoryScansHandler);
router.get("/:owner/:repo/scans/:scanId", getRepositoryScanHandler);

export default router;
