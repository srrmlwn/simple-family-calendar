// src/controllers/flyerController.ts
import '@anthropic-ai/sdk/shims/node';
import { Request, Response } from 'express';
import multer from 'multer';
import Anthropic from '@anthropic-ai/sdk';
import mammoth from 'mammoth';
import { toZonedTime, format } from 'date-fns-tz';
import { AppDataSource } from '../data-source';
import { FamilyMember } from '../entities/FamilyMember';
import { effectiveUserId } from '../utils/effectiveUserId';
import { logLLMCall } from '../services/llmLogger';

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_IMAGE_SIZE    = 10 * 1024 * 1024; // 10 MB (legacy image endpoint)
const MAX_DOCUMENT_SIZE = 20 * 1024 * 1024; // 20 MB (new document endpoint)

const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;
type ImageMimeType = typeof IMAGE_MIME_TYPES[number];

const DOCUMENT_MIME_TYPES = [
    ...IMAGE_MIME_TYPES,
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

// ── Multer configs ────────────────────────────────────────────────────────────

export const uploadImage = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_IMAGE_SIZE },
    fileFilter: (_req, file, cb) => {
        if ((IMAGE_MIME_TYPES as readonly string[]).includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Unsupported image type. Please use JPEG, PNG, GIF, or WebP.'));
        }
    },
}).single('image');

export const uploadDocument = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_DOCUMENT_SIZE },
    fileFilter: (_req, file, cb) => {
        if ((DOCUMENT_MIME_TYPES as readonly string[]).includes(file.mimetype)) {
            cb(null, true);
        } else if (file.mimetype === 'application/msword') {
            cb(new Error('Old Word format (.doc) is not supported. Please save as .docx and try again.'));
        } else {
            cb(new Error('Unsupported file type. Please use a PDF, Word (.docx), or an image (JPEG, PNG, GIF, WebP).'));
        }
    },
}).single('document');

// ── Shared types ──────────────────────────────────────────────────────────────

// Shape of each event extracted from a document (matches client-side ParsedFlyerEvent)
export interface FlyerEvent {
    title: string;
    startTime: string; // ISO UTC
    endTime: string;   // ISO UTC
    isAllDay: boolean;
    location?: string;
    familyMemberNames?: string[];
}

// ── Anthropic client ──────────────────────────────────────────────────────────

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 60000 });

// ── Shared helpers ────────────────────────────────────────────────────────────

function buildPrompt(todayLabel: string, timezone: string, currentYear: number, familyMemberNames: string[]): string {
    const familyMemberSection = familyMemberNames.length > 0
        ? `\nFamily members to tag if mentioned: ${familyMemberNames.join(', ')}`
        : '';

    return `Today is ${todayLabel} (${timezone}).${familyMemberSection}

Extract ALL calendar events from this document (e.g. sports schedules, school flyers, calendars, sign-up sheets).

Return ONLY a JSON array — no markdown, no explanation. Each element must have:
- title: string (concise event name)
- startTime: ISO UTC string (if no year shown, use ${currentYear}; if no time shown, use 08:00 local → convert to UTC)
- endTime: ISO UTC string (1 hour after startTime if not specified; for all-day use 23:59:59 local → UTC)
- isAllDay: boolean (true when only a date is shown, no specific time)
- location: string (omit if not present)
- familyMemberNames: array of matching names from the family members list above (omit if none apply)

If no events are found, return an empty array [].
Return ONLY valid JSON with no extra text.`;
}

function normalizeEvents(rawEvents: unknown[]): FlyerEvent[] {
    const ONE_HOUR_MS = 60 * 60 * 1000;
    return (rawEvents as FlyerEvent[])
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

            return {
                ...e,
                startTime: start.toISOString(),
                endTime: end.toISOString(),
                isAllDay: e.isAllDay ?? false,
            };
        });
}

