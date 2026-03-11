// src/services/emailIngestService.ts
import '@anthropic-ai/sdk/shims/node';
import Anthropic from '@anthropic-ai/sdk';
import moment from 'moment-timezone';
import { logLLMCall } from './llmLogger';

export interface CandidateEvent {
    title: string;
    startTime: string; // ISO UTC
    endTime: string;   // ISO UTC
    isAllDay: boolean;
    location?: string;
    familyMemberNames?: string[];
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 30000 });

const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;
type SupportedImageType = typeof SUPPORTED_IMAGE_TYPES[number];
const ONE_HOUR_MS = 60 * 60 * 1000;

// ── Text helpers ───────────────────────────────────────────────────────────────

/**
 * Strip HTML tags to get readable text. Used as fallback when plain text is absent.
 */
export function stripHtml(html: string): string {
    return html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/[ \t]{2,}/g, ' ')
        .trim();
}

/**
 * Extract the plain-text portion of an email body.
 * Prefers `text`, falls back to stripping `html`.
 */
export function extractBodyText(text: string, html: string): string {
    if (text?.trim()) return text.trim();
    if (html?.trim()) return stripHtml(html);
    return '';
}

/**
 * Parse email address from "Name <email@example.com>" or bare "email@example.com".
 */
export function extractEmailAddress(from: string): string {
    const bracketed = from.match(/<([^>]+@[^>]+)>/);
    if (bracketed) return bracketed[1].toLowerCase().trim();
    const bare = from.match(/([^\s<>,;]+@[^\s<>,;]+)/);
    if (bare) return bare[1].toLowerCase().trim();
    return from.toLowerCase().trim();
}

// ── Attachment content extraction ─────────────────────────────────────────────

/**
 * Extract text content from a PDF buffer using pdf-parse.
 * Returns empty string on failure so the caller can continue gracefully.
 */
export async function extractFromPDF(buffer: Buffer): Promise<string> {
    try {
        // Dynamic require — pdf-parse has no TypeScript types bundled
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>;
        const result = await pdfParse(buffer);
        return result.text?.trim() ?? '';
    } catch {
        return '';
    }
}

/**
 * Extract text from an image attachment using Claude vision.
 * Returns a text description of any events visible in the image.
 */
export async function extractFromImage(buffer: Buffer, mimeType: string): Promise<string> {
    if (!(SUPPORTED_IMAGE_TYPES as readonly string[]).includes(mimeType)) return '';
    try {
        const base64 = buffer.toString('base64');
        const t0 = Date.now();
        const msg = await anthropic.messages.create({
            model: 'claude-haiku-4-5-20251001', // Use fast model for image text extraction
            max_tokens: 512,
            messages: [{
                role: 'user',
                content: [
                    { type: 'image', source: { type: 'base64', media_type: mimeType as SupportedImageType, data: base64 } },
                    { type: 'text', text: 'Extract all calendar event details from this image as plain text. Include event names, dates, times, and locations. If there are no events, say "No events found."' },
                ],
            }],
        });
        logLLMCall({ channel: 'email', model: 'claude-haiku-4-5-20251001', latencyMs: Date.now() - t0,
            promptTokens: msg.usage.input_tokens, completionTokens: msg.usage.output_tokens });
        return msg.content[0]?.type === 'text' ? msg.content[0].text.trim() : '';
    } catch {
        return '';
    }
}

/**
 * Extract text from an .ics (iCalendar) buffer using simple regex parsing.
 * No external dependency — just picks out SUMMARY, DTSTART, DTEND, LOCATION.
 */
export function extractFromICS(buffer: Buffer): string {
    const text = buffer.toString('utf-8');
    const blocks = text.split('BEGIN:VEVENT');
    const parts: string[] = [];
    for (const block of blocks.slice(1)) {
        const summary  = block.match(/^SUMMARY[^:]*:(.+)/m)?.[1]?.trim() ?? '';
        const dtstart  = block.match(/^DTSTART[^:]*:([^\r\n]+)/m)?.[1]?.trim() ?? '';
        const dtend    = block.match(/^DTEND[^:]*:([^\r\n]+)/m)?.[1]?.trim() ?? '';
        const location = block.match(/^LOCATION[^:]*:(.+)/m)?.[1]?.trim() ?? '';
        if (summary) {
            parts.push(`Event: ${summary}${dtstart ? `, from ${dtstart}` : ''}${dtend ? ` to ${dtend}` : ''}${location ? ` at ${location}` : ''}`);
        }
    }
    return parts.join('\n');
}

