import { getFile } from "./services/github.service.js";

app.get("/test", async (req, res) => {
  const file = await getFile("facebook", "react", "package.json");
  res.send(file);
});