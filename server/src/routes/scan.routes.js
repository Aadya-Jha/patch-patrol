import express from "express";
import { getFile } from "../services/github.service.js";
import { parsePackageJSON, parseRequirementsTxt, parsePomXml } from "../services/parser.service.js";
import { getPool } from "../db/db.js";

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
    res.json(allDependencies);
  } catch (err) {
    if (client) await client.query("ROLLBACK");
    res.status(500).json({ error: "Scan processing failed" });
  } finally {
    if (client) client.release();
  }
});

export default router;