// src/controllers/emailIngestController.ts
import { Request, Response } from 'express';
import { AppDataSource } from '../data-source';
import { User } from '../entities/User';
import { UserSettings } from '../entities/UserSettings';
import { FamilyMember } from '../entities/FamilyMember';
import { Event } from '../entities/Event';
import { AgentService } from '../services/agentService';
import { EventService } from '../services/eventService';
import emailService from '../services/emailService';
import moment from 'moment-timezone';
import {
    extractEmailAddress,
    extractBodyText,
    extractFromPDF,
    extractFromImage,
    extractFromICS,
    parseEventsFromContent,
    CandidateEvent,
} from '../services/emailIngestService';
import {
    getActiveSession,
    extractHistory,
    upsertTurn,
} from '../services/conversationService';

const agentSvc  = new AgentService(process.env.ANTHROPIC_API_KEY || '');
const eventSvc  = new EventService();

const INGEST_FROM = { name: 'kinroo.ai', address: 'add@kinroo.ai' };

// ── Webhook secret check ───────────────────────────────────────────────────────
function validateWebhookSecret(req: Request): boolean {
    const secret = process.env.SENDGRID_INBOUND_WEBHOOK_SECRET;
    if (!secret) return false; // fail closed — secret must be configured
    return req.query['secret'] === secret;
}

// ── Reply detection ───────────────────────────────────────────────────────────
// SendGrid provides raw headers as a newline-delimited string in req.body.headers
function isReplyEmail(headers: string, subject: string): boolean {
    if (/^in-reply-to:/im.test(headers)) return true;
    if (/^references:/im.test(headers)) return true;
    if (/^re:/i.test(subject.trim())) return true;
    return false;
}

// Strip quoted content — everything from "On ... wrote:" or lines starting with ">"
function stripQuotedContent(text: string): string {
    const lines = text.split('\n');
    const result: string[] = [];
    for (const line of lines) {
        if (/^>/.test(line.trim())) break;                          // quoted line
        if (/^on .+ wrote:$/i.test(line.trim())) break;            // Gmail/Outlook quote header
        if (/^-{3,}\s*original message\s*-{3,}/i.test(line)) break; // Outlook divider
        result.push(line);
    }
    return result.join('\n').trim();
}

// ── Confirmation email HTML ────────────────────────────────────────────────────
function buildConfirmationHtml(events: CandidateEvent[], timezone: string): string {
    const rows = events.map(e => {
        const start = e.isAllDay
            ? moment(e.startTime).tz(timezone).format('ddd, MMM D')
            : moment(e.startTime).tz(timezone).format('ddd, MMM D [at] h:mm A z');
        const loc = e.location
            ? `<br><span style="color:#6b7280;font-size:13px;">📍 ${e.location}</span>`
            : '';
        const members = e.familyMemberNames?.length
            ? `<br><span style="color:#6b7280;font-size:13px;">👤 ${e.familyMemberNames.join(', ')}</span>`
            : '';
        return `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #f3f4f6;">
            <div style="font-weight:600;color:#111827;font-size:15px;">${e.title}</div>
            <div style="color:#4b5563;font-size:13px;margin-top:2px;">🗓 ${start}${loc}${members}</div>
          </td>
        </tr>`;
    }).join('');

    const heading = events.length === 1
        ? '1 event added to your calendar'
        : `${events.length} events added to your calendar`;

    return `
    <div style="font-family:'Nunito',Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;">
      <div style="background:linear-gradient(135deg,#4f46e5,#6366f1);padding:24px 28px;border-radius:12px 12px 0 0;">
        <h2 style="margin:0;color:#fff;font-size:20px;">kinroo.ai</h2>
        <p style="margin:6px 0 0;color:#e0e7ff;font-size:14px;">Your calendar has been updated</p>
      </div>
      <div style="padding:24px 28px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
        <p style="font-size:16px;color:#111827;margin:0 0 16px;font-weight:600;">${heading}</p>
        <table style="width:100%;border-collapse:collapse;">${rows}</table>
        <div style="margin-top:24px;text-align:center;">
          <a href="https://kinroo.ai" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#6366f1);color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
            View Calendar →
          </a>
        </div>
        <p style="font-size:12px;color:#9ca3af;margin-top:24px;text-align:center;">
          Reply to this email to make changes · <a href="https://kinroo.ai" style="color:#6366f1;">kinroo.ai</a>
        </p>
      </div>
    </div>`;
}

function buildConfirmationText(events: CandidateEvent[], timezone: string): string {
    const lines = events.map(e => {
        const start = e.isAllDay
            ? moment(e.startTime).tz(timezone).format('ddd, MMM D')
            : moment(e.startTime).tz(timezone).format('ddd, MMM D [at] h:mm A z');
        const loc = e.location ? ` @ ${e.location}` : '';
        return `• ${e.title} — ${start}${loc}`;
    });
    const heading = events.length === 1 ? '1 event added:' : `${events.length} events added:`;
    return `${heading}\n\n${lines.join('\n')}\n\nReply to this email to make changes, or view at https://kinroo.ai`;
}

// ── Main handler ───────────────────────────────────────────────────────────────
export async function handleEmailIngest(req: Request, res: Response): Promise<void> {
    res.status(200).send('OK');

    if (!validateWebhookSecret(req)) {
        console.warn('emailIngest: invalid webhook secret');
        return;
    }

    // ── 1. Parse inbound email fields ────────────────────────────────────────
    const body     = req.body as Record<string, string>;
    const rawFrom  = body['from']    ?? '';
    const subject  = body['subject'] ?? '(no subject)';
    const textBody = body['text']    ?? '';
    const htmlBody = body['html']    ?? '';
    const headers  = body['headers'] ?? '';

    const senderEmail = extractEmailAddress(rawFrom);
    if (!senderEmail) return;

    // ── 2. Identify user ─────────────────────────────────────────────────────
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { email: senderEmail } });

    if (!user) {
        await emailService.sendEmail({
            from: INGEST_FROM,
            to: { name: rawFrom, address: senderEmail },
            subject: `Re: ${subject}`,
            text: "Hi! This email address isn't linked to a kinroo.ai account. Sign up or log in at kinroo.ai to start forwarding events to your calendar.",
            html: "<p>Hi! This email address isn't linked to a kinroo.ai account. Sign up or log in at <a href=\"https://kinroo.ai\">kinroo.ai</a> to start forwarding events to your calendar.</p>",
        }).catch(err => void err);
        return;
    }

    const settingsRepo = AppDataSource.getRepository(UserSettings);
    const settings     = await settingsRepo.findOne({ where: { userId: user.id } });
    const timezone     = settings?.timezone ?? 'America/New_York';
    const fmRepo       = AppDataSource.getRepository(FamilyMember);
    const familyMembers = await fmRepo.find({ where: { userId: user.id } });

    // ── 3. Reply path — route through agent for edits ────────────────────────
    if (isReplyEmail(headers, subject)) {
        const instruction = stripQuotedContent(extractBodyText(textBody, htmlBody));
        if (!instruction) return;

        // Load conversation history so the agent knows what was previously added/discussed
        const session = await getActiveSession(user.id, 'email');
        const history = extractHistory(session);

        // Load upcoming events so the agent can find and edit them
        const contextStart = moment().subtract(7, 'days').toDate();
        const contextEnd   = moment().add(90, 'days').toDate();
        const upcomingEvents = await eventSvc.findByUserIdAndDateRange(
            user.id, contextStart, contextEnd, timezone
        ) as Event[];

        let agentReply: string;
        try {
            const result = await agentSvc.run({
                message: instruction,
                userId: user.id,
                timezone,
                channel: 'email',
                history,
                preloadedEvents: upcomingEvents,
                familyMembers,
            });
            agentReply = result.reply;
        } catch {
            agentReply = 'Something went wrong processing your request. Please try again or edit the event at kinroo.ai.';
        }

        // Persist this turn so the next reply has full context
        upsertTurn(user.id, 'email', instruction, agentReply, session?.id).catch(() => {});

        await emailService.sendEmail({
            from: INGEST_FROM,
            to: { name: `${user.firstName} ${user.lastName}`, address: senderEmail },
            subject: `Re: ${subject}`,
            text: agentReply,
            html: `<div style="font-family:'Nunito',Arial,sans-serif;max-width:600px;margin:0 auto;">
              <p style="color:#111827;">${agentReply.replace(/\n/g, '<br>')}</p>
              <p style="font-size:12px;color:#9ca3af;margin-top:24px;">
                <a href="https://kinroo.ai" style="color:#6366f1;">View calendar at kinroo.ai</a>
              </p>
            </div>`,
        }).catch(err => console.error('emailIngest: reply response failed', err));
        return;
    }

    // ── 4. Forward path — extract content from body + attachments ────────────
    const bodyText = extractBodyText(textBody, htmlBody);
    const contentParts: string[] = [];
    if (bodyText) contentParts.push(bodyText);

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
            from: INGEST_FROM,
            to: { name: `${user.firstName} ${user.lastName}`, address: senderEmail },
            subject: `Re: ${subject}`,
            text: "Got your email, but it appears to be empty. Forward an email with event details (dates, times, descriptions) and I'll add them to your calendar.",
            html: "<p>Got your email, but it appears to be empty. Forward an email with event details (dates, times, descriptions) and I'll add them to your calendar.</p>",
        }).catch(err => void err);
        return;
    }

    // ── 5. Parse events ───────────────────────────────────────────────────────
    const familyMemberNames = familyMembers.map(m => m.name);
    let candidates: CandidateEvent[];
    try {
        candidates = await parseEventsFromContent(fullContent, subject, timezone, familyMemberNames, user.id);
    } catch {
        candidates = [];
    }

    if (candidates.length === 0) {
        await emailService.sendEmail({
            from: INGEST_FROM,
            to: { name: `${user.firstName} ${user.lastName}`, address: senderEmail },
            subject: `Re: ${subject}`,
            text: "Got your email but couldn't find any calendar events in it. Try forwarding emails with dates and times, or attach a schedule PDF.",
            html: "<p>Got your email but couldn't find any calendar events in it. Try forwarding emails with dates and times, or attach a schedule PDF.</p>",
        }).catch(err => void err);
        return;
    }

    // ── 6. Create events ──────────────────────────────────────────────────────
    const batchOps = candidates.map(e => ({
        toolName: 'create_event',
        toolInput: {
            title:      e.title,
            start_time: e.startTime,
            end_time:   e.endTime,
            is_all_day: e.isAllDay,
            ...(e.location ? { location: e.location } : {}),
            ...(e.familyMemberNames?.length ? { family_member_names: e.familyMemberNames } : {}),
        },
    }));

    try {
        await agentSvc.executePendingAction(
            { toolName: 'create_event', toolInput: {}, confirmationPrompt: '', batchOps },
            user.id,
            timezone,
            familyMembers,
        );
    } catch (err) {
        console.error('emailIngest: failed to create events', err);
        await emailService.sendEmail({
            from: INGEST_FROM,
            to: { name: `${user.firstName} ${user.lastName}`, address: senderEmail },
            subject: `Re: ${subject}`,
            text: 'Something went wrong adding your events. Please try again or add them manually at kinroo.ai.',
            html: '<p>Something went wrong adding your events. Please try again or add them manually at <a href="https://kinroo.ai">kinroo.ai</a>.</p>',
        }).catch(err2 => void err2);
        return;
    }

    // ── 7. Seed session so reply has context ──────────────────────────────────
    // Store a turn summarising what was added — this becomes the conversation
    // history the agent sees when the user replies to make changes.
    const confirmationSummary = buildConfirmationText(candidates, timezone);
    upsertTurn(user.id, 'email', `[forwarded email: ${subject}]`, confirmationSummary).catch(() => {});

    // ── 8. Send confirmation ──────────────────────────────────────────────────
    await emailService.sendEmail({
        from: INGEST_FROM,
        to: { name: `${user.firstName} ${user.lastName}`, address: senderEmail },
        subject: `Added to your calendar: ${candidates.length === 1 ? candidates[0].title : `${candidates.length} events`}`,
        text: confirmationSummary,
        html: buildConfirmationHtml(candidates, timezone),
    }).catch(err => console.error('emailIngest: confirmation email failed', err));
}
