import axios from "axios";
import { HttpError } from "../middlewares/errorHandler.js";

const GITHUB_API_BASE = "https://api.github.com";
const GITHUB_RETRY_AFTER_MS = 1000; // Base retry time

export const githubClient = axios.create({
  baseURL: GITHUB_API_BASE,
  timeout: 15000,
  headers: {
    Accept: "application/vnd.github+json",
    "User-Agent": "patch-patrol",
  },
});

function encodeGitHubPath(path) {
  return path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function buildHeaders(token) {
  if (!token) {
    throw new HttpError(500, "GitHub token is not configured");
  }
  return {
    Authorization: `Bearer ${token}`,
  };
}

function mapGitHubError(error, fallbackMessage) {
  if (error.response?.status === 404) {
    return null;
  }

  if (error.response?.status === 401 || error.response?.status === 403) {
    throw new HttpError(502, "GitHub access was denied. Check repository access and token scopes.");
  }

  if (error.response?.status === 429) {
    const retryAfter = error.response.headers?.["retry-after"] || 60;
    const message = `GitHub API rate limit exceeded. Retry after ${retryAfter} seconds.`;
    throw new HttpError(429, message, { retryAfter });
  }

  throw new HttpError(502, fallbackMessage || "GitHub API request failed");
}

export async function fetchWithRetry(config, retries = 3) {
  let lastError;

  for (let i = 0; i < retries; i++) {
    try {
      const response = await githubClient(config);

      if (response.headers["x-ratelimit-remaining"] && Number(response.headers["x-ratelimit-remaining"]) < 10) {
        const resetTime = Number(response.headers["x-ratelimit-reset"]);
        const waitTime = Math.max(0, resetTime * 1000 - Date.now() + 5000);
        if (waitTime > 0) {
          await new Promise((resolve) => setTimeout(resolve, Math.min(waitTime, 60000)));
        }
      }

      return response;
    } catch (error) {
      lastError = error;

      if (error.response?.status === 429 || error.response?.status >= 500) {
        const backoffMs = GITHUB_RETRY_AFTER_MS * Math.pow(2, i) * (0.5 + Math.random());
        await new Promise((resolve) => setTimeout(resolve, Math.min(backoffMs, 30000)));
        continue;
      }

      break;
    }
  }

  throw lastError;
}

export async function fetchRepository(owner, repo, token) {
  try {
    const response = await fetchWithRetry({
      method: "GET",
      url: `/repos/${owner}/${repo}`,
      headers: buildHeaders(token),
    });

    const data = response.data;

    return {
      owner: data.owner?.login,
      repo: data.name,
      defaultBranch: data.default_branch,
      githubAccountId: String(data.owner?.id),
      accountName: data.owner?.login,
      private: Boolean(data.private),
    };
  } catch (error) {
    const notFound = mapGitHubError(error, "Failed to fetch repository metadata from GitHub.");
    if (notFound === null) {
      throw new HttpError(404, "Repository was not found on GitHub.");
    }
    throw error;
  }
}

export async function getFile(owner, repo, path, token) {
  try {
    const response = await fetchWithRetry({
      method: "GET",
      url: `/repos/${owner}/${repo}/contents/${encodeGitHubPath(path)}`,
      headers: buildHeaders(token),
    });

    if (response.data.type !== "file") {
      return null;
    }

    return Buffer.from(response.data.content, "base64").toString("utf8");
  } catch (error) {
    const notFound = mapGitHubError(error, `Failed to fetch ${path} from GitHub.`);
    if (notFound === null) {
      return null;
    }
    throw error;
  }
}

export async function fetchDependencyFiles(owner, repo, token) {
  const manifests = [
    { path: "package.json", ecosystem: "npm" },
    { path: "package-lock.json", ecosystem: "npm" },
    { path: "yarn.lock", ecosystem: "npm" },
    { path: "requirements.txt", ecosystem: "pypi" },
    { path: "Pipfile.lock", ecosystem: "pypi" },
    { path: "poetry.lock", ecosystem: "pypi" },
    { path: "pom.xml", ecosystem: "maven" },
  ];

  const files = [];

  for (const manifest of manifests) {
    const content = await getFile(owner, repo, manifest.path, token);
    if (content) {
      files.push({ ...manifest, content });
    }
  }

  return files;
}

export async function securityIssueExists(owner, repo, token, dependencyKey) {
  try {
    const response = await fetchWithRetry({
      method: "GET",
      url: `/repos/${owner}/${repo}/issues`,
      headers: buildHeaders(token),
      params: {
        state: "open",
        labels: "security",
      },
    });

    const issues = response.data;

    return issues.some((issue) => issue.title.includes(dependencyKey));
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) {
      return false;
    }
    throw error;
  }
}

export async function createSecurityIssue(owner, repo, token, vulnerability) {
  const exists = await securityIssueExists(owner, repo, token, vulnerability.dependencyKey);

  if (exists) {
    console.log("Security issue already exists for:", vulnerability.dependencyKey);
    return;
  }

  const vulnerabilityList = vulnerability.vulnerabilities
    .map((v) => {
      const cveLink = `https://nvd.nist.gov/vuln/detail/${v.advisoryId}`;
      const fix = v.suggestedFix
        ? `Suggested Fix: ${v.suggestedFix}`
        : "Suggested Fix: Upgrade to the latest secure version";

      return `• ${v.advisoryId}
Severity: ${v.severity}
Description: ${v.details}
CVE Link: ${cveLink}
${fix}`;
    })
    .join("\n\n");

  const issueTitle = `Critical Vulnerability: ${vulnerability.dependencyKey}`;

  const issueBody = `
🚨 Critical Dependency Vulnerability Detected

Repository: ${owner}/${repo}

Affected Dependency: ${vulnerability.dependencyKey}

Risk Score: ${vulnerability.highestRisk}

-------------------------------------

Vulnerabilities Found:

${vulnerabilityList}

-------------------------------------

Recommended Action:
Upgrade the dependency to the latest secure version.

Generated automatically by Patch Patrol.
`;

  try {
    await fetchWithRetry({
      method: "POST",
      url: `/repos/${owner}/${repo}/issues`,
      headers: buildHeaders(token),
      data: {
        title: issueTitle,
        body: issueBody.trim(),
        labels: ["security", "vulnerability"],
      },
    });

    console.log("Security issue created for:", vulnerability.dependencyKey);
  } catch (error) {
    console.error("Failed to create GitHub security issue:", error.message);
  }
}