// ── LLM event extraction ──────────────────────────────────────────────────────

/**
 * Parse calendar events from combined email content using Claude.
 * Returns a (potentially empty) list of candidate events.
 */
export async function parseEventsFromContent(
    content: string,
    subject: string,
    timezone: string,
    familyMemberNames: string[],
    userId: string,
): Promise<CandidateEvent[]> {
    // Quick heuristic: if there's no date/time language at all, skip the LLM call
    if (!/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}[:/]\d{2}|\d{1,2}am|\d{1,2}pm)/i.test(content)) {
        return [];
    }

    // Truncate to keep costs reasonable
    const truncated = content.slice(0, 4000);

    const now = moment().tz(timezone);
    const todayLabel = now.format('dddd, MMMM D, YYYY');
    const currentYear = now.year();

    const familySection = familyMemberNames.length > 0
        ? `\nFamily members to tag if mentioned: ${familyMemberNames.join(', ')}`
        : '';

    const prompt = `Today is ${todayLabel} (${timezone}).${familySection}

This is the content of a forwarded email (subject: "${subject}"):

---
${truncated}
---

Extract ALL calendar events you can find. Return ONLY a JSON array — no markdown, no explanation. Each element must have:
- title: string (concise event name)
- startTime: ISO UTC string (if year is missing, use ${currentYear}; if time is missing, use 08:00 local → convert to UTC)
- endTime: ISO UTC string (1 hour after startTime if not specified; for all-day use 23:59:59 local → UTC)
- isAllDay: boolean (true when only a date is given, no specific time)
- location: string (omit if not present)
- familyMemberNames: array of matching names from the list above (omit if none apply)

If no events are found, return an empty array [].
Return ONLY valid JSON with no extra text.`;

    const t0 = Date.now();
    let raw = '[]';
    try {
        const msg = await anthropic.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 2048,
            messages: [{ role: 'user', content: prompt }],
        });
        logLLMCall({
            userId, channel: 'email', model: 'claude-sonnet-4-6',
            promptTokens: msg.usage.input_tokens, completionTokens: msg.usage.output_tokens,
            latencyMs: Date.now() - t0,
        });
        raw = msg.content[0]?.type === 'text' ? msg.content[0].text.trim() : '[]';
    } catch (err) {
        logLLMCall({ userId, channel: 'email', model: 'claude-sonnet-4-6', latencyMs: Date.now() - t0, error: String(err) });
        return [];
    }

    // Strip markdown fences if the model added them
    const jsonStr = raw.replace(/^```json\n?|\n?```$/g, '').trim();
    let parsed: unknown;
    try {
        parsed = JSON.parse(jsonStr);
    } catch {
        return [];
    }
    if (!Array.isArray(parsed)) return [];

    // Normalise and validate each event
    return (parsed as CandidateEvent[])
        .filter(e => e && typeof e === 'object' && e.title)
        .map(e => {
            let start = e.startTime ? new Date(e.startTime) : null;
            if (!start || isNaN(start.getTime())) {
                start = new Date();
                start.setUTCHours(12, 0, 0, 0);
            }
            let end = e.endTime ? new Date(e.endTime) : null;
            if (!end || isNaN(end.getTime()) || end <= start) {
                end = new Date(start.getTime() + ONE_HOUR_MS);
            }
            return { ...e, startTime: start.toISOString(), endTime: end.toISOString(), isAllDay: e.isAllDay ?? false };
        });
}

// ── Confirmation message builder ───────────────────────────────────────────────

const PREVIEW_LIMIT = 5;

export function buildConfirmationMessage(events: CandidateEvent[], timezone: string): string {
    const n = events.length;
    if (n === 0) return '';

    const preview = events.slice(0, PREVIEW_LIMIT).map(e => {
        const start = e.isAllDay
            ? moment(e.startTime).tz(timezone).format('ddd MMM D')
            : moment(e.startTime).tz(timezone).format('ddd MMM D [at] h:mm A');
        const loc = e.location ? `, ${e.location}` : '';
        return `• ${e.title} — ${start}${loc}`;
    });

    const header = n === 1 ? 'Found 1 event in your email:' : `Found ${n} events in your email:`;
    const overflow = n > PREVIEW_LIMIT ? `\n... and ${n - PREVIEW_LIMIT} more` : '';
    const prompt = n === 1 ? 'Reply YES to add it, NO to skip.' : `Reply YES to add all ${n}, NO to skip.`;

    return `${header}\n\n${preview.join('\n')}${overflow}\n\n${prompt}`;
}
