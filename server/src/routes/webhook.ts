// src/routes/webhook.ts
import { Router } from 'express';
import { handleTwilioWebhook } from '../controllers/webhookController';

const router = Router();

// POST /api/webhooks/twilio — no JWT; authenticated by Twilio signature
router.post('/twilio', handleTwilioWebhook);

export default router;
