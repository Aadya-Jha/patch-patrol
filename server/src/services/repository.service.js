import { getPool } from "../db/db.js";
import { HttpError } from "../middlewares/errorHandler.js";
import { fetchRepository } from "./github.service.js";
import { getActiveAccountToken } from "./oauth.service.js";

export const GITHUB_NAME_REGEX = /^[A-Za-z0-9_.-]+$/;

function validateOwnerAndRepo(owner, repo) {
  if (!owner || !repo || !GITHUB_NAME_REGEX.test(owner) || !GITHUB_NAME_REGEX.test(repo)) {
    throw new HttpError(400, "Invalid owner or repository name");
  }
}

export function mapRepositoryRow(row) {
  if (!row) return null;

  return {
    id: row.id,
    owner: row.owner,
    name: row.name,
    defaultBranch: row.default_branch,
    accountId: row.account_id,
    accountName: row.account_name || row.username,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    latestScanAt: row.latest_scan_at,
  };
}

export async function registerRepository({ owner, repo, accountId }) {
  validateOwnerAndRepo(owner, repo);

  const token = await getActiveAccountToken(accountId);
  const metadata = await fetchRepository(owner, repo, token);

  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const repositoryResult = await client.query(
      `
      INSERT INTO repositories (account_id, owner, name, default_branch, installation_id)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (owner, name) DO UPDATE SET
        account_id = EXCLUDED.account_id,
        default_branch = EXCLUDED.default_branch,
        installation_id = EXCLUDED.installation_id,
        updated_at = CURRENT_TIMESTAMP,
        is_active = TRUE
      RETURNING id, owner, name, default_branch, account_id, created_at, updated_at
    `,
      [accountId, metadata.owner, metadata.repo, metadata.defaultBranch, null]
    );

    await client.query(
      `INSERT INTO audit_logs (account_id, action, resource_type, resource_id, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        accountId,
        "repository_register",
        "repository",
        repositoryResult.rows[0].id,
        JSON.stringify({ owner, repo }),
      ]
    );

    await client.query("COMMIT");

    return mapRepositoryRow(repositoryResult.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function listRepositories(accountId = null) {
  const pool = getPool();
  let query;
  let params;

  if (accountId) {
    query = `
      SELECT
        r.id,
        r.owner,
        r.name,
        r.default_branch,
        r.account_id,
        r.created_at,
        r.updated_at,
        ga.username as account_name,
        MAX(s.completed_at) AS latest_scan_at
      FROM repositories r
      LEFT JOIN github_accounts ga ON ga.id = r.account_id
      LEFT JOIN scans s ON s.repo_id = r.id
      WHERE r.account_id = $1 AND r.is_active = TRUE
      GROUP BY r.id, ga.username
      ORDER BY r.owner, r.name
    `;
    params = [accountId];
  } else {
    query = `
      SELECT
        r.id,
        r.owner,
        r.name,
        r.default_branch,
        r.account_id,
        r.created_at,
        r.updated_at,
        ga.username as account_name,
        MAX(s.completed_at) AS latest_scan_at
      FROM repositories r
      LEFT JOIN github_accounts ga ON ga.id = r.account_id
      LEFT JOIN scans s ON s.repo_id = r.id
      WHERE r.is_active = TRUE
      GROUP BY r.id, ga.username
      ORDER BY r.owner, r.name
    `;
    params = [];
  }

  const result = await pool.query(query, params);
  return result.rows.map(mapRepositoryRow);
}

export async function getRepositoryByName(owner, repo, accountId = null) {
  validateOwnerAndRepo(owner, repo);

  const pool = getPool();
  let query;
  let params;

  if (accountId) {
    query = `
      SELECT r.*, ga.username as account_name
      FROM repositories r
      LEFT JOIN github_accounts ga ON ga.id = r.account_id
      WHERE r.owner = $1 AND r.name = $2 AND r.account_id = $3 AND r.is_active = TRUE
    `;
    params = [owner, repo, accountId];
  } else {
    query = `
      SELECT r.*, ga.username as account_name
      FROM repositories r
      LEFT JOIN github_accounts ga ON ga.id = r.account_id
      WHERE r.owner = $1 AND r.name = $2 AND r.is_active = TRUE
    `;
    params = [owner, repo];
  }

  const result = await pool.query(query, params);

  if (!result.rows.length) {
    throw new HttpError(404, "Repository is not registered");
  }

  return result.rows[0];
}

export async function getRepositorySummary(owner, repo, accountId = null) {
  const pool = getPool();
  let query;
  let params;

  if (accountId) {
    query = `
      SELECT
        r.id,
        r.owner,
        r.name,
        r.default_branch,
        r.account_id,
        r.created_at,
        r.updated_at,
        ga.username as account_name,
        MAX(s.completed_at) AS latest_scan_at
      FROM repositories r
      LEFT JOIN github_accounts ga ON ga.id = r.account_id
      LEFT JOIN scans s ON s.repo_id = r.id
      WHERE r.owner = $1 AND r.name = $2 AND r.account_id = $3 AND r.is_active = TRUE
      GROUP BY r.id, ga.username
    `;
    params = [owner, repo, accountId];
  } else {
    query = `
      SELECT
        r.id,
        r.owner,
        r.name,
        r.default_branch,
        r.account_id,
        r.created_at,
        r.updated_at,
        ga.username as account_name,
        MAX(s.completed_at) AS latest_scan_at
      FROM repositories r
      LEFT JOIN github_accounts ga ON ga.id = r.account_id
      LEFT JOIN scans s ON s.repo_id = r.id
      WHERE r.owner = $1 AND r.name = $2 AND r.is_active = TRUE
      GROUP BY r.id, ga.username
    `;
    params = [owner, repo];
  }

  const result = await pool.query(query, params);

  if (!result.rows.length) {
    throw new HttpError(404, "Repository is not registered");
  }

  return mapRepositoryRow(result.rows[0]);
}

export async function getRepositoryToken(owner, repo) {
  const repository = await getRepositoryByName(owner, repo);

  if (!repository.account_id) {
    throw new HttpError(500, "No GitHub token is available for this repository");
  }

  return await getActiveAccountToken(repository.account_id);
}
