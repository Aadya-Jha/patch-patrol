import express from "express";
import { getFile } from "../services/github.service.js";
import { parsePackageJSON } from "../services/parser.service.js";
import { getPool } from "../db/db.js"; 

const router = express.Router();

router.post("/scan", async (req, res) => {
  const { owner, repo } = req.body;

  if (!owner || !repo) {
    return res.status(400).json({ error: "owner and repo required" });
  }

  try {
    const pool = getPool(); 

    const file = await getFile(owner, repo, "package.json");
    const dependencies = parsePackageJSON(file);

    const repoResult = await pool.query(
      "INSERT INTO repositories(owner, name) VALUES($1, $2) RETURNING id",
      [owner, repo]
    );
    const repoId = repoResult.rows[0].id;

    const scanResult = await pool.query(
      "INSERT INTO scans(repo_id) VALUES($1) RETURNING id",
      [repoId]
    );
    const scanId = scanResult.rows[0].id;

    for (const dep of dependencies) {
      await pool.query(
        "INSERT INTO dependencies(scan_id, package_name, version, ecosystem) VALUES($1, $2, $3, $4)",
        [scanId, dep.name, dep.version, "npm"]
      );
    }

    res.json(dependencies);

  } catch (err) {
    console.error(err);
    res.status(500).send("Scan failed");
  }
});

export default router;