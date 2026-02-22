import twilio from 'twilio';
import config from '../config';

/** Strip the "whatsapp:" prefix Twilio adds for WhatsApp numbers → E.164. */
export function normalizePhone(raw: string): string {
    return raw.replace(/^whatsapp:/i, '').trim();
}

/**
 * Verify that the incoming POST truly came from Twilio using the webhook signature.
 * Skips validation when TWILIO_AUTH_TOKEN is not configured (local dev).
 */
export function validateTwilioSignature(
    url: string,
    params: Record<string, string>,
    signature: string
): boolean {
    const authToken = config.twilio.authToken;
    if (!authToken) return true; // Skip in dev when Twilio is not configured
    return twilio.validateRequest(authToken, signature, url, params);
}

/** Build a TwiML XML response with a single <Message> element. */
export function twimlReply(message: string): string {
    return [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<Response>',
        `  <Message>${escapeXml(message)}</Message>`,
        '</Response>',
    ].join('\n');
}

function escapeXml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}
