import { Request, Response } from 'express';
import moment from 'moment-timezone';
import { AppDataSource } from '../data-source';
import { User } from '../entities/User';
import { Event } from '../entities/Event';
import { UserSettings } from '../entities/UserSettings';
import { IntentParser, IntentResult } from '../services/intentParser';
import { EventService } from '../services/eventService';
import { validateTwilioSignature, normalizePhone, twimlReply } from '../services/twilioService';
import config from '../config';

// ── Pending confirmation types ────────────────────────────────────────────────

interface PendingCreate {
    type: 'create';
    userId: string;
    event: {
        title: string;
        startTime: Date;
        endTime: Date;
        isAllDay: boolean;
        location?: string;
        duration: number;
    };
}

interface PendingUpdate {
    type: 'update';
    eventId: string;
    eventTitle: string;
    changes: Record<string, unknown>;
}

interface PendingDelete {
    type: 'delete';
    eventId: string;
    eventTitle: string;
}

type PendingAction = (PendingCreate | PendingUpdate | PendingDelete) & {
    expiresAt: number;
};

// In-memory store: normalised E.164 phone → pending action (5-min TTL)
const pendingConfirmations = new Map<string, PendingAction>();
const PENDING_TTL_MS = 5 * 60 * 1000;

function clearExpired() {
    const now = Date.now();
    for (const [key, val] of pendingConfirmations) {
        if (val.expiresAt < now) pendingConfirmations.delete(key);
    }
}

// ── SMS-friendly formatting ───────────────────────────────────────────────────

function formatEventSummary(
    title: string,
    startTime: Date,
    endTime: Date,
    isAllDay: boolean,
    location?: string
): string {
    const start = moment(startTime);
    const durationMins = moment(endTime).diff(start, 'minutes');
    const dateStr = start.format('ddd MMM D');
    const timeStr = isAllDay ? '(all day)' : start.format('h:mm A');
    const durStr = isAllDay
        ? ''
        : ` (${durationMins >= 60 ? `${Math.round(durationMins / 60)}h` : `${durationMins}m`})`;
    const locStr = location ? `\n📍 ${location}` : '';
    return `${title}\n📆 ${dateStr} at ${timeStr}${durStr}${locStr}`;
}

function formatEventsList(events: Event[], answer: string): string {
    if (events.length === 0) return answer;
    const lines = [answer, ''];
    events.slice(0, 5).forEach((e, i) => {
        const t = moment(e.startTime).format('MMM D, h:mm A');
        lines.push(`${i + 1}. ${e.title} — ${t}`);
    });
    if (events.length > 5) lines.push(`... and ${events.length - 5} more`);
    return lines.join('\n');
}

// ── Controller ────────────────────────────────────────────────────────────────

export class WebhookController {
    private intentParser: IntentParser;
    private eventService: EventService;

    constructor() {
        const apiKey = process.env.OPENAI_API_KEY || '';
        this.intentParser = new IntentParser(apiKey);
        this.eventService = new EventService();
    }

