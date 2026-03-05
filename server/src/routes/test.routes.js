import express from 'express';
import { getFile } from "../services/github.service.js";
import { parsePackageJSON } from "../services/parser.service.js";

const router = express.Router();

router.get("/test", async (req, res) => {
  try {
    const file = await getFile("facebook", "react", "package.json");

    const dependencies = parsePackageJSON(file);

    res.json(dependencies);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching file");
  }
});

export default router;