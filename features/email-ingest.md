# Feature Spec: Email Ingest ("Forward to famcal")

_Status: 🎯 Next to build_

---

## What It Does

Users forward any email to `add@famcal.ai`. The server identifies the user by the sender's `From` address, extracts calendar events from the email body and attachments, and asks for confirmation via WhatsApp (or email reply if no phone linked). The user says YES and the events are on their calendar.

**The magic moment:** forward the school's soccer schedule PDF to `add@famcal.ai` while in Gmail. Get a WhatsApp ping 10 seconds later: "Found 8 soccer games. Add them all? YES/NO"

---

## User Flow

### Setup (one-time)
None required. As long as the user registered with the email address they're forwarding from, it just works. Optionally, surfaced in onboarding: "Forward any email to add@famcal.ai to add events instantly."

### Happy path — single event

```
User forwards: "Reminder: Sasha's dentist Thursday March 12 at 2pm, Ballard Pediatrics"
  → to: add@famcal.ai

FamCal replies (WhatsApp or email):
  "Got your email. Found 1 event:

   Dentist Appointment
   Thu Mar 12 at 2:00 PM
   📍 Ballard Pediatrics

   Reply YES to add it, NO to skip."

User: YES

FamCal: "✓ Added 'Dentist Appointment' on Thu Mar 12 at 2:00 PM. View your calendar: https://famcal.ai"
```

### Happy path — multiple events (e.g. soccer season schedule)

```
User forwards: soccer season schedule email (12 games listed)

FamCal:
  "Got your email. Found 8 events (4 already on your calendar):

   • Soccer Game — Sat Mar 15, 10:00 AM, Magnuson Park
   • Soccer Game — Sat Mar 22, 10:00 AM, Magnuson Park
   • Soccer Game — Sat Apr 5, 10:00 AM, Magnuson Park
   ... (5 more)

   Reply YES to add all 8, NO to skip."

User: YES

FamCal: "✓ Added 8 soccer games to your calendar."
```

### Happy path — attachment (PDF or image flyer)

The server extracts content from attached PDFs and images (via OpenAI vision) and treats them the same as the email body. The user doesn't need to do anything different.

### Unknown sender

```
FamCal replies (to the From address):
  "Hi! This email address isn't linked to a famcal.ai account.
   Sign up or log in at famcal.ai to start forwarding events."
```

### No events found

```
FamCal replies:
  "Got your email but couldn't find any calendar events in it.
   Try forwarding emails with dates and times, or attach a schedule PDF."
```

### Family member sender (v2)

If the `From` address matches a record in `email_recipients`, route events to that recipient's primary user account. E.g., the other parent forwards from their email and it goes to the shared family calendar.

---

## Files Touched

### New
- `server/src/controllers/emailIngestController.ts` — main handler
- `server/src/services/emailIngestService.ts` — content extraction + event parsing
- `server/src/routes/emailIngest.ts` — `POST /api/email/inbound` (no auth middleware — inbound webhook)

### Modified
- `server/src/app.ts` — mount `/api/email` route
- `server/src/services/agentService.ts` — add `'email'` to the `channel` union type
- `server/src/services/emailService.ts` — add `sendConfirmationRequest()` and `sendConfirmationSuccess()` helpers for email-channel replies
- `server/src/services/conversationService.ts` — ensure `getActiveSession` supports `channel: 'email'`

### No DB migration needed
The `conversation_sessions` table already has a `channel` column (text). Adding `'email'` as a value requires no schema change.

---

## Technical Architecture

### Inbound Email Provider

Use **SendGrid Inbound Parse**. It parses the raw MIME email and POSTs a structured payload to our webhook URL. Mailgun and Postmark work identically — the abstraction is the same.

Setup:
1. Add MX record: `add.famcal.ai MX 10 mx.sendgrid.net`
2. Configure SendGrid Inbound Parse to forward to `POST https://famcal.ai/api/email/inbound`
3. Set `SENDGRID_WEBHOOK_SECRET` env var for signature verification

The inbound webhook payload includes:
- `from` — sender address (used for user lookup)
- `subject` — email subject
- `text` — plain text body
- `html` — HTML body
- `attachments` — count
- `attachment-info` — JSON metadata
- `attachment1`, `attachment2`, ... — raw file buffers (multipart form)

### User Identification

```
From header → extract email address → look up users.email
If not found → check email_recipients.email → get primary user (v2)
If still not found → send "no account" reply to From address, stop
```

### Content Extraction

`emailIngestService.extractContent(payload)` builds a single content string for the agent:

1. **Email body**: use `text` field; fall back to stripping HTML from `html` field
2. **`.ics` attachments**: parse directly with `ical.js` or `node-ical` — no LLM needed, convert to candidate events immediately
3. **PDF attachments**: extract text via `pdf-parse` npm package; append to content
4. **Image attachments** (JPG/PNG): send to OpenAI vision with prompt "Extract all calendar events from this image"; append returned text to content
5. **Other attachments**: skip silently

Subject line is prepended to content as context: `"Subject: ${subject}\n\n${body}"`.

### Event Parsing

Pass the extracted content string to `AgentService.run()` with `channel: 'email'`. The agent uses the same `create_event` tool loop as WhatsApp.

The system prompt should include extra instruction for email context:
> "This content was forwarded via email. Extract all calendar events you can find. If there are multiple events (e.g. a season schedule), extract all of them. Ignore marketing or promotional content."

### Deduplication

Before composing the confirmation message, check each candidate event against existing events (same title + within 1 hour of start time, or same date for all-day events). Flag duplicates in the confirmation message ("4 already on your calendar") but still include them — user decides.

### Confirmation Routing

```
if user.phoneNumber is set AND Twilio/WhatsApp is configured:
    send WhatsApp message via existing twilioService
    store pendingToolCall in conversation_sessions (channel: 'email')
    user replies YES/NO via WhatsApp → existing webhook handler resolves it
else:
    reply to the From email address
    store pendingToolCall in conversation_sessions (channel: 'email')
    parse YES/NO from reply email → same inbound webhook resolves it
```

For email-channel YES/NO, the inbound handler checks if the email body (stripped) is just "YES" or "NO" and if there's an active pending session for that user on channel `'email'`.

### Batch Confirmation

When multiple events are found, store them all as a single `pendingToolCall` with an array of create operations. YES executes all of them. NO cancels all.

For very large lists (>10 events), cap the preview at 5 with "... and N more" — the full list is in the pending state.

---

## Acceptance Criteria

1. Forwarding an email from a registered address to `add@famcal.ai` triggers a confirmation message
2. Confirmation is delivered via WhatsApp if phone is linked, email reply otherwise
3. Replying YES adds all extracted events to the calendar
4. Replying NO cancels with "Got it, nothing added."
5. PDF attachments with event schedules are parsed correctly
6. Image attachments (flyers) are parsed correctly via vision
7. `.ics` attachments are imported without LLM parsing
8. Forwarded email from unknown address gets the "no account" reply email
9. Email with no extractable events gets the "couldn't find events" reply
10. Duplicate detection: events already on the calendar are flagged in the confirmation message

---

## Security Considerations

- Validate SendGrid webhook signature on every inbound POST (use `x-twilio-email-event-webhook-signature` or equivalent) — reject unsigned requests with 403
- The `/api/email/inbound` route must NOT have `authenticateToken` middleware (it's a webhook, not a user session), but MUST have signature verification instead
- Rate-limit by `From` address: max 10 inbound emails per user per hour to prevent abuse
- Strip any executable content from attachments — only read text, PDF text layer, and images
- Do not log full email body if it contains PII patterns — log only sender, subject, attachment types, and event count

---

## Environment Variables

```
SENDGRID_INBOUND_WEBHOOK_SECRET=...    # For signature verification
INBOUND_EMAIL_ADDRESS=add@famcal.ai   # Informational / used in UI copy
```

---

## Out of Scope (v1)

- Family member sender lookup (the other parent forwarding events) — v2
- Partial confirmation (select individual events from a batch) — the flyer import UI already handles this for in-app uploads; not needed for email v1
- Handling reply-chains or threaded emails — parse only the forwarded content, not prior replies
- Auto-detecting and skipping marketing emails — basic heuristic: if no date/time language found in first 2000 chars, skip LLM call entirely and reply "no events found"
