import express from 'express';

const router = express.Router();

router.post('/webhook', (req, res) => {
    console.log("webhook received");
    console.log(req.body);
    res.sendStatus(200);
});

export default router;