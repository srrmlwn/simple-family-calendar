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
import { AgentService } from '../services/agentService';
import { validateSignature, normalizePhone, twimlReply, downloadTwilioMedia } from '../services/twilioService';
import { extractEventsFromBuffer, FlyerEvent } from './flyerController';
import {
    getActiveSession,
    extractHistory,
    upsertTurn,
    storePendingToolCall,
    clearPendingToolCall,
    createSession,
} from '../services/conversationService';

const eventService = new EventService();
const agentSvc = new AgentService(process.env.ANTHROPIC_API_KEY || '');

// MIME types we accept from WhatsApp media
const SUPPORTED_WHATSAPP_MEDIA_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

// ── Format events into a human-readable WhatsApp summary ─────────────────────

function formatEventsForWhatsApp(events: FlyerEvent[], timezone: string): string {
    return events
        .map((e, i) => {
            const start = moment(e.startTime).tz(timezone);
            const dateStr = e.isAllDay
                ? start.format('ddd, MMM D')
                : start.format('ddd, MMM D [at] h:mm A');
            const loc = e.location ? ` @ ${e.location}` : '';
            const members = e.familyMemberNames?.length ? ` (${e.familyMemberNames.join(', ')})` : '';
            return `${i + 1}. ${e.title} – ${dateStr}${loc}${members}`;
        })
        .join('\n');
}

// ── Handle an inbound media attachment ───────────────────────────────────────

async function handleMediaAttachment(
    mediaUrl: string,
    mediaContentType: string,
    user: User,
    timezone: string,
    familyMembers: FamilyMember[],
    sessionId: string | undefined
): Promise<void | string> {
    // Unsupported type
    if (!SUPPORTED_WHATSAPP_MEDIA_TYPES.has(mediaContentType)) {
        if (mediaContentType === 'application/msword') {
            return 'Old Word format (.doc) is not supported. Please save the file as .docx and send it again.';
        }
        return 'Sorry, I can only read images, PDFs, and Word documents (.docx). Please send one of those file types.';
    }

    let buffer: Buffer;
    try {
        buffer = await downloadTwilioMedia(mediaUrl);
    } catch {
        return "Sorry, I couldn't download your file. Please try again.";
    }

    const familyMemberNames = familyMembers.map(m => m.name);
    let events: FlyerEvent[];
    try {
        events = await extractEventsFromBuffer(buffer, mediaContentType, familyMemberNames, timezone, user.id);
    } catch {
        return "Sorry, I couldn't read that file. Try sending a clearer image or a different file.";
    }

    if (events.length === 0) {
        return "No events found in that document. Try a clearer image or a different file.";
    }

    // Build confirmation prompt
    const eventList = formatEventsForWhatsApp(events, timezone);
    const plural = events.length === 1 ? 'event' : 'events';
    const confirmPrompt =
        `Found ${events.length} ${plural}:\n\n${eventList}\n\n` +
        `Reply YES to add all to your calendar, or NO to cancel.`;

    // Store as pending batch creation
    const sid = sessionId ?? (await createSession(user.id, 'whatsapp')).id;
    await storePendingToolCall(sid, {
        toolName: 'create_events_batch',
        toolInput: {
            events: events.map(e => ({
                title: e.title,
                start_time: e.startTime,
                end_time: e.endTime,
                is_all_day: e.isAllDay,
                location: e.location,
                family_member_names: e.familyMemberNames,
            })),
        },
        confirmationPrompt: confirmPrompt,
    });

    return confirmPrompt;
}

// ── Main handler ─────────────────────────────────────────────────────────────

export async function handleTwilioWebhook(req: Request, res: Response): Promise<void> {
    // 1. Validate Twilio signature
    if (!validateSignature(req)) {
        res.status(403).send('Forbidden');
        return;
    }

    const rawBody = req.body as Record<string, string>;
    const rawFrom: string = rawBody.From ?? '';
    const body: string    = (rawBody.Body ?? '').trim();
    const numMedia        = parseInt(rawBody.NumMedia ?? '0', 10);
    const phone = normalizePhone(rawFrom);

    // 2. Look up user by phone number
    const userRepo = AppDataSource.getRepository(User);
    const user     = await userRepo.findOne({ where: { phoneNumber: phone } });

    if (!user) {
        res.type('text/xml').send(
            twimlReply(
                "Hi! I'm your kinroo.ai assistant, but this number isn't linked to an account yet. " +
                "Log in at kinroo.ai, go to Settings, and add your phone number to get started."
            )
        );
        return;
    }

    // 3. Load user settings (for timezone)
    const settingsRepo = AppDataSource.getRepository(UserSettings);
    const settings     = await settingsRepo.findOne({ where: { userId: user.id } });
    const timezone     = settings?.timezone ?? 'America/New_York';

    // 4. Load conversation session (provides context + pending tool call state)
    const session = await getActiveSession(user.id, 'whatsapp');
    const history = extractHistory(session);

    // 5. Handle YES/NO for a pending confirmation (stored in DB session, not in-memory)
    const pending = session?.pendingToolCall;
    if (pending) {
        const upper = body.toUpperCase();

        if (upper === 'YES' || upper === 'Y') {
            // Mark the most recent unconfirmed LLM call as confirmed (telemetry)
            AppDataSource.getRepository(LLMCall)
                .createQueryBuilder().update()
                .set({ confirmed: true })
                .where("user_id = :uid AND confirmed IS NULL AND created_at > NOW() - INTERVAL '10 minutes'", { uid: user.id })
                .orderBy('created_at', 'DESC').limit(1).execute().catch(() => {});

            // Fetch family members for execution
            const fmRepo = AppDataSource.getRepository(FamilyMember);
            const familyMembers = await fmRepo.find({ where: { userId: user.id } });

            let reply: string;
            try {
                reply = await agentSvc.executePendingAction(pending, user.id, timezone, familyMembers);
            } catch {
                reply = 'Sorry, something went wrong executing that action. Please try again.';
            }

            if (session) await clearPendingToolCall(session.id).catch(() => {});
            upsertTurn(user.id, 'whatsapp', body, reply, session?.id).catch(() => {});
            res.type('text/xml').send(twimlReply(reply));
            return;

        } else if (upper === 'NO' || upper === 'N') {
            // Mark as rejected (telemetry)
            AppDataSource.getRepository(LLMCall)
                .createQueryBuilder().update()
                .set({ confirmed: false })
                .where("user_id = :uid AND confirmed IS NULL AND created_at > NOW() - INTERVAL '10 minutes'", { uid: user.id })
                .orderBy('created_at', 'DESC').limit(1).execute().catch(() => {});

            const reply = 'Cancelled.';
            if (session) await clearPendingToolCall(session.id).catch(() => {});
            upsertTurn(user.id, 'whatsapp', body, reply, session?.id).catch(() => {});
            res.type('text/xml').send(twimlReply(reply));
            return;

        } else {
            // Treat as new command — clear stale pending
            if (session) clearPendingToolCall(session.id).catch(() => {});
        }
    }

    // 6. Handle media attachment (images, PDF, DOCX)
    if (numMedia > 0) {
        const mediaUrl         = rawBody.MediaUrl0 ?? '';
        const mediaContentType = rawBody.MediaContentType0 ?? '';

        if (!mediaUrl) {
            res.type('text/xml').send(twimlReply("Sorry, I couldn't access the attachment. Please try again."));
            return;
        }

        // Warn if they sent multiple files (we only process the first)
        const multipleNote = numMedia > 1
            ? `\n\n(Note: I can only process one attachment at a time. I'll look at the first one.)`
            : '';

        const fmRepo        = AppDataSource.getRepository(FamilyMember);
        const familyMembers = await fmRepo.find({ where: { userId: user.id } });

        const reply = await handleMediaAttachment(
            mediaUrl, mediaContentType, user, timezone, familyMembers, session?.id
        );

        const finalReply = typeof reply === 'string' ? reply + multipleNote : 'Something went wrong. Please try again.';
        upsertTurn(user.id, 'whatsapp', `[attachment: ${mediaContentType}]`, finalReply, session?.id).catch(() => {});
        res.type('text/xml').send(twimlReply(finalReply));
        return;
    }

    // 7. Text-only message: fetch user events for agent context (−7 → +90 days)
    const contextStart = moment().subtract(7, 'days').toDate();
    const contextEnd   = moment().add(90, 'days').toDate();
    const userEvents   = await eventService.findByUserIdAndDateRange(user.id, contextStart, contextEnd, timezone);
    const eventsForContext = userEvents as Event[];

    // 8. Fetch family members
    const fmRepo        = AppDataSource.getRepository(FamilyMember);
    const familyMembers = await fmRepo.find({ where: { userId: user.id } });

    // 9. Run agent
    let result;
    try {
        result = await agentSvc.run({
            message: body,
            userId: user.id,
            timezone,
            channel: 'whatsapp',
            history,
            preloadedEvents: eventsForContext,
            familyMembers,
        });
    } catch {
        const errReply = "Sorry, I couldn't process that. Try 'What's on my calendar this week?' or 'Add dentist Tuesday at 3pm'.";
        upsertTurn(user.id, 'whatsapp', body, errReply, session?.id).catch(() => {});
        res.type('text/xml').send(twimlReply(errReply));
        return;
    }

    // 10. If a mutating op needs confirmation: store pending in DB, send prompt
    if (result.pendingAction) {
        const sid = session?.id ?? (await createSession(user.id, 'whatsapp')).id;
        await storePendingToolCall(sid, result.pendingAction).catch(() => {});
        upsertTurn(user.id, 'whatsapp', body, result.reply, session?.id ?? sid).catch(() => {});
        res.type('text/xml').send(twimlReply(result.reply));
        return;
    }

    // 11. Regular response: persist turn, send reply
    upsertTurn(user.id, 'whatsapp', body, result.reply, session?.id).catch(() => {});
    res.type('text/xml').send(twimlReply(result.reply));
}
