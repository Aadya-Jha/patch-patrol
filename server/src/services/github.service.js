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
