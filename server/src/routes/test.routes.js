import express from 'express';
import { getFile } from "../services/github.service.js";

const router = express.Router();

router.get('/test', async (req,res) => {
    try{
        const file = await getFile("facebook", "react", "package.json");
        res.send(file);
    } catch(err){
        console.error(err); 
        res.status(500).send("Error fetching file from GitHub");
    }
});

export default router;