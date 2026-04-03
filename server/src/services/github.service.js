import axios from "axios";
import { HttpError } from "../middlewares/errorHandler.js";

const githubClient = axios.create({
  baseURL: "https://api.github.com",
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

  throw new HttpError(502, fallbackMessage);
}

export async function fetchRepository(owner, repo, token) {
  try {
    const response = await githubClient.get(`/repos/${owner}/${repo}`, {
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
    const response = await githubClient.get(
      `/repos/${owner}/${repo}/contents/${encodeGitHubPath(path)}`,
      {
        headers: buildHeaders(token),
      },
    );

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
    { path: "requirements.txt", ecosystem: "pypi" },
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
  const response = await githubClient.get(
    `/repos/${owner}/${repo}/issues`,
    {
      headers: buildHeaders(token),
      params: {
        state: "open",
        labels: "security"
      }
    }
  );

  const issues = response.data;

  return issues.some(issue =>
    issue.title.includes(dependencyKey)
  );
}

export async function createSecurityIssue(owner, repo, token, vulnerability) {

  const exists = await securityIssueExists(owner, repo, token, vulnerability.dependencyKey);

  if (exists) {
    console.log("Security issue already exists for:", vulnerability.dependencyKey);
    return;
  }

  const vulnerabilityList = vulnerability.vulnerabilities
    .map(v => {
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
    await githubClient.post(
      `/repos/${owner}/${repo}/issues`,
      {
        title: issueTitle,
        body: issueBody,
        labels: ["security", "vulnerability"]
      },
      {
        headers: buildHeaders(token)
      }
    );

    console.log("Security issue created for:", vulnerability.dependencyKey);

  } catch (error) {
    console.error("Failed to create GitHub security issue:", error.message);
  }
}
