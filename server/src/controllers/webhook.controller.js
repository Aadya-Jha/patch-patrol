import { runRepositoryScan } from "../services/scan.service.js";

const DEPENDENCY_MANIFESTS = new Set(["package.json", "requirements.txt", "pom.xml"]);

function extractChangedManifestPaths(payload) {
  const changedFiles = new Set();

  for (const commit of payload.commits || []) {
    for (const file of [...(commit.added || []), ...(commit.modified || []), ...(commit.removed || [])]) {
      const fileName = file.split("/").pop();
      if (DEPENDENCY_MANIFESTS.has(fileName)) {
        changedFiles.add(file);
      }
    }
  }

  return [...changedFiles];
}

export async function handleGitHubWebhook(req, res, next) {
  const eventName = req.headers["x-github-event"];

  if (eventName !== "push") {
    return res.status(202).json({ message: "Ignored unsupported GitHub event." });
  }

  const changedManifestPaths = extractChangedManifestPaths(req.body);
  if (!changedManifestPaths.length) {
    return res.status(202).json({ message: "Ignored push with no dependency manifest changes." });
  }

  try {
    const owner = req.body.repository?.owner?.login;
    const repo = req.body.repository?.name;
    const scan = await runRepositoryScan({ owner, repo, triggerSource: "webhook" });

    return res.status(202).json({
      message: "Webhook processed and scan completed.",
      changedManifestPaths,
      scan,
    });
  } catch (error) {
    if (error.statusCode === 404) {
      return res.status(202).json({
        message: "Repository is not registered. Webhook was accepted but no scan was started.",
        changedManifestPaths,
      });
    }

    return next(error);
  }
}
