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
 * Download a Twilio media URL as a Buffer.
 * Twilio requires HTTP Basic auth (AccountSid:AuthToken) to fetch media.
 */
export async function downloadTwilioMedia(url: string): Promise<Buffer> {
    const { accountSid, authToken } = config.twilio;
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const https = require('https') as typeof import('https');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const http  = require('http')  as typeof import('http');

    return new Promise((resolve, reject) => {
        const lib = url.startsWith('https') ? https : http;
        lib.get(url, { headers: { Authorization: `Basic ${credentials}` } }, (res) => {
            if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                downloadTwilioMedia(res.headers.location).then(resolve).catch(reject);
                return;
            }
            if (res.statusCode !== 200) {
                reject(new Error(`Failed to download media: HTTP ${res.statusCode ?? 'unknown'}`));
                return;
            }
            const chunks: Buffer[] = [];
            res.on('data', (chunk: Buffer) => chunks.push(chunk));
            res.on('end', () => resolve(Buffer.concat(chunks)));
            res.on('error', reject);
        }).on('error', reject);
    });
}

/**
 * Send an outbound SMS or WhatsApp message via Twilio REST API.
 * No-ops in dev if the required env vars are not set.
 */
export async function sendTwilioMessage(toPhone: string, body: string, channel: 'sms' | 'whatsapp'): Promise<void> {
    const { accountSid, authToken, smsPhoneNumber, whatsappPhoneNumber } = config.twilio;
    if (!accountSid || !authToken) return;

    const fromNumber = channel === 'whatsapp' ? whatsappPhoneNumber : smsPhoneNumber;
    if (!fromNumber) return;

    const from = channel === 'whatsapp' ? `whatsapp:${fromNumber}` : fromNumber;
    const to   = channel === 'whatsapp' ? `whatsapp:${toPhone}`    : toPhone;

    const client = twilio(accountSid, authToken);
    await client.messages.create({ from, to, body });
}
