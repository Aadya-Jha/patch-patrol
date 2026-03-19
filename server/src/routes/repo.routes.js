import express from "express";
import { requireApiKey } from "../middlewares/auth.js";
import {
  createRepository,
  getRepositoryHandler,
  getRepositoryScanHandler,
  listRepositoriesHandler,
  listRepositoryScansHandler,
} from "../controllers/repo.controller.js";

const router = express.Router();

router.use(requireApiKey);
router.post("/", createRepository);
router.get("/", listRepositoriesHandler);
router.get("/:owner/:repo", getRepositoryHandler);
router.get("/:owner/:repo/scans", listRepositoryScansHandler);
router.get("/:owner/:repo/scans/:scanId", getRepositoryScanHandler);

export default router;
