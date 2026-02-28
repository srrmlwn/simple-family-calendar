// src/controllers/webhookController.ts
import { Request, Response } from 'express';
import moment from 'moment-timezone';
import { AppDataSource } from '../data-source';
import { User } from '../entities/User';
import { UserSettings } from '../entities/UserSettings';
import { Event } from '../entities/Event';
import { FamilyMember } from '../entities/FamilyMember';
import { LLMCall } from '../entities/LLMCall';
import { EventService } from '../services/eventService';
import { IntentParser } from '../services/intentParser';
import { validateSignature, normalizePhone, twimlReply } from '../services/twilioService';
import { CreateIntentResult, UpdateIntentResult, DeleteIntentResult, IntentResult } from '../services/intentParser';
import { validateOrReject } from 'class-validator';
import { getActiveSession, extractHistory, upsertTurn } from '../services/conversationService';

// ── In-memory pending confirmations ─────────────────────────────────────────
// Key: normalized phone number
// Value: pending action awaiting YES/NO from the user

type PendingAction =
    | { type: 'create'; data: CreateIntentResult['event'] }
    | { type: 'update'; eventId: string; changes: UpdateIntentResult['changes'] }
    | { type: 'delete'; eventId: string; title: string };

interface PendingEntry {
    action: PendingAction;
    prompt: string;       // The confirmation message already sent
    expiresAt: number;    // epoch ms
}

const PENDING_TTL_MS = 5 * 60 * 1000; // 5 minutes
const pendingConfirmations = new Map<string, PendingEntry>();

