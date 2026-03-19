import { getPool } from "../db/db.js";
import { HttpError } from "../middlewares/errorHandler.js";
import { fetchRepository } from "./github.service.js";
import { decryptToken, encryptToken } from "./token.service.js";

export const GITHUB_NAME_REGEX = /^[A-Za-z0-9_.-]+$/;

function validateOwnerAndRepo(owner, repo) {
  if (!owner || !repo || !GITHUB_NAME_REGEX.test(owner) || !GITHUB_NAME_REGEX.test(repo)) {
    throw new HttpError(400, "Invalid owner or repository name");
  }
}

function mapRepositoryRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    owner: row.owner,
    name: row.name,
    defaultBranch: row.default_branch,
    installationId: row.installation_id,
    accountName: row.account_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    latestScanAt: row.latest_scan_at,
  };
}

export async function registerRepository({ owner, repo, githubToken }) {
  validateOwnerAndRepo(owner, repo);

  const metadata = await fetchRepository(owner, repo, githubToken);
  const encryptedToken = encryptToken(githubToken);
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const installationResult = await client.query(
      `
        INSERT INTO github_installations (
          github_account_id,
          account_name,
          encrypted_token,
          iv_hex,
          auth_tag_hex
        )
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (github_account_id)
        DO UPDATE SET
          account_name = EXCLUDED.account_name,
          encrypted_token = EXCLUDED.encrypted_token,
          iv_hex = EXCLUDED.iv_hex,
          auth_tag_hex = EXCLUDED.auth_tag_hex,
          installed_at = CURRENT_TIMESTAMP
        RETURNING id
      `,
      [
        metadata.githubAccountId,
        metadata.accountName,
        encryptedToken.encryptedToken,
        encryptedToken.ivHex,
        encryptedToken.authTagHex,
      ],
    );

    const repositoryResult = await client.query(
      `
        INSERT INTO repositories (installation_id, owner, name, default_branch)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (owner, name)
        DO UPDATE SET
          installation_id = EXCLUDED.installation_id,
          default_branch = EXCLUDED.default_branch,
          updated_at = CURRENT_TIMESTAMP,
          is_active = TRUE
        RETURNING id, owner, name, default_branch, installation_id, created_at, updated_at
      `,
      [installationResult.rows[0].id, metadata.owner, metadata.repo, metadata.defaultBranch],
    );

    await client.query("COMMIT");

    return {
      ...mapRepositoryRow(repositoryResult.rows[0]),
      accountName: metadata.accountName,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function listRepositories() {
  const result = await getPool().query(
    `
      SELECT
        r.id,
        r.owner,
        r.name,
        r.default_branch,
        r.installation_id,
        r.created_at,
        r.updated_at,
        gi.account_name,
        MAX(s.completed_at) AS latest_scan_at
      FROM repositories r
      LEFT JOIN github_installations gi ON gi.id = r.installation_id
      LEFT JOIN scans s ON s.repo_id = r.id
      WHERE r.is_active = TRUE
      GROUP BY r.id, gi.account_name
      ORDER BY r.owner, r.name
    `,
  );

  return result.rows.map(mapRepositoryRow);
}

export async function getRepositoryByName(owner, repo) {
  validateOwnerAndRepo(owner, repo);

  const result = await getPool().query(
    `
      SELECT
        r.*,
        gi.account_name,
        gi.encrypted_token,
        gi.iv_hex,
        gi.auth_tag_hex
      FROM repositories r
      LEFT JOIN github_installations gi ON gi.id = r.installation_id
      WHERE r.owner = $1 AND r.name = $2 AND r.is_active = TRUE
    `,
    [owner, repo],
  );

  if (!result.rows.length) {
    throw new HttpError(404, "Repository is not registered");
  }

  return result.rows[0];
}

export async function getRepositorySummary(owner, repo) {
  const result = await getPool().query(
    `
      SELECT
        r.id,
        r.owner,
        r.name,
        r.default_branch,
        r.installation_id,
        r.created_at,
        r.updated_at,
        gi.account_name,
        MAX(s.completed_at) AS latest_scan_at
      FROM repositories r
      LEFT JOIN github_installations gi ON gi.id = r.installation_id
      LEFT JOIN scans s ON s.repo_id = r.id
      WHERE r.owner = $1 AND r.name = $2 AND r.is_active = TRUE
      GROUP BY r.id, gi.account_name
    `,
    [owner, repo],
  );

  if (!result.rows.length) {
    throw new HttpError(404, "Repository is not registered");
  }

  return mapRepositoryRow(result.rows[0]);
}

export async function getRepositoryToken(owner, repo) {
  const repository = await getRepositoryByName(owner, repo);

  if (repository.installation_id) {
    return decryptToken(repository);
  }

  throw new HttpError(500, "No GitHub token is available for this repository");
}
