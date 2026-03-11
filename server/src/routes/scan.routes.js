import express from "express";
import { getFile } from "../services/github.service.js";
import { parsePackageJSON, parseRequirementsTxt, parsePomXml } from "../services/parser.service.js";
import { getPool } from "../db/db.js";
import { scanDependencies } from "../scanners/dependencyScanner.js";
import { all } from "axios";

const router = express.Router();

router.post("/scan", async (req, res) => {
  const { owner, repo } = req.body;

  const validNameRegex = /^[a-zA-Z0-9_.-]+$/;
  if (!owner || !repo || !validNameRegex.test(owner) || !validNameRegex.test(repo)) {
    return res.status(400).json({ error: "Invalid owner or repo format" });
  }

  const pool = getPool();
  let client;

  try {
    const allDependencies = [];

    const pkgFile = await getFile(owner, repo, "package.json");
    if (pkgFile) {
      allDependencies.push(...parsePackageJSON(pkgFile).map(d => ({ ...d, ecosystem: "npm" })));
    }

    const reqFile = await getFile(owner, repo, "requirements.txt");
    if (reqFile) {
      allDependencies.push(...parseRequirementsTxt(reqFile).map(d => ({ ...d, ecosystem: "pypi" })));
    }

    const pomFile = await getFile(owner, repo, "pom.xml");
    if (pomFile) {
      allDependencies.push(...parsePomXml(pomFile).map(d => ({ ...d, ecosystem: "maven" })));
    }

    if (allDependencies.length === 0) {
      return res.status(404).json({ error: "No valid dependencies found" });
    }

    client = await pool.connect();
    await client.query("BEGIN");

    const repoResult = await client.query(
      "INSERT INTO repositories(owner, name) VALUES($1, $2) RETURNING id",
      [owner, repo]
    );
    const repoId = repoResult.rows[0].id;

    const scanResult = await client.query(
      "INSERT INTO scans(repo_id) VALUES($1) RETURNING id",
      [repoId]
    );
    const scanId = scanResult.rows[0].id;

    if (allDependencies.length > 0) {
      const values = [];
      const queryParts = [];
      allDependencies.forEach((dep, i) => {
        const offset = i * 4;
        queryParts.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`);
        values.push(scanId, dep.name, dep.version, dep.ecosystem);
      });

      await client.query(
        `INSERT INTO dependencies(scan_id, package_name, version, ecosystem) VALUES ${queryParts.join(', ')}`,
        values
      );
    }

    await client.query("COMMIT");

    const byEcosystem = {};
    allDependencies.forEach(dep => {
      if (!byEcosystem[dep.ecosystem])byEcosystem[dep.ecosystem] = [];
      byEcosystem[dep.ecosystem].push(dep);
    });

    let allVulnerabilities = [];
    for (const [ecosystem, deps] of Object.entries(byEcosystem)) {
      const results  = await scanDependencies(deps, ecosystem);
      allVulnerabilities = allVulnerabilities.concat(results);
    };

    for (const item of allVulnerabilities) {
      const depRow = await pool.query(
        `SELECT id FROM dependencies WHERE scan_id=$1 AND package_name=$2 AND version=$3`,
        [scanId, item.dependency, item.version]
    );
    if (!depRow.rows.length) continue;
    const depId = depRow.rows[0].id;

    for (const vuln of item.vulnerabilities) {
      await pool.query(
        `INSERT INTO vulnerabilities(package_name, cve_id, severity, description)
        VALUES($1, $2, $3, $4)
        ON CONFLICT (cve_id) DO NOTHING`,
        [item.dependency, vuln.id, item.risk, vuln.summary]
      );

      const vulnRow = await pool.query(
        `SELECT id FROM vulnerabilities WHERE cve_id=$1`,
        [vuln.id]
      );
      const vulnId = vulnRow.rows[0].id;

      await pool.query(
        `INSERT INTO dependency_vulnerabilities(dependency_id, vulnerability_id)
        VALUES($1, $2)`,
        [depId, vulnId]
      );
    }
  }
    res.json(allDependencies);
  } catch (err) {
    if (client) await client.query("ROLLBACK");
    console.log(err);
    res.status(500).json({ error: "Scan processing failed" });
  } finally {
    if (client) client.release();
  }
});

export default router;