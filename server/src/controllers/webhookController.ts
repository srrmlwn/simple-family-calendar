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
import { validateSignature, normalizePhone, twimlReply } from '../services/twilioService';
import {
    getActiveSession,
    extractHistory,
    upsertTurn,
    storePendingToolCall,
    clearPendingToolCall,
} from '../services/conversationService';

const eventService = new EventService();
const agentSvc = new AgentService(process.env.ANTHROPIC_API_KEY || '');

// ── Main handler ─────────────────────────────────────────────────────────────

export async function handleTwilioWebhook(req: Request, res: Response): Promise<void> {
    // 1. Validate Twilio signature
    if (!validateSignature(req)) {
        res.status(403).send('Forbidden');
        return;
    }

    const rawFrom: string = (req.body as Record<string, string>).From ?? '';
    const body: string    = ((req.body as Record<string, string>).Body ?? '').trim();
    const phone = normalizePhone(rawFrom);

    // 2. Look up user by phone number
    const userRepo = AppDataSource.getRepository(User);
    const user     = await userRepo.findOne({ where: { phoneNumber: phone } });

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

    // 6. Fetch user events for agent context (−7 → +90 days)
    const contextStart = moment().subtract(7, 'days').toDate();
    const contextEnd   = moment().add(90, 'days').toDate();
    const userEvents   = await eventService.findByUserIdAndDateRange(user.id, contextStart, contextEnd, timezone);
    const eventsForContext = userEvents as Event[];

    // 7. Fetch family members
    const fmRepo        = AppDataSource.getRepository(FamilyMember);
    const familyMembers = await fmRepo.find({ where: { userId: user.id } });

    // 8. Run agent
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

    // 9. If a mutating op needs confirmation: store pending in DB, send prompt
    if (result.pendingAction) {
        const sid = session?.id ?? (await import('../services/conversationService')
            .then(m => m.createSession(user.id, 'whatsapp'))).id;
        await storePendingToolCall(sid, result.pendingAction).catch(() => {});
        // Persist the user message (assistant message is the confirmation prompt)
        upsertTurn(user.id, 'whatsapp', body, result.reply, session?.id ?? sid).catch(() => {});
        res.type('text/xml').send(twimlReply(result.reply));
        return;
    }

    // 10. Regular response: persist turn, send reply
    upsertTurn(user.id, 'whatsapp', body, result.reply, session?.id).catch(() => {});
    res.type('text/xml').send(twimlReply(result.reply));
}
