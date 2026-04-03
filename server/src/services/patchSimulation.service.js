import { analyzeTransitiveDependencies } from "./transitiveAnalyzer.service.js";
import { getPool } from "../db/db.js";

export async function runPatchSimulation({ owner, repo, packageName, targetVersion }) {
  const pool = getPool();

  const scanResult = await pool.query(
    `SELECT s.id FROM scans s
     JOIN repositories r ON r.id = s.repo_id
     WHERE r.owner = $1 AND r.name = $2
     AND s.status = 'completed'
     ORDER BY s.started_at DESC
     LIMIT 1`,
    [owner, repo]
  );

  if (!scanResult.rows.length) {
    throw new Error("No completed scan found for this repo");
  }

  const scanId = scanResult.rows[0].id;

  const vulnRows = await pool.query(
    `SELECT sv.risk_score, sv.risk_level, sv.ai_explanation,
            v.cve_id, v.severity, v.description,
            d.package_name, d.version, d.ecosystem
     FROM scan_vulnerabilities sv
     JOIN vulnerabilities v ON v.id = sv.vulnerability_id
     JOIN dependencies d ON d.id = sv.dependency_id
     WHERE sv.scan_id = $1`,
    [scanId]
  );

  const allVulns = vulnRows.rows.map((v) => ({
    ...v,
    dependencyKey: `${v.package_name}@${v.version}`,
  }));

  const before = analyzeTransitiveDependencies(
    allVulns.map((v) => ({ name: v.dependencyKey, dependencies: [] })),
    allVulns
  );

  const afterVulns = allVulns.filter(
    (v) => v.package_name !== packageName
  );

  const after = analyzeTransitiveDependencies(
    afterVulns.map((v) => ({ name: v.dependencyKey, dependencies: [] })),
    afterVulns
  );

  const fixed = before.filter(
    (v) => !after.find((a) => a.cve_id === v.cve_id)
  );

  return {
    packageName,
    targetVersion: targetVersion ?? "latest",
    before: {
      totalVulns: before.length,
      vulns: before,
    },
    after: {
      totalVulns: after.length,
      vulns: after,
    },
    fixed: {
      count: fixed.length,
      vulns: fixed,
    },
  };
}