// src/controllers/emailIngestController.ts
import { Request, Response } from 'express';
import { AppDataSource } from '../data-source';
import { User } from '../entities/User';
import { UserSettings } from '../entities/UserSettings';
import { FamilyMember } from '../entities/FamilyMember';
import { AgentService } from '../services/agentService';
import { sendWhatsAppMessage } from '../services/twilioService';
import emailService from '../services/emailService';
import {
    getActiveSession,
    createSession,
    clearPendingToolCall,
    storePendingToolCall,
    upsertTurn,
} from '../services/conversationService';
import {
    extractEmailAddress,
    extractBodyText,
    extractFromPDF,
    extractFromImage,
    extractFromICS,
    parseEventsFromContent,
    buildConfirmationMessage,
    CandidateEvent,
} from '../services/emailIngestService';

const agentSvc = new AgentService(process.env.ANTHROPIC_API_KEY || '');

// ── Webhook secret check ───────────────────────────────────────────────────────
function validateWebhookSecret(req: Request): boolean {
    const secret = process.env.SENDGRID_INBOUND_WEBHOOK_SECRET;
    if (!secret) return true; // Dev mode — no secret configured, allow all
    return req.query['secret'] === secret;
}

// ── Main handler ───────────────────────────────────────────────────────────────

export async function handleEmailIngest(req: Request, res: Response): Promise<void> {
    // Always respond 200 quickly to the webhook provider
    res.status(200).send('OK');

    if (!validateWebhookSecret(req)) {
        console.warn('emailIngest: invalid webhook secret');
        return;
    }

    // ── 1. Parse inbound email fields ────────────────────────────────────────
    const body = req.body as Record<string, string>;
    const rawFrom   = body['from']    ?? '';
    const subject   = body['subject'] ?? '(no subject)';
    const textBody  = body['text']    ?? '';
    const htmlBody  = body['html']    ?? '';

    const senderEmail = extractEmailAddress(rawFrom);
    if (!senderEmail) return;

    // ── 2. Identify user ─────────────────────────────────────────────────────
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { email: senderEmail } });

    if (!user) {
        // Unknown sender — reply with a helpful message
        await emailService.sendEmail({
            to: { name: rawFrom, address: senderEmail },
            subject: `Re: ${subject}`,
            text: "Hi! This email address isn't linked to a famcal.ai account. Sign up or log in at famcal.ai to start forwarding events to your calendar.",
            html: "<p>Hi! This email address isn't linked to a famcal.ai account. Sign up or log in at <a href=\"https://famcal.ai\">famcal.ai</a> to start forwarding events to your calendar.</p>",
        }).catch(err => void err);
        return;
    }

    const settingsRepo = AppDataSource.getRepository(UserSettings);
    const settings     = await settingsRepo.findOne({ where: { userId: user.id } });
    const timezone     = settings?.timezone ?? 'America/New_York';

    // Determine which channel to store the pending confirmation on:
    // whatsapp → existing webhookController handles YES/NO
    // email    → this controller handles YES/NO on the next inbound email
    const confirmChannel = user.phoneNumber ? 'whatsapp' : 'email';

    // ── 3. Check for YES/NO reply to a pending confirmation ──────────────────
    if (confirmChannel === 'email') {
        const activeSession = await getActiveSession(user.id, 'email');
        const pending = activeSession?.pendingToolCall;

        if (pending) {
            // Strip any quoted text — just look at the first non-empty line
            const firstLine = textBody.split('\n').map(l => l.trim()).find(l => l.length > 0) ?? '';
            const upper = firstLine.toUpperCase();

            if (upper === 'YES' || upper === 'Y') {
                let reply: string;
                try {
                    reply = await agentSvc.executePendingAction(pending, user.id, timezone,
                        await AppDataSource.getRepository(FamilyMember).find({ where: { userId: user.id } }));
                } catch {
                    reply = 'Something went wrong adding those events. Please try again.';
                }
                if (activeSession) await clearPendingToolCall(activeSession.id).catch(err => void err);
                upsertTurn(user.id, 'email', firstLine, reply, activeSession?.id).catch(err => void err);
                await emailService.sendEmail({
                    to: { name: `${user.firstName} ${user.lastName}`, address: senderEmail },
                    subject: `Re: ${subject}`,
                    text: reply,
                    html: `<p>${reply.replace(/\n/g, '<br>')}</p>`,
                }).catch(err => void err);
                return;
            }

            if (upper === 'NO' || upper === 'N') {
                const reply = "Got it, nothing added.";
                if (activeSession) await clearPendingToolCall(activeSession.id).catch(err => void err);
                upsertTurn(user.id, 'email', firstLine, reply, activeSession?.id).catch(err => void err);
                await emailService.sendEmail({
                    to: { name: `${user.firstName} ${user.lastName}`, address: senderEmail },
                    subject: `Re: ${subject}`,
                    text: reply,
                    html: `<p>${reply}</p>`,
                }).catch(err => void err);
                return;
            }

            // Not a YES/NO — treat as a fresh forward, clear the stale pending
            await clearPendingToolCall(activeSession.id).catch(err => void err);
        }
    }

    // ── 4. Extract content from email body + attachments ─────────────────────
    const bodyText = extractBodyText(textBody, htmlBody);
    const contentParts: string[] = [];
    if (bodyText) contentParts.push(bodyText);

    // Process file attachments (uploaded by multer as req.files)
    const files = (req.files as Express.Multer.File[]) ?? [];
    for (const file of files) {
        const mime = file.mimetype.toLowerCase();
        if (mime === 'application/pdf') {
            const pdfText = await extractFromPDF(file.buffer).catch(() => '');
            if (pdfText) contentParts.push(`[Attachment: ${file.originalname}]\n${pdfText}`);
        } else if (mime === 'text/calendar' || file.originalname.endsWith('.ics')) {
            const icsText = extractFromICS(file.buffer);
            if (icsText) contentParts.push(`[Calendar attachment: ${file.originalname}]\n${icsText}`);
        } else if (['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(mime)) {
            const imgText = await extractFromImage(file.buffer, mime).catch(() => '');
            if (imgText && imgText !== 'No events found.') contentParts.push(`[Image: ${file.originalname}]\n${imgText}`);
        }
    }

    const fullContent = contentParts.join('\n\n');

    if (!fullContent.trim()) {
        await emailService.sendEmail({
            to: { name: `${user.firstName} ${user.lastName}`, address: senderEmail },
            subject: `Re: ${subject}`,
            text: "Got your email, but it appears to be empty. Forward an email with event details (dates, times, descriptions) and I'll add them to your calendar.",
            html: "<p>Got your email, but it appears to be empty. Forward an email with event details (dates, times, descriptions) and I'll add them to your calendar.</p>",
        }).catch(err => void err);
        return;
    }

    // ── 5. Parse events ───────────────────────────────────────────────────────
    const fmRepo = AppDataSource.getRepository(FamilyMember);
    const familyMembers = await fmRepo.find({ where: { userId: user.id } });
    const familyMemberNames = familyMembers.map(m => m.name);

    let candidates: CandidateEvent[];
    try {
        candidates = await parseEventsFromContent(fullContent, subject, timezone, familyMemberNames, user.id);
    } catch {
        candidates = [];
    }

    if (candidates.length === 0) {
        await emailService.sendEmail({
            to: { name: `${user.firstName} ${user.lastName}`, address: senderEmail },
            subject: `Re: ${subject}`,
            text: "Got your email but couldn't find any calendar events in it. Try forwarding emails with dates and times, or attach a schedule PDF.",
            html: "<p>Got your email but couldn't find any calendar events in it. Try forwarding emails with dates and times, or attach a schedule PDF.</p>",
        }).catch(err => void err);
        return;
    }

    // ── 6. Build pending batch op + confirmation message ─────────────────────
    const batchOps = candidates.map(e => ({
        toolName: 'create_event',
        toolInput: {
            title:               e.title,
            start_time:          e.startTime,
            end_time:            e.endTime,
            is_all_day:          e.isAllDay,
            ...(e.location ? { location: e.location } : {}),
            ...(e.familyMemberNames?.length ? { family_member_names: e.familyMemberNames } : {}),
        },
    }));

    const confirmationMessage = buildConfirmationMessage(candidates, timezone);

    // Pending data — batchOps carries the real work; toolName/toolInput are stubs for compat
    const pendingData = {
        toolName: 'create_event',
        toolInput: {},
        confirmationPrompt: confirmationMessage,
        batchOps,
    };

    // Store pending in the appropriate channel's session
    const session = (await getActiveSession(user.id, confirmChannel))
        ?? (await createSession(user.id, confirmChannel));
    await storePendingToolCall(session.id, pendingData);
    upsertTurn(user.id, confirmChannel, `[email fwd] ${subject}`, confirmationMessage, session.id).catch(err => void err);

    // ── 7. Send confirmation ──────────────────────────────────────────────────
    if (user.phoneNumber) {
        // Confirmation via WhatsApp — webhookController handles YES/NO
        const whatsappMsg = `famcal.ai: ${confirmationMessage}`;
        await sendWhatsAppMessage(user.phoneNumber, whatsappMsg).catch(err =>
            console.error('emailIngest: WhatsApp send failed', err)
        );
    } else {
        // Confirmation via email reply
        await emailService.sendEmail({
            to: { name: `${user.firstName} ${user.lastName}`, address: senderEmail },
            subject: `Re: ${subject}`,
            text: confirmationMessage,
            html: `<p>${confirmationMessage.replace(/\n/g, '<br>')}</p>`,
        }).catch(err => console.error('emailIngest: email reply failed', err));
    }
}
