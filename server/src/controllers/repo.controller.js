import {
  getRepositorySummary,
  listRepositories,
  registerRepository,
} from "../services/repository.service.js";
import { getScanDetailById, listRepositoryScans } from "../services/scan.service.js";

export async function createRepository(req, res, next) {
  try {
    const { owner, repo } = req.body;
    const accountId = req.accountId;

    if (!accountId) {
      return next(new Error("Authentication required"));
    }

    const repository = await registerRepository({ owner, repo, accountId });
    res.status(201).json(repository);
  } catch (error) {
    next(error);
  }
}

export async function listRepositoriesHandler(req, res, next) {
  try {
    const accountId = req.accountId; // Will be null for unauthenticated (optionalAuth)
    const repositories = await listRepositories(accountId || undefined);
    res.json(repositories);
  } catch (error) {
    next(error);
  }
}

export async function getRepositoryHandler(req, res, next) {
  try {
    const { owner, repo } = req.params;
    const accountId = req.accountId;
    const repository = await getRepositorySummary(owner, repo, accountId || undefined);
    res.json(repository);
  } catch (error) {
    next(error);
  }
}

export async function listRepositoryScansHandler(req, res, next) {
  try {
    const { owner, repo } = req.params;
    const accountId = req.accountId;
    const scans = await listRepositoryScans(owner, repo, accountId || undefined);
    res.json(scans);
  } catch (error) {
    next(error);
  }
}

export async function getRepositoryScanHandler(req, res, next) {
  try {
    const { owner, repo, scanId } = req.params;
    const accountId = req.accountId;
    const scan = await getScanDetailById(owner, repo, Number(scanId), accountId || undefined);
    res.json(scan);
  } catch (error) {
    next(error);
  }
}