function clearExpired(phone: string): void {
    const entry = pendingConfirmations.get(phone);
    if (entry && entry.expiresAt < Date.now()) {
        pendingConfirmations.delete(phone);
    }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const eventService = new EventService();
const intentParser = new IntentParser(process.env.ANTHROPIC_API_KEY || '');

function formatEventList(events: Event[]): string {
    if (events.length === 0) return 'No events found in that window.';
    return events
        .slice(0, 10)
        .map(e => {
            const start = moment(e.startTime).format('ddd MMM D h:mm A');
            return `• ${e.title} — ${start}`;
        })
        .join('\n');
}

// ── Main handler ─────────────────────────────────────────────────────────────

export async function handleTwilioWebhook(req: Request, res: Response): Promise<void> {
    // 1. Validate Twilio signature
    if (!validateSignature(req)) {
        res.status(403).send('Forbidden');
        return;
    }

    const rawFrom: string = (req.body as Record<string, string>).From ?? '';
    const body: string = ((req.body as Record<string, string>).Body ?? '').trim();
    const phone = normalizePhone(rawFrom);

    // 2. Look up user by phone number
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { phoneNumber: phone } });

    if (!user) {
        res.type('text/xml').send(
            twimlReply(
                "Hi! I'm your famcal.ai assistant, but this number isn't linked to an account yet. " +
                "Log in at famcal.ai, go to Settings, and add your phone number to get started."
            )
        );
        return;
    }

    // 3. Load user settings (for timezone)
    const settingsRepo = AppDataSource.getRepository(UserSettings);
    const settings = await settingsRepo.findOne({ where: { userId: user.id } });
    const timezone = settings?.timezone ?? 'America/New_York';

    // 4. Clear any expired pending entry for this user
    clearExpired(phone);

    // 5. Load conversation session (provides multi-turn context on the agent path)
    const session = await getActiveSession(user.id, 'whatsapp');
    const history = extractHistory(session);

    // 6. Handle YES/NO for pending confirmation
    const pending = pendingConfirmations.get(phone);
    if (pending) {
        const upper = body.toUpperCase();
        if (upper === 'YES' || upper === 'Y') {
            pendingConfirmations.delete(phone);
            // Fire-and-forget: mark the most recent unconfirmed LLM call as confirmed
            AppDataSource.getRepository(LLMCall)
                .createQueryBuilder()
                .update()
                .set({ confirmed: true })
                .where(
                    "user_id = :userId AND confirmed IS NULL AND created_at > NOW() - INTERVAL '10 minutes'",
                    { userId: user.id }
                )
                .orderBy('created_at', 'DESC')
                .limit(1)
                .execute()
                .catch(() => {});
            let reply: string;
            try {
                reply = await executePendingAction(pending.action, user.id);
            } catch {
                reply = 'Sorry, something went wrong. Please try again.';
            }
            upsertTurn(user.id, 'whatsapp', body, reply, session?.id).catch(() => {});
            res.type('text/xml').send(twimlReply(reply));
            return;
        } else if (upper === 'NO' || upper === 'N') {
            pendingConfirmations.delete(phone);
            // Fire-and-forget: mark the most recent unconfirmed LLM call as rejected
            AppDataSource.getRepository(LLMCall)
                .createQueryBuilder()
                .update()
                .set({ confirmed: false })
                .where(
                    "user_id = :userId AND confirmed IS NULL AND created_at > NOW() - INTERVAL '10 minutes'",
                    { userId: user.id }
                )
                .orderBy('created_at', 'DESC')
                .limit(1)
                .execute()
                .catch(() => {});
            const reply = 'Cancelled.';
            upsertTurn(user.id, 'whatsapp', body, reply, session?.id).catch(() => {});
            res.type('text/xml').send(twimlReply(reply));
            return;
        } else {
            // Treat any other message as a new command; clear the pending entry
            pendingConfirmations.delete(phone);
        }
    }

    // 7. Fetch user events for NLP context (−7 → +90 days)
    const contextStart = moment().subtract(7, 'days').toDate();
    const contextEnd = moment().add(90, 'days').toDate();
    const userEvents = await eventService.findByUserIdAndDateRange(
        user.id, contextStart, contextEnd, timezone
    );

    // Cast to Event[] — VirtualOccurrences are structurally compatible for NLP context
    const eventsForContext = userEvents as Event[];

    // Fetch family members
    const fmRepo = AppDataSource.getRepository(FamilyMember);
    const familyMembers = await fmRepo.find({ where: { userId: user.id } });

    // 8. Parse intent — fast path (no history) or agent path (with history)
    let parsed: IntentResult | undefined;
    try {
        parsed = await intentParser.parseIntent(
            body, timezone, eventsForContext, familyMembers,
            { userId: user.id, channel: 'whatsapp' },
            history
        );
    } catch {
        const errReply = "Sorry, I couldn't understand that. Try asking 'What's on my calendar this week?' or 'Add dentist Tuesday at 3pm'.";
        upsertTurn(user.id, 'whatsapp', body, errReply, session?.id).catch(() => {});
        res.type('text/xml').send(twimlReply(errReply));
        return;
    }

    // 9. Route by intent and persist this conversation turn
    const reply = routeIntent(parsed, eventsForContext, phone, timezone);
    upsertTurn(user.id, 'whatsapp', body, reply, session?.id).catch(() => {});
    res.type('text/xml').send(twimlReply(reply));
}

// ── Route intent to a reply string (and optionally store pending) ─────────────

