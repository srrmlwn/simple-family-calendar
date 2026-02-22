# Feature Spec: WhatsApp / SMS Bot Integration

_Status: 💡 Future — spec written, code removed. Implement when ready._

---

## What It Does

Parents already share event info via WhatsApp. This feature lets any user text or WhatsApp a famcal.ai phone number in plain English — the AI parses it and adds it to their calendar. Zero app-opening required.

**Examples:**
- "Add soccer practice Saturday at 10am" → confirmation → event created
- "What's on my calendar this week?" → immediate reply with event list
- "Move dentist to Thursday at 3pm" → confirmation → event updated
- "Cancel soccer Saturday" → confirmation → event deleted

---

## User Flow

### Setup (one-time)
1. User logs into famcal.ai → Settings → links their phone number (E.164 format)
2. User saves the famcal.ai Twilio number in their contacts as "FamCal"

### Per-message flow

**Mutations (create / update / delete):** two-phase confirmation
```
User:   "Add dentist appointment tomorrow at 2pm"
FamCal: "Got it! Create this event?

         Dentist Appointment
         📆 Mon Feb 23 at 2:00 PM (1h)

         Reply YES to confirm or NO to cancel."
User:   "YES"
FamCal: "✓ Created 'Dentist Appointment' on Feb 23 at 2:00 PM!

         View your calendar: https://famcal.ai"
```

**Queries:** immediate reply, no confirmation
```
User:   "What's on this week?"
FamCal: "You have 3 events this week:

         1. Meeting — Mon Feb 23, 10:00 AM
         2. Dentist — Wed Feb 25, 2:00 PM
         3. Soccer pickup — Fri Feb 27, 4:00 PM"
```

**Disambiguation (multiple matching events):**
```
User:   "Cancel soccer"
FamCal: "Found 2 matching events:

         1. Soccer Practice — Sat Feb 28
         2. Soccer Game — Sun Mar 1

         Reply YES to delete 'Soccer Practice' or NO to cancel."
```

**Unlinked phone:**
```
FamCal: "Hi! To use famcal.ai via WhatsApp/SMS, link your phone number at:
         https://famcal.ai/settings

         Don't have an account? Sign up at https://famcal.ai"
```

---

## Architecture

```
User's phone
    ↓ SMS or WhatsApp
Twilio
    ↓ POST /api/webhooks/twilio
webhookController.ts
    ├─ Validate Twilio signature
    ├─ Normalize phone number (strip "whatsapp:" prefix)
    ├─ Look up user by phone_number in DB
    ├─ Check pending confirmation (in-memory Map, 5-min TTL)
    │   ├─ YES → execute pending action → reply confirmation
    │   └─ NO → cancel → reply "Cancelled"
    ├─ Get user's timezone from UserSettings
    ├─ Fetch user events (−7 days → +90 days) as LLM context
    ├─ IntentParser.parseIntent() → create/update/delete/query
    │   ├─ query  → format event list → reply immediately
    │   ├─ create → store pending → reply confirmation prompt
    │   ├─ update → store pending → reply confirmation prompt
    │   └─ delete → store pending → reply confirmation prompt
    └─ Reply TwiML XML
```

### Reuses existing services
- **`IntentParser`** (`server/src/services/intentParser.ts`) — unchanged, same Claude claude-sonnet-4-6 powered service used by the web NLP bar
- **`EventService`** — unchanged CRUD methods
- **`UserSettings`** — unchanged, timezone lookup

### New services / files
- `server/src/services/twilioService.ts` — Twilio signature validation, phone normalization, TwiML reply builder
- `server/src/controllers/webhookController.ts` — message handler with pending confirmation state
- `server/src/routes/webhook.ts` — `POST /api/webhooks/twilio` (no JWT; Twilio signature used instead)
- `server/src/migrations/TIMESTAMP-AddPhoneNumberToUsers.ts` — `phone_number` column (nullable, unique) on `users` table

### Modified files
- `server/src/entities/User.ts` — add `phoneNumber?: string` column
- `server/src/config/index.ts` — add `twilio: { accountSid, authToken, phoneNumber, webhookUrl }`
- `server/src/app.ts` — `app.use('/api/webhooks', webhookRoutes)` (no auth middleware)
- `server/src/routes/settings.ts` — `POST /api/settings/phone` and `DELETE /api/settings/phone`

---

## Database Change

Single migration — add nullable unique column to `users`:
```sql
ALTER TABLE "users" ADD COLUMN "phone_number" varchar UNIQUE;
```

Down:
```sql
ALTER TABLE "users" DROP COLUMN "phone_number";
```

---

## Security

- **Twilio signature validation** on every webhook request via `twilio.validateRequest(authToken, signature, url, params)`
- Skipped when `TWILIO_AUTH_TOKEN` is not set (local dev convenience)
- Phone numbers stored in E.164 format (`+12125551234`); uniqueness enforced at DB level
- Pending confirmations stored in-memory (not in DB) — lost on server restart, expire after 5 minutes
- No JWT cookie on webhook path — authentication is purely phone-number-based

---

## Environment Variables

