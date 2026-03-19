import {
  getRepositorySummary,
  listRepositories,
  registerRepository,
} from "../services/repository.service.js";
import { getScanDetailById, listRepositoryScans } from "../services/scan.service.js";

export async function createRepository(req, res, next) {
  try {
    const repository = await registerRepository(req.body);
    res.status(201).json(repository);
  } catch (error) {
    next(error);
  }
}

export async function listRepositoriesHandler(req, res, next) {
  try {
    const repositories = await listRepositories();
    res.json(repositories);
  } catch (error) {
    next(error);
  }
}

export async function getRepositoryHandler(req, res, next) {
  try {
    const repository = await getRepositorySummary(req.params.owner, req.params.repo);
    res.json(repository);
  } catch (error) {
    next(error);
  }
}

export async function listRepositoryScansHandler(req, res, next) {
  try {
    const scans = await listRepositoryScans(req.params.owner, req.params.repo);
    res.json(scans);
  } catch (error) {
    next(error);
  }
}

export async function getRepositoryScanHandler(req, res, next) {
  try {
    const scan = await getScanDetailById(req.params.owner, req.params.repo, Number(req.params.scanId));
    res.json(scan);
  } catch (error) {
    next(error);
  }
}