    public handleTwilioWebhook = async (req: Request, res: Response): Promise<void> => {
        // Validate Twilio signature
        const signature = (req.headers['x-twilio-signature'] as string) || '';
        const webhookUrl =
            config.twilio.webhookUrl ||
            `${req.protocol}://${req.get('host')}${req.originalUrl}`;

        if (!validateTwilioSignature(webhookUrl, req.body as Record<string, string>, signature)) {
            res.status(403).type('text/xml').send(twimlReply('Unauthorized'));
            return;
        }

        const fromRaw: string = (req.body as Record<string, string>).From || '';
        const body: string = ((req.body as Record<string, string>).Body || '').trim();
        const phone = normalizePhone(fromRaw);

        if (!body) {
            res.type('text/xml').send(
                twimlReply('Hi! Send me a message to manage your famcal.ai calendar.')
            );
            return;
        }

        clearExpired();

        // Check for YES/NO reply to a pending confirmation
        const pending = pendingConfirmations.get(phone);
        const upper = body.toUpperCase();

        if (pending) {
            if (upper === 'YES' || upper === 'Y') {
                const reply = await this.executePending(phone, pending);
                res.type('text/xml').send(reply);
                return;
            }
            if (upper === 'NO' || upper === 'N' || upper === 'CANCEL') {
                pendingConfirmations.delete(phone);
                res.type('text/xml').send(
                    twimlReply("Cancelled. Send another message whenever you're ready.")
                );
                return;
            }
            // Not YES/NO — fall through to parse as a new command, replacing any pending
        }

        // Look up user by phone number
        const userRepo = AppDataSource.getRepository(User);
        const user = await userRepo.findOne({ where: { phoneNumber: phone } });

        if (!user) {
            res.type('text/xml').send(
                twimlReply(
                    "Hi! To use famcal.ai via WhatsApp/SMS, link your phone number at:\nhttps://famcal.ai/settings\n\nDon't have an account? Sign up at https://famcal.ai"
                )
            );
            return;
        }

        // Get user timezone
        const settingsRepo = AppDataSource.getRepository(UserSettings);
        const settings = await settingsRepo.findOne({ where: { userId: user.id } });
        const timezone = settings?.timezone || 'America/New_York';

        // Fetch events as context for the intent parser
        const contextStart = moment().subtract(7, 'days').toDate();
        const contextEnd = moment().add(90, 'days').toDate();
        const userEvents = await this.eventService.findByUserIdAndDateRange(
            user.id, contextStart, contextEnd, timezone
        );

        // Parse intent
        let result: IntentResult;
        try {
            result = await this.intentParser.parseIntent(body, timezone, userEvents);
        } catch (err) {
            console.error('Intent parser error:', err);
            res.type('text/xml').send(
                twimlReply("Sorry, I couldn't understand that. Please try again.")
            );
            return;
        }

        // ── QUERY: reply immediately ─────────────────────────────────────────
        if (result.intent === 'query') {
            const eventIds = result.eventIds; // capture before arrow fn to preserve narrowing
            const answer = result.answer;
            const matched = userEvents.filter(e => eventIds.includes(e.id));
            res.type('text/xml').send(twimlReply(formatEventsList(matched, answer)));
            return;
        }

        // ── CREATE: request confirmation ─────────────────────────────────────
        if (result.intent === 'create') {
            const { title, startTime, endTime, isAllDay, location, duration } = result.event;
            const summary = formatEventSummary(title, startTime, endTime, isAllDay, location);

            pendingConfirmations.set(phone, {
                type: 'create',
                userId: user.id,
                event: { title, startTime, endTime, isAllDay, location, duration },
                expiresAt: Date.now() + PENDING_TTL_MS,
            });

            res.type('text/xml').send(
                twimlReply(`Got it! Create this event?\n\n${summary}\n\nReply YES to confirm or NO to cancel.`)
            );
            return;
        }

        // ── UPDATE: confirmation (with disambiguation fallback) ───────────────
        if (result.intent === 'update') {
            let eventId = result.eventId;

            if (!eventId && result.candidateIds && result.candidateIds.length > 0) {
                // Multiple matches: use the nearest one and tell the user
                const updateCandidateIds = result.candidateIds;
                const candidates = userEvents.filter(e => updateCandidateIds.includes(e.id));
                if (candidates.length > 1) {
                    const list = candidates
                        .map((e, i) => `${i + 1}. ${e.title} — ${moment(e.startTime).format('MMM D')}`)
                        .join('\n');
                    const best = candidates[0];
                    pendingConfirmations.set(phone, {
                        type: 'update',
                        eventId: best.id,
                        eventTitle: best.title,
                        changes: result.changes as Record<string, unknown>,
                        expiresAt: Date.now() + PENDING_TTL_MS,
                    });
                    res.type('text/xml').send(
                        twimlReply(
                            `Found ${candidates.length} matching events:\n\n${list}\n\nReply YES to update "${best.title}" or NO to cancel.`
                        )
                    );
                    return;
                }
                eventId = candidates[0]?.id;
            }

            if (!eventId) {
                res.type('text/xml').send(twimlReply("I couldn't find that event on your calendar."));
                return;
            }

            const existing = await this.eventService.findById(eventId);
            if (!existing || existing.userId !== user.id) {
                res.type('text/xml').send(twimlReply('Event not found.'));
                return;
            }

            const previewTitle = result.changes.title || existing.title;
            const previewStart = (result.changes.startTime as Date) || (existing.startTime as Date);
            const previewEnd = (result.changes.endTime as Date) || (existing.endTime as Date);
            const previewLoc =
                result.changes.location !== undefined ? (result.changes.location as string) : existing.location;

            const summary = formatEventSummary(
                previewTitle as string,
                previewStart,
                previewEnd,
                existing.isAllDay,
                previewLoc
            );

            pendingConfirmations.set(phone, {
                type: 'update',
                eventId,
                eventTitle: existing.title,
                changes: result.changes as Record<string, unknown>,
                expiresAt: Date.now() + PENDING_TTL_MS,
            });

            res.type('text/xml').send(
                twimlReply(`Update "${existing.title}" to:\n\n${summary}\n\nReply YES to confirm or NO to cancel.`)
            );
            return;
        }

        // ── DELETE: confirmation ─────────────────────────────────────────────
        if (result.intent === 'delete') {
            let eventId = result.eventId;

            if (!eventId && result.candidateIds && result.candidateIds.length > 0) {
                const deleteCandidateIds = result.candidateIds;
                const candidates = userEvents.filter(e => deleteCandidateIds.includes(e.id));
                if (candidates.length > 1) {
                    const list = candidates
                        .map((e, i) => `${i + 1}. ${e.title} — ${moment(e.startTime).format('MMM D')}`)
                        .join('\n');
                    const best = candidates[0];
                    pendingConfirmations.set(phone, {
                        type: 'delete',
                        eventId: best.id,
                        eventTitle: best.title,
                        expiresAt: Date.now() + PENDING_TTL_MS,
                    });
                    res.type('text/xml').send(
                        twimlReply(
                            `Found ${candidates.length} matching events:\n\n${list}\n\nReply YES to delete "${best.title}" or NO to cancel.`
                        )
                    );
                    return;
                }
                eventId = candidates[0]?.id;
            }

            if (!eventId) {
                res.type('text/xml').send(twimlReply("I couldn't find that event on your calendar."));
                return;
            }

            const existing = await this.eventService.findById(eventId);
            if (!existing || existing.userId !== user.id) {
                res.type('text/xml').send(twimlReply('Event not found.'));
                return;
            }

            const summary = formatEventSummary(
                existing.title,
                existing.startTime as Date,
                existing.endTime as Date,
                existing.isAllDay,
                existing.location
            );

            pendingConfirmations.set(phone, {
                type: 'delete',
                eventId,
                eventTitle: existing.title,
                expiresAt: Date.now() + PENDING_TTL_MS,
            });

            res.type('text/xml').send(
                twimlReply(`Delete this event?\n\n${summary}\n\nReply YES to delete or NO to cancel.`)
            );
            return;
        }

        res.type('text/xml').send(twimlReply("Sorry, I didn't understand that command."));
    };

