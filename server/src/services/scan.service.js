import { getPool } from "../db/db.js";
import { HttpError } from "../middlewares/errorHandler.js";
import { fetchDependencyFiles } from "./github.service.js";
import { parsePackageJSON, parsePomXml, parseRequirementsTxt } from "./parser.service.js";
import { getRepositoryByName, getRepositorySummary, getRepositoryToken } from "./repository.service.js";
import { queryVulnerabilitiesForDependencies } from "./vulnerabilityService.js";

const PARSERS = {
  "package.json": parsePackageJSON,
  "requirements.txt": parseRequirementsTxt,
  "pom.xml": parsePomXml,
};

function buildDependencyKey(dependency) {
  return [
    dependency.manifestPath,
    dependency.ecosystem,
    dependency.name,
    dependency.version || "",
    dependency.dependencyType || "direct",
  ].join("|");
}

function parseFiles(files) {
  const deduped = new Map();

  for (const file of files) {
    const parser = PARSERS[file.path];
    if (!parser) {
      continue;
    }

    for (const dependency of parser(file.content)) {
      const record = {
        name: dependency.name,
        version: dependency.version,
        normalizedVersion: dependency.normalizedVersion,
        dependencyType: dependency.dependencyType || "direct",
        ecosystem: file.ecosystem,
        manifestPath: file.path,
      };
      record.key = buildDependencyKey(record);
      deduped.set(record.key, record);
    }
  }

  return [...deduped.values()];
}

function summarizeVulnerabilities(matches) {
  const summary = { critical: 0, high: 0, medium: 0, low: 0, unknown: 0 };

  for (const match of matches) {
    for (const vulnerability of match.vulnerabilities) {
      summary[vulnerability.severity] = (summary[vulnerability.severity] || 0) + 1;
    }
  }

  return summary;
}

