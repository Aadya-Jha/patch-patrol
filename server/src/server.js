import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";
import { getPool } from "./db/db.js";

const PORT = 5000;

app.get("/db-test", async (req, res) => {
  try {
    const result = await getPool().query("SELECT NOW()");  // pool created HERE, env is ready
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  }
});
console.log("DB_USER:", process.env.DB_USER);
console.log("DB_PASSWORD:", process.env.DB_PASSWORD);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});