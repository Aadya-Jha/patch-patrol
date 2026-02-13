import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req,res) => {
    res.send("server running");
});

app.get("/test", async (req, res) => {
  const file = await getFile("facebook", "react", "package.json");
  res.send(file);
});

app.listen(5000, () => {
    console.log("Server is running on port 5000");
});