export async function runRepositoryScan({ owner, repo, triggerSource = "manual" }) {
  const repository = await getRepositoryByName(owner, repo);
  const githubToken = await getRepositoryToken(owner, repo);
  const files = await fetchDependencyFiles(owner, repo, githubToken);

  if (!files.length) {
    throw new HttpError(404, "No supported dependency manifests were found");
  }

  const dependencies = parseFiles(files);
  if (!dependencies.length) {
    throw new HttpError(422, "Dependency manifests were found, but no dependencies could be parsed");
  }

  const dependenciesByEcosystem = dependencies.reduce((grouped, dependency) => {
    grouped[dependency.ecosystem] = grouped[dependency.ecosystem] || [];
    grouped[dependency.ecosystem].push(dependency);
    return grouped;
  }, {});

  let vulnerabilityMatches = [];

  for (const [ecosystem, ecosystemDependencies] of Object.entries(dependenciesByEcosystem)) {
    const matches = await queryVulnerabilitiesForDependencies(ecosystemDependencies, ecosystem);
    vulnerabilityMatches = vulnerabilityMatches.concat(matches);
  }

  const pool = getPool();
  const client = await pool.connect();
  let scanId;

  try {
    await client.query("BEGIN");

    const scanResult = await client.query(
      `
        INSERT INTO scans (repo_id, trigger_source, status)
        VALUES ($1, $2, 'processing')
        RETURNING id, started_at
      `,
      [repository.id, triggerSource],
    );

    scanId = scanResult.rows[0].id;
    const dependencyIds = new Map();

    for (const dependency of dependencies) {
      const insertedDependency = await client.query(
        `
          INSERT INTO dependencies (
            scan_id,
            package_name,
            version,
            normalized_version,
            ecosystem,
            manifest_path,
            dependency_type
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id
        `,
        [
          scanId,
          dependency.name,
          dependency.version,
          dependency.normalizedVersion,
          dependency.ecosystem,
          dependency.manifestPath,
          dependency.dependencyType,
        ],
      );

      dependencyIds.set(dependency.key, insertedDependency.rows[0].id);
    }

    for (const match of vulnerabilityMatches) {
      const dependencyId = dependencyIds.get(match.dependencyKey);
      if (!dependencyId) {
        continue;
      }

      for (const vulnerability of match.vulnerabilities) {
        const vulnerabilityResult = await client.query(
          `
            INSERT INTO vulnerabilities (
              cve_id,
              source,
              severity,
              description,
              reference_url,
              published_at
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (cve_id)
            DO UPDATE SET
              source = EXCLUDED.source,
              severity = EXCLUDED.severity,
              description = EXCLUDED.description,
              reference_url = EXCLUDED.reference_url,
              published_at = COALESCE(EXCLUDED.published_at, vulnerabilities.published_at)
            RETURNING id
          `,
          [
            vulnerability.advisoryId,
            vulnerability.source,
            vulnerability.severity,
            vulnerability.details,
            vulnerability.referenceUrl,
            vulnerability.publishedAt,
          ],
        );

        await client.query(
          `
            INSERT INTO scan_vulnerabilities (
              scan_id,
              dependency_id,
              vulnerability_id,
              risk_level,
              risk_score,
              suggested_fix
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (scan_id, dependency_id, vulnerability_id)
            DO NOTHING
          `,
          [
            scanId,
            dependencyId,
            vulnerabilityResult.rows[0].id,
            vulnerability.severity,
            vulnerability.riskScore,
            vulnerability.suggestedFix,
          ],
        );
      }
    }

    await client.query(
      `
        UPDATE scans
        SET status = 'completed', completed_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `,
      [scanId],
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  return getScanDetailById(owner, repo, scanId);
}

export async function listRepositoryScans(owner, repo) {
  const repository = await getRepositorySummary(owner, repo);

  const result = await getPool().query(
    `
      SELECT
        s.id,
        s.trigger_source,
        s.status,
        s.error_message,
        s.started_at,
        s.completed_at,
        COUNT(DISTINCT d.id) AS dependency_count,
        COUNT(DISTINCT sv.id) AS vulnerability_count
      FROM scans s
      LEFT JOIN dependencies d ON d.scan_id = s.id
      LEFT JOIN scan_vulnerabilities sv ON sv.scan_id = s.id
      WHERE s.repo_id = $1
      GROUP BY s.id
      ORDER BY s.started_at DESC
    `,
    [repository.id],
  );

  return result.rows;
}

export async function getScanDetailById(owner, repo, scanId) {
  const repository = await getRepositoryByName(owner, repo);
  const scanResult = await getPool().query(
    `
      SELECT id, trigger_source, status, error_message, started_at, completed_at
      FROM scans
      WHERE id = $1 AND repo_id = $2
    `,
    [scanId, repository.id],
  );

  if (!scanResult.rows.length) {
    throw new HttpError(404, "Scan not found");
  }

  const dependencyResult = await getPool().query(
    `
      SELECT
        d.id,
        d.package_name,
        d.version,
        d.normalized_version,
        d.ecosystem,
        d.manifest_path,
        d.dependency_type
      FROM dependencies d
      WHERE d.scan_id = $1
      ORDER BY d.ecosystem, d.package_name
    `,
    [scanId],
  );

  const vulnerabilityResult = await getPool().query(
    `
      SELECT
        sv.dependency_id,
        sv.risk_level,
        sv.risk_score,
        sv.suggested_fix,
        v.cve_id,
        v.source,
        v.severity,
        v.description,
        v.reference_url,
        v.published_at
      FROM scan_vulnerabilities sv
      INNER JOIN vulnerabilities v ON v.id = sv.vulnerability_id
      WHERE sv.scan_id = $1
      ORDER BY sv.risk_score DESC NULLS LAST, v.cve_id
    `,
    [scanId],
  );

  const vulnerabilitiesByDependencyId = vulnerabilityResult.rows.reduce((grouped, row) => {
    grouped[row.dependency_id] = grouped[row.dependency_id] || [];
    grouped[row.dependency_id].push({
      advisoryId: row.cve_id,
      source: row.source,
      severity: row.severity,
      riskLevel: row.risk_level,
      riskScore: Number(row.risk_score),
      description: row.description,
      referenceUrl: row.reference_url,
      suggestedFix: row.suggested_fix,
      publishedAt: row.published_at,
    });
    return grouped;
  }, {});

  const dependencies = dependencyResult.rows.map((dependency) => ({
    id: dependency.id,
    name: dependency.package_name,
    version: dependency.version,
    normalizedVersion: dependency.normalized_version,
    ecosystem: dependency.ecosystem,
    manifestPath: dependency.manifest_path,
    dependencyType: dependency.dependency_type,
    vulnerabilities: vulnerabilitiesByDependencyId[dependency.id] || [],
  }));

  return {
    repository: {
      id: repository.id,
      owner: repository.owner,
      name: repository.name,
      defaultBranch: repository.default_branch,
    },
    scan: scanResult.rows[0],
    summary: {
      dependencyCount: dependencies.length,
      vulnerabilityCount: vulnerabilityResult.rows.length,
      severities: summarizeVulnerabilities(
        Object.values(vulnerabilitiesByDependencyId).map((vulnerabilities) => ({
          vulnerabilities,
        })),
      ),
    },
    dependencies,
  };
}
