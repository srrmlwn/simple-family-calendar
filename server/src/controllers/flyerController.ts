// src/controllers/flyerController.ts
import '@anthropic-ai/sdk/shims/node';
import { Request, Response } from 'express';
import multer from 'multer';
import Anthropic from '@anthropic-ai/sdk';
import { toZonedTime, format } from 'date-fns-tz';
import { AppDataSource } from '../data-source';
import { FamilyMember } from '../entities/FamilyMember';
import { effectiveUserId } from '../utils/effectiveUserId';

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB

// Anthropic vision supports these four types only
const SUPPORTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;
type SupportedMimeType = typeof SUPPORTED_MIME_TYPES[number];

export const uploadImage = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_IMAGE_SIZE },
    fileFilter: (_req, file, cb) => {
        if ((SUPPORTED_MIME_TYPES as readonly string[]).includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Unsupported image type. Please use JPEG, PNG, GIF, or WebP.'));
        }
    },
}).single('image');

// Shape of each event extracted from a flyer image (matches client-side ParsedFlyerEvent)
interface FlyerEvent {
    title: string;
    startTime: string; // ISO UTC
    endTime: string;   // ISO UTC
    isAllDay: boolean;
    location?: string;
    familyMemberNames?: string[];
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 30000 });

export const parseFlyer = async (req: Request, res: Response): Promise<Response> => {
    if (!req.file) {
        return res.status(400).json({ error: 'No image file provided' });
    }

    const { timezone } = req.body;
    if (!timezone || typeof timezone !== 'string') {
        return res.status(400).json({ error: 'Timezone is required' });
    }

    const userId = effectiveUserId(req);

    // Fetch family members for name extraction and tagging
    const fmRepo = AppDataSource.getRepository(FamilyMember);
    const familyMembers = await fmRepo.find({ where: { userId } });
    const familyMemberNames = familyMembers.map(m => m.name);

    const now = toZonedTime(new Date(), timezone);
    const todayLabel = format(now, 'EEEE, MMMM d, yyyy', { timeZone: timezone });
    const currentYear = now.getFullYear();
    const base64Image = req.file.buffer.toString('base64');
    const mediaType = req.file.mimetype as SupportedMimeType;

    const familyMemberSection = familyMemberNames.length > 0
        ? `\nFamily members to tag if mentioned in the image: ${familyMemberNames.join(', ')}`
        : '';

    const prompt = `Today is ${todayLabel} (${timezone}).${familyMemberSection}

Extract ALL calendar events from this image (e.g. sports schedules, school flyers, calendars, sign-up sheets).

Return ONLY a JSON array — no markdown, no explanation. Each element must have:
- title: string (concise event name)
- startTime: ISO UTC string (if no year shown, use ${currentYear}; if no time shown, use 08:00 local → convert to UTC)
- endTime: ISO UTC string (1 hour after startTime if not specified; for all-day use 23:59:59 local → UTC)
- isAllDay: boolean (true when only a date is shown, no specific time)
- location: string (omit if not present)
- familyMemberNames: array of matching names from the family members list above (omit if none apply)

If no events are found, return an empty array [].
Return ONLY valid JSON with no extra text.`;

    const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        messages: [{
            role: 'user',
            content: [
                {
                    type: 'image',
                    source: {
                        type: 'base64',
                        media_type: mediaType,
                        data: base64Image,
                    },
                },
                {
                    type: 'text',
                    text: prompt,
                },
            ],
        }],
    });

    const raw = (message.content.length > 0 && message.content[0].type === 'text')
        ? message.content[0].text.trim()
        : '[]';
    const jsonStr = raw.replace(/^```json\n?|\n?```$/g, '').trim();

    let raw_events: unknown[];
    try {
        const parsed = JSON.parse(jsonStr);
        raw_events = Array.isArray(parsed) ? parsed : [];
    } catch {
        raw_events = [];
    }

    // Normalize AI output — fill in missing startTime/endTime so the client always
    // receives valid ISO strings. The AI may omit times when only a date is visible.
    const ONE_HOUR_MS = 60 * 60 * 1000;
    const events: FlyerEvent[] = (raw_events as FlyerEvent[])
        .filter(e => e && typeof e === 'object' && e.title)
        .map(e => {
            // Parse startTime; default to 08:00 local→UTC on today if missing/invalid
            let start = e.startTime ? new Date(e.startTime) : null;
            if (!start || isNaN(start.getTime())) {
                // Use noon UTC today as a safe default — user can edit in EventForm
                start = new Date();
                start.setUTCHours(12, 0, 0, 0);
            }

            // Parse endTime; default to start + 1 hour if missing/invalid
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

    return res.json({ events });
};