function parseJsonEvents(raw: string): unknown[] {
    const jsonStr = raw.replace(/^```json\n?|\n?```$/g, '').trim();
    try {
        const parsed = JSON.parse(jsonStr);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

// ── Core extraction: buffer → FlyerEvent[] ───────────────────────────────────
// Exported so webhookController can call it directly for WhatsApp media.

export async function extractEventsFromBuffer(
    buffer: Buffer,
    mimeType: string,
    familyMemberNames: string[],
    timezone: string,
    userId: string
): Promise<FlyerEvent[]> {
    const now          = toZonedTime(new Date(), timezone);
    const todayLabel   = format(now, 'EEEE, MMMM d, yyyy', { timeZone: timezone });
    const currentYear  = now.getFullYear();
    const prompt       = buildPrompt(todayLabel, timezone, currentYear, familyMemberNames);

    const t0 = Date.now();
    let message: Anthropic.Message;

    if ((IMAGE_MIME_TYPES as readonly string[]).includes(mimeType)) {
        // ── Image → Claude vision ──────────────────────────────────────────
        const base64Data = buffer.toString('base64');
        message = await anthropic.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 2048,
            messages: [{
                role: 'user',
                content: [
                    {
                        type: 'image',
                        source: {
                            type: 'base64',
                            media_type: mimeType as ImageMimeType,
                            data: base64Data,
                        },
                    },
                    { type: 'text', text: prompt },
                ],
            }],
        });

    } else if (mimeType === 'application/pdf') {
        // ── PDF → Claude document API ──────────────────────────────────────
        const base64Data = buffer.toString('base64');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pdfBlock: any = {
            type: 'document',
            source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: base64Data,
            },
        };
        message = await anthropic.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 2048,
            messages: [{
                role: 'user',
                content: [pdfBlock, { type: 'text', text: prompt }],
            }],
        });

    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        // ── DOCX → mammoth text → Claude ───────────────────────────────────
        const { value: docText } = await mammoth.extractRawText({ buffer });
        if (!docText.trim()) {
            return [];
        }
        message = await anthropic.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 2048,
            messages: [{
                role: 'user',
                content: [
                    { type: 'text', text: `Document contents:\n\n${docText}\n\n---\n\n${prompt}` },
                ],
            }],
        });

    } else {
        throw new Error('Unsupported file type.');
    }

    logLLMCall({
        userId,
        channel: 'flyer',
        model: 'claude-sonnet-4-6',
        promptTokens: message.usage.input_tokens,
        completionTokens: message.usage.output_tokens,
        latencyMs: Date.now() - t0,
    });

    const raw = (message.content.length > 0 && message.content[0].type === 'text')
        ? message.content[0].text.trim()
        : '[]';

    return normalizeEvents(parseJsonEvents(raw));
}

// ── Route handlers ────────────────────────────────────────────────────────────

// Legacy handler — images only (backward compat with /api/flyer/parse-image)
export const parseFlyer = async (req: Request, res: Response): Promise<Response> => {
    if (!req.file) {
        return res.status(400).json({ error: 'No image file provided' });
    }

    const { timezone } = req.body;
    if (!timezone || typeof timezone !== 'string') {
        return res.status(400).json({ error: 'Timezone is required' });
    }

    const userId = effectiveUserId(req);
    const fmRepo = AppDataSource.getRepository(FamilyMember);
    const familyMembers = await fmRepo.find({ where: { userId } });
    const familyMemberNames = familyMembers.map(m => m.name);

    const events = await extractEventsFromBuffer(
        req.file.buffer,
        req.file.mimetype,
        familyMemberNames,
        timezone,
        userId
    );
    return res.json({ events });
};

// New handler — images + PDF + DOCX (/api/flyer/parse-document)
export const parseDocument = async (req: Request, res: Response): Promise<Response> => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file provided' });
    }

    const { timezone } = req.body;
    if (!timezone || typeof timezone !== 'string') {
        return res.status(400).json({ error: 'Timezone is required' });
    }

    const userId = effectiveUserId(req);
    const fmRepo = AppDataSource.getRepository(FamilyMember);
    const familyMembers = await fmRepo.find({ where: { userId } });
    const familyMemberNames = familyMembers.map(m => m.name);

    const events = await extractEventsFromBuffer(
        req.file.buffer,
        req.file.mimetype,
        familyMemberNames,
        timezone,
        userId
    );
    return res.json({ events });
};
