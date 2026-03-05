import express from "express";
import cors from "cors";
import testRoutes from "./routes/test.routes.js";
import webhookRoutes from "./routes/webhook.routes.js";
import scanRoutes from "./routes/scan.routes.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(testRoutes);
app.use(webhookRoutes);
app.use(scanRoutes);

app.get('/', (req,res) => {
    res.send("server is running");
});

export default app;