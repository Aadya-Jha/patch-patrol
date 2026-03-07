import express from 'express';
import crypto from 'crypto';

const router = express.Router();

router.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
    const signature = req.headers['x-hub-signature-256'];
    const secret = process.env.WEBHOOK_SECRET;

    if (!secret) {
        console.warn("WEBHOOK_SECRET not defined, skipping validation");
    } else if (signature) {
        const hmac = crypto.createHmac('sha256', secret);
        const digest = 'sha256=' + hmac.update(req.body).digest('hex');

        const sigBuffer = Buffer.from(signature);
        const digestBuffer = Buffer.from(digest);

        if (sigBuffer.length === digestBuffer.length && crypto.timingSafeEqual(sigBuffer, digestBuffer)) {
            console.log("webhook signature matched");
        } else {
            return res.status(401).send('Signature mismatch');
        }
    }

    // Try parsing the body for processing after signature check
    let payload;
    try {
        payload = JSON.parse(req.body.toString());
        console.log("webhook received for action:", payload.action);
    } catch (e) {
        // Fallback or ignore if JSON can't be parsed
    }

    res.sendStatus(200);
});

export default router;