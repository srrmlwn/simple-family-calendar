// src/controllers/emailIngestController.ts
import { Request, Response } from 'express';
import { AppDataSource } from '../data-source';
import { User } from '../entities/User';
import { UserSettings } from '../entities/UserSettings';
import { FamilyMember } from '../entities/FamilyMember';
import { AgentService } from '../services/agentService';
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

const agentSvc = new AgentService(process.env.ANTHROPIC_API_KEY || '');

// ── Webhook secret check ───────────────────────────────────────────────────────
function validateWebhookSecret(req: Request): boolean {
    const secret = process.env.SENDGRID_INBOUND_WEBHOOK_SECRET;
    if (!secret) return true; // Dev mode — no secret configured, allow all
    return req.query['secret'] === secret;
}

// ── Confirmation email HTML ────────────────────────────────────────────────────
function buildConfirmationHtml(events: CandidateEvent[], timezone: string): string {
    const rows = events.map(e => {
        const start = e.isAllDay
            ? moment(e.startTime).tz(timezone).format('ddd, MMM D')
            : moment(e.startTime).tz(timezone).format('ddd, MMM D [at] h:mm A z');
        const loc = e.location ? `<br><span style="color:#6b7280;font-size:13px;">📍 ${e.location}</span>` : '';
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
          Forwarded to add@kinroo.ai · <a href="https://kinroo.ai" style="color:#6366f1;">kinroo.ai</a>
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
    return `${heading}\n\n${lines.join('\n')}\n\nView your calendar at https://kinroo.ai`;
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
    const rawFrom  = body['from']    ?? '';
    const subject  = body['subject'] ?? '(no subject)';
    const textBody = body['text']    ?? '';
    const htmlBody = body['html']    ?? '';

    const senderEmail = extractEmailAddress(rawFrom);
    if (!senderEmail) return;

    // ── 2. Identify user ─────────────────────────────────────────────────────
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { email: senderEmail } });

    if (!user) {
        await emailService.sendEmail({
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

    // ── 3. Extract content from email body + attachments ─────────────────────
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
            to: { name: `${user.firstName} ${user.lastName}`, address: senderEmail },
            subject: `Re: ${subject}`,
            text: "Got your email, but it appears to be empty. Forward an email with event details (dates, times, descriptions) and I'll add them to your calendar.",
            html: "<p>Got your email, but it appears to be empty. Forward an email with event details (dates, times, descriptions) and I'll add them to your calendar.</p>",
        }).catch(err => void err);
        return;
    }

    // ── 4. Parse events ───────────────────────────────────────────────────────
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

    // ── 5. Create events directly ─────────────────────────────────────────────
    const batchOps = candidates.map(e => ({
        toolName: 'create_event',
        toolInput: {
            title:       e.title,
            start_time:  e.startTime,
            end_time:    e.endTime,
            is_all_day:  e.isAllDay,
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
            to: { name: `${user.firstName} ${user.lastName}`, address: senderEmail },
            subject: `Re: ${subject}`,
            text: 'Something went wrong adding your events. Please try again or add them manually at kinroo.ai.',
            html: '<p>Something went wrong adding your events. Please try again or add them manually at <a href="https://kinroo.ai">kinroo.ai</a>.</p>',
        }).catch(err2 => void err2);
        return;
    }

    // ── 6. Send confirmation ──────────────────────────────────────────────────
    await emailService.sendEmail({
        to: { name: `${user.firstName} ${user.lastName}`, address: senderEmail },
        subject: `Added to your calendar: ${candidates.length === 1 ? candidates[0].title : `${candidates.length} events`}`,
        text: buildConfirmationText(candidates, timezone),
        html: buildConfirmationHtml(candidates, timezone),
    }).catch(err => console.error('emailIngest: confirmation email failed', err));
}
