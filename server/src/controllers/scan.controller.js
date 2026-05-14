import { generateAiExplanationsForScan, runRepositoryScan } from "../services/scan.service.js";
import { runPatchSimulation } from "../services/patchSimulation.service.js";
import { HttpError } from "../middlewares/errorHandler.js";
import { getRepositorySummary } from "../services/repository.service.js";

function parseForceFlag(value) {
  if (value === undefined) {
    return false;
  }
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

export async function triggerScan(req, res, next) {
  try {
    const { owner, repo } = req.body;
    const accountId = req.accountId;

    const scan = await runRepositoryScan({
      owner,
      repo,
      triggerSource: "manual",
      accountId: accountId || undefined,
    });
    res.status(201).json(scan);
  } catch (error) {
    console.error("triggerScan error:", error);
    next(error);
  }
}

export async function regenerateAiExplanations(req, res, next) {
  try {
    const { owner, repo } = req.body;
    const { scanId } = req.params;
    const accountId = req.accountId;

    const scan = await generateAiExplanationsForScan({
      owner,
      repo,
      scanId: Number(scanId),
      force: parseForceFlag(req.body.force),
      accountId: accountId || undefined,
    });

    res.status(200).json(scan);
   } catch (error) {
     next(error);
   }
}

export async function simulatePatch(req, res, next) {
  try {
    const { owner, repo, packageName, targetVersion } = req.body;
    if (!owner || !repo || !packageName) {
      return res.status(400).json({ error: "owner, repo and packageName are required" });
    }

    // Authorize: ensure user has access to this repository if authenticated
    if (req.accountId) {
      try {
        await getRepositorySummary(owner, repo, req.accountId);
      } catch (err) {
        if (err instanceof HttpError && err.status === 404) {
          return res.status(403).json({ error: "You do not have access to this repository" });
        }
        throw err;
      }
    }

    const result = await runPatchSimulation({ owner, repo, packageName, targetVersion });
    res.json(result);
  } catch (err) {
    next(err);
  }
}