    private executePending = async (phone: string, pending: PendingAction): Promise<string> => {
        pendingConfirmations.delete(phone);

        try {
            if (pending.type === 'create') {
                const event = new Event();
                event.title = pending.event.title;
                event.startTime = pending.event.startTime;
                event.endTime = pending.event.endTime;
                event.duration = pending.event.duration;
                event.isAllDay = pending.event.isAllDay;
                event.location = pending.event.location;
                event.userId = pending.userId;

                const saved = await this.eventService.create(event);
                const dateStr = moment(saved.startTime).format('MMM D [at] h:mm A');
                return twimlReply(`✓ Created "${saved.title}" on ${dateStr}!\n\nView your calendar: https://famcal.ai`);
            }

            if (pending.type === 'update') {
                const updated = await this.eventService.update(pending.eventId, pending.changes as Partial<Event>);
                const dateStr = moment(updated.startTime).format('MMM D [at] h:mm A');
                return twimlReply(`✓ Updated "${updated.title}" to ${dateStr}!\n\nView your calendar: https://famcal.ai`);
            }

            if (pending.type === 'delete') {
                await this.eventService.delete(pending.eventId);
                return twimlReply(`✓ Deleted "${pending.eventTitle}".\n\nView your calendar: https://famcal.ai`);
            }
        } catch (err) {
            console.error('Error executing pending action:', err);
            return twimlReply('Sorry, something went wrong. Please try again from the app.');
        }

        return twimlReply('Done!');
    };
}

export const webhookController = new WebhookController();
