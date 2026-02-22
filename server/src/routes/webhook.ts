import { Router } from 'express';
import { webhookController } from '../controllers/webhookController';

const router = Router();

/**
 * POST /api/webhooks/twilio
 * Receives incoming SMS / WhatsApp messages from Twilio.
 * Security is handled by Twilio signature validation inside the controller.
 */
router.post('/twilio', webhookController.handleTwilioWebhook);

export default router;