Add to Heroku config and local `.env`:

```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx
TWILIO_WEBHOOK_URL=https://famcal.ai/api/webhooks/twilio
```

---

## Twilio Setup (Step-by-Step)

### 1. Create a Twilio Account
- Go to [twilio.com](https://twilio.com) → sign up (free trial gives ~$15 credit)
- From the Console dashboard, copy **Account SID** and **Auth Token**

### 2. Choose: SMS or WhatsApp

**SMS (simplest, works immediately):**
1. Go to **Phone Numbers → Manage → Buy a number** (~$1/month, needs SMS capability)
2. Go to the number's config → **Messaging** → set **"A message comes in"** webhook to:
   ```
   https://famcal.ai/api/webhooks/twilio   [HTTP POST]
   ```

**WhatsApp — Testing (free, instant via sandbox):**
1. Go to **Messaging → Try it out → Send a WhatsApp message**
2. You'll get a sandbox number + join code (e.g. `join purple-tiger`)
3. Each tester WhatsApps the join code to the sandbox number to opt in
4. Under sandbox settings → set webhook to `https://famcal.ai/api/webhooks/twilio`

**WhatsApp — Production (requires Meta approval, 1–4 weeks):**
1. Go to **Messaging → Senders → WhatsApp senders** → submit a WhatsApp Business profile
2. Once approved, configure webhook identically to sandbox

### 3. Set Heroku Config Vars
```bash
heroku config:set TWILIO_ACCOUNT_SID=ACxxxxxxx
heroku config:set TWILIO_AUTH_TOKEN=your_token
heroku config:set TWILIO_PHONE_NUMBER=+1xxxxxxxxxx
heroku config:set TWILIO_WEBHOOK_URL=https://famcal.ai/api/webhooks/twilio
```

### 4. Run the Database Migration
```bash
heroku run "cd server && npx ts-node -r tsconfig-paths/register \
  ./node_modules/typeorm/cli.js migration:run -d src/data-source.ts" \
  --app your-heroku-app-name
```

---

## Local Testing with ngrok

Twilio needs a public HTTPS URL — ngrok creates one that tunnels to localhost.

### Setup
```bash
# Install ngrok
brew install ngrok
ngrok config add-authtoken YOUR_NGROK_TOKEN  # free account at ngrok.com

# Start local servers (in separate terminals)
npm run dev           # starts client :3000 and server :4000

# Tunnel to the server
ngrok http 4000
# Prints: Forwarding https://a1b2-98-123.ngrok-free.app → http://localhost:4000
```

### Point Twilio at ngrok
In the Twilio Console, temporarily set the webhook to:
```
https://a1b2-98-123.ngrok-free.app/api/webhooks/twilio
```

> **Note:** Free ngrok gives a new URL each restart. A paid plan gives a stable domain so you don't need to update Twilio each session.

### Test without a real phone (curl)
```bash
# Simulate an incoming message
curl -X POST http://localhost:4000/api/webhooks/twilio \
  -d "From=%2B12125551234&Body=Add+dentist+tomorrow+at+2pm"

# You'll get TwiML XML back in the terminal
```

### Link a test phone number to a local user
```bash
curl -X POST http://localhost:4000/api/settings/phone \
  -H "Content-Type: application/json" \
  -H "Cookie: token=YOUR_LOCAL_JWT" \
  -d '{"phoneNumber": "+12125551234"}'
```

### Inspect and replay traffic
ngrok provides a dashboard at `http://localhost:4040` — use it to inspect every webhook payload and **replay** requests without sending a real SMS.

---

## npm Package

```bash
cd server && npm install twilio
```

The `twilio` package includes TypeScript types — no separate `@types/twilio` needed.

---

## Acceptance Criteria

- [ ] Unregistered phone → "link your phone at famcal.ai/settings" reply
- [ ] Query intent → immediate event list, no confirmation
- [ ] Create intent → confirmation prompt → YES → event appears on calendar
- [ ] Create intent → NO → "Cancelled" reply, nothing created
- [ ] Update intent (single match) → confirmation with new values → YES → event updated
- [ ] Delete intent (single match) → confirmation → YES → event deleted
- [ ] Disambiguation (multiple matches) → shows list, confirms with first match
- [ ] Pending confirmation expires after 5 minutes → new message treated as fresh command
- [ ] Invalid Twilio signature → 403 response
- [ ] `POST /api/settings/phone` validates E.164 format
- [ ] `POST /api/settings/phone` returns 409 if number already linked to another account
- [ ] `DELETE /api/settings/phone` removes the link
- [ ] Works for both SMS (`From: +1xxx`) and WhatsApp (`From: whatsapp:+1xxx`)

---

## Open Questions

1. Should disambiguation for SMS offer numbered choices ("Reply 1 or 2") rather than defaulting to first match?
2. Should the confirmation deep link go to a specific event date (`famcal.ai?date=2026-02-23`) rather than just the home page?
3. For production WhatsApp, should we use a Twilio Messaging Service (supports multiple numbers) or a single number?
4. Should the phone-linking UI be added to the Settings page, or handled entirely via a first-message onboarding flow?
