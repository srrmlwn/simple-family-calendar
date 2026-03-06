// src/services/twilioService.ts
import twilio from 'twilio';
import { Request } from 'express';
import config from '../config';

/**
 * Validate that an incoming request genuinely came from Twilio.
 * Skipped in development when TWILIO_AUTH_TOKEN is not set.
 */
export function validateSignature(req: Request): boolean {
    const { authToken, webhookUrl } = config.twilio;
    if (!authToken) {
        // Dev mode — skip signature validation
        return true;
    }

    const signature = req.headers['x-twilio-signature'] as string | undefined;
    if (!signature) return false;

    // URL Twilio signed: use the configured webhook URL, or reconstruct from request
    const url = webhookUrl || `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    const params = req.body as Record<string, string>;

    return twilio.validateRequest(authToken, signature, url, params);
}

/**
 * Strip the "whatsapp:" prefix Twilio adds to WhatsApp numbers.
 * E.g. "whatsapp:+12125551234" → "+12125551234"
 */
export function normalizePhone(from: string): string {
    return from.replace(/^whatsapp:/i, '');
}

/**
 * Build a TwiML XML response with a single <Message> body.
 */
export function twimlReply(message: string): string {
    const resp = new twilio.twiml.MessagingResponse();
    resp.message(message);
    return resp.toString();
}

/**
 * Send an outbound WhatsApp message via Twilio REST API.
 * Used for proactive messages (email ingest confirmations, morning briefings, etc.)
 * No-ops in dev if TWILIO_ACCOUNT_SID or TWILIO_PHONE_NUMBER is not set.
 */
export async function sendWhatsAppMessage(toPhone: string, body: string): Promise<void> {
    const { accountSid, authToken, phoneNumber } = config.twilio;
    if (!accountSid || !authToken || !phoneNumber) return;

    const client = twilio(accountSid, authToken);
    await client.messages.create({
        from: `whatsapp:${phoneNumber}`,
        to: `whatsapp:${toPhone}`,
        body,
    });
}
