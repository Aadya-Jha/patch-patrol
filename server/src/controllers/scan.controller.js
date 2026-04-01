import { generateAiExplanationsForScan, runRepositoryScan } from "../services/scan.service.js";

function parseForceFlag(value) {
  if (value === undefined) {
    return false;
  }

  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

export async function triggerScan(req, res, next) {
  try {
    console.log("triggerScan called", req.body)
    const { owner, repo } = req.body;
    const scan = await runRepositoryScan({ owner, repo, triggerSource: "manual" });
    res.status(201).json(scan);
  } catch (error) {
    console.error("triggerScan error:", error)
    next(error);
  }
}

export async function regenerateAiExplanations(req, res, next) {
  try {
    const { owner, repo, force } = req.body;
    const scan = await generateAiExplanationsForScan({
      owner,
      repo,
      scanId: Number(req.params.scanId),
      force: parseForceFlag(force),
    });
    res.status(200).json(scan);
  } catch (error) {
    next(error);
  }
}
