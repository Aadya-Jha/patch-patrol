import { getPool } from "../db/db.js";
import { HttpError } from "../middlewares/errorHandler.js";
import { getActiveAccountToken } from "./oauth.service.js";

export async function getUserGitHubRepositories(accountId, options = {}) {
  const token = await getActiveAccountToken(accountId);
  const { perPage = 100, page = 1 } = options;

  const response = await fetch(`https://api.github.com/user/repos?per_page=${perPage}&page=${page}&affiliation=owner,collaborator`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "patch-patrol",
    },
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new HttpError(403, "GitHub token invalid or insufficient permissions");
    }
    throw new HttpError(502, `GitHub API error: ${response.status}`);
  }

  const repos = await response.json();

  // Transform to our format, filtering out forks and archived repos if needed
  return repos
    .filter((repo) => !repo.fork) // Optional: exclude forks
    .map((repo) => ({
      id: repo.id,
      owner: repo.owner.login,
      name: repo.name,
      fullName: repo.full_name,
      private: repo.private,
      defaultBranch: repo.default_branch,
      visibility: repo.visibility,
      language: repo.language,
      updatedAt: repo.updated_at,
      pushedAt: repo.pushed_at,
      description: repo.description,
      stargazersCount: repo.stargazers_count,
      isRegistered: false, // Will be filled by caller if needed
    }));
}

export async function getRegisteredRepositories(accountId) {
  const pool = getPool();
  const result = await pool.query(
    `SELECT r.owner, r.name FROM repositories r WHERE r.account_id = $1 AND r.is_active = TRUE`,
    [accountId]
  );

  const registered = new Set(result.rows.map((r) => `${r.owner}/${r.name}`));
  return registered;
}
