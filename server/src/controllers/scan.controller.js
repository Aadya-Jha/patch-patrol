import { runRepositoryScan } from "../services/scan.service.js";

export async function triggerScan(req, res, next) {
  try {
    const { owner, repo } = req.body;
    const scan = await runRepositoryScan({ owner, repo, triggerSource: "manual" });
    res.status(201).json(scan);
  } catch (error) {
    next(error);
  }
}