function routeIntent(
    result: IntentResult | undefined,
    events: Event[],
    phone: string,
    timezone: string
): string {
    if (!result) {
        return "Sorry, I didn't understand that. Try 'What's on my calendar?' or 'Add meeting Friday at 2pm'.";
    }

    if (result.intent === 'query') {
        const matchedEvents = events.filter(e => result.eventIds.includes(e.id));
        const eventList = formatEventList(matchedEvents);
        return result.answer ? `${result.answer}\n\n${eventList}` : eventList;
    }

    if (result.intent === 'create') {
        const evt = result.event;
        const startFmt = moment(evt.startTime).tz(timezone).format('ddd MMM D [at] h:mm A');
        const prompt =
            `Add "${evt.title}" on ${startFmt}` +
            (evt.location ? ` at ${evt.location}` : '') +
            '?\n\nReply YES to confirm or NO to cancel.';
        pendingConfirmations.set(phone, {
            action: { type: 'create', data: evt },
            prompt,
            expiresAt: Date.now() + PENDING_TTL_MS,
        });
        return prompt;
    }

    if (result.intent === 'update') {
        if (!result.eventId && result.candidateIds && result.candidateIds.length > 1) {
            const titles = events
                .filter(e => result.candidateIds?.includes(e.id))
                .map(e => `• ${e.title}`)
                .join('\n');
            return `Found multiple matching events. Please be more specific:\n${titles}`;
        }
        const eventId = result.eventId ?? result.candidateIds?.[0];
        if (!eventId) {
            return "I couldn't find a matching event to update. Try being more specific.";
        }
        const existing = events.find(e => e.id === eventId);
        const title = existing?.title ?? 'that event';
        const changeSummary = buildChangeSummary(result.changes, timezone);
        const prompt = `Update "${title}"${changeSummary}?\n\nReply YES to confirm or NO to cancel.`;
        pendingConfirmations.set(phone, {
            action: { type: 'update', eventId, changes: result.changes },
            prompt,
            expiresAt: Date.now() + PENDING_TTL_MS,
        });
        return prompt;
    }

    if (result.intent === 'delete') {
        if (!result.eventId && result.candidateIds && result.candidateIds.length > 1) {
            const titles = events
                .filter(e => result.candidateIds?.includes(e.id))
                .map(e => `• ${e.title}`)
                .join('\n');
            return `Found multiple matching events. Please be more specific:\n${titles}`;
        }
        const eventId = result.eventId ?? result.candidateIds?.[0];
        if (!eventId) {
            return "I couldn't find a matching event to delete. Try being more specific.";
        }
        const existing = events.find(e => e.id === eventId);
        const title = existing?.title ?? 'that event';
        const prompt = `Delete "${title}"?\n\nReply YES to confirm or NO to cancel.`;
        pendingConfirmations.set(phone, {
            action: { type: 'delete', eventId, title },
            prompt,
            expiresAt: Date.now() + PENDING_TTL_MS,
        });
        return prompt;
    }

    return "Sorry, I didn't understand that. Try 'What's on my calendar?' or 'Add meeting Friday at 2pm'.";
}

// ── Execute confirmed action ─────────────────────────────────────────────────

async function executePendingAction(action: PendingAction, userId: string): Promise<string> {
    if (action.type === 'create') {
        const evt = action.data;
        const event = new Event();
        event.title = evt.title;
        event.startTime = evt.startTime;
        event.endTime = evt.endTime;
        event.duration = evt.duration;
        event.isAllDay = evt.isAllDay;
        event.location = evt.location;
        event.userId = userId;
        if (evt.rrule) event.rrule = evt.rrule;
        await validateOrReject(event);
        const saved = await eventService.create(event);
        return `Done! "${saved.title}" has been added to your calendar.`;
    }

    if (action.type === 'update') {
        const updates: Partial<Event> = {};
        if (action.changes.title) updates.title = action.changes.title;
        if (action.changes.location !== undefined) updates.location = action.changes.location;
        if (action.changes.startTime) updates.startTime = action.changes.startTime;
        if (action.changes.endTime) updates.endTime = action.changes.endTime;
        if (action.changes.duration) updates.duration = action.changes.duration;
        const updated = await eventService.update(action.eventId, updates);
        return `Done! "${updated.title}" has been updated.`;
    }

    if (action.type === 'delete') {
        await eventService.delete(action.eventId);
        return `Done! "${action.title}" has been deleted.`;
    }

    return 'Action completed.';
}

function buildChangeSummary(changes: UpdateIntentResult['changes'], timezone: string): string {
    const parts: string[] = [];
    if (changes.title) parts.push(`rename to "${changes.title}"`);
    if (changes.startTime) parts.push(`move to ${moment(changes.startTime).tz(timezone).format('ddd MMM D [at] h:mm A')}`);
    if (changes.location !== undefined) parts.push(`location: ${changes.location || '(none)'}`);
    return parts.length > 0 ? ' — ' + parts.join(', ') : '';
}
