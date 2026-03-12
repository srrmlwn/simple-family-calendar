# Feature Roadmap

_Last updated: 2026-03-11_

> **Current focus:** Beta launch prep. Email ingest + WhatsApp merged. UI polish sprint underway.
> **Sprint status:** Phase 1 ✅. WhatsApp + Email Ingest ✅ (merged, pending Heroku config). UI polish 🚧 in progress.

---

## Strategic Bet

kinroo.ai is a family calendar agent, not a calendar with NLP bolted on. Parents already talk about schedules in WhatsApp — we intercept that existing behavior and turn it into a managed calendar without asking them to change anything.

**Competitive position:** AI-Native + Family-Focused. Nobody else is here yet.

**Core risk:** Agent trust. One wrong deletion erodes confidence that takes weeks to rebuild. Confirmation-before-write is not optional — it's the trust foundation.

---

## Beta Launch Gate — UI/Infra Cleanup
_Must be clear before inviting any beta users._

### UI (must fix)
- [ ] **Merge Email Recipients into Family Members** — same concept; Family Member gets optional email field
- [ ] **Cut exception dates from recurrence form** — "this occurrence vs. series" is sufficient for beta
- [x] Delete `LoginPage.tsx` / `/login-test` ✅
- [x] Remove all `console.log` calls from client ✅
- [x] Remove daily digest ✅
- [x] Remove Installation Help from Settings ✅
- [x] Remove Timezone settings section ✅
- [x] Remove Beta Feedback section ✅
- [x] Fix onboarding step 3 (WhatsApp) ✅
- [x] Audit `bg-blue-600` → `bg-indigo-600` ✅
- [x] Unify Settings section heading typography ✅

### Settings target structure (3 sections)
| Section | Contents |
|---|---|
| **Family** | Family members (name + colour + optional email) · Co-manager invite |
| **Connect** | WhatsApp phone number |
| **Account** | Delete account |

### Infrastructure (must configure)
- [ ] Set `SENTRY_DSN` in Heroku config vars
- [ ] Set up UptimeRobot on `https://kinroo.ai/api/health`
- [ ] Twilio: set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, enable WhatsApp Business
- [ ] SendGrid: add MX record `add.kinroo.ai → mx.sendgrid.net`, configure Inbound Parse webhook, set `SENDGRID_INBOUND_WEBHOOK_SECRET`

---

## Phase 1 — Agent Foundation ✅
_All shipped._

| Feature | Notes |
|---|---|
| **Conversation Memory** | `conversation_sessions` table; last N messages threaded into every LLM call |
| **LLM Tool Use Architecture** | Replaced intent router; LLM calls `list_events`, `create_event`, `update_event`, `delete_event`, `check_conflicts`, `get_family_members` |
| **Persistent Conversation State** | Pending confirmations stored in DB, not in-memory Map |
| **Conflict Detection** | Every create/update checks for overlapping events; conflict included in confirmation message |

---

## Phase 2 — Proactive Agent

### ✅ WhatsApp / SMS Bot
**Status:** Merged. Pending Heroku config and Twilio console setup.

**What's built:** Inbound Twilio webhook, two-phase confirmation for mutations, disambiguation for ambiguous requests, unlinked phone fallback, outbound `sendWhatsAppMessage()`.

**Remaining:**
- [ ] Set Twilio config vars in Heroku
- [ ] Enable WhatsApp Sandbox / register WhatsApp Business number in Twilio
- [ ] Add phone number field to Settings UI
- [ ] Surface Twilio number in onboarding

---

### ✅ Email Ingest — Forward to add@kinroo.ai
**Status:** Merged. Pending SendGrid + DNS setup.

**What's built:** `POST /api/email/inbound` webhook, extracts content from plain text, HTML, PDFs, images, `.ics` files. Batch confirmation via WhatsApp or email reply. Deduplication. Rate limiting. SendGrid signature verification.

**Remaining:**
- [ ] Set `SENDGRID_INBOUND_WEBHOOK_SECRET` and `INBOUND_EMAIL_ADDRESS=add@kinroo.ai` in Heroku
- [ ] Configure SendGrid Inbound Parse (MX record + webhook URL)
- [ ] Surface in onboarding: "Forward any email to add@kinroo.ai"

---

### 🎯 Morning Briefing
Daily WhatsApp/SMS/email opt-in. Configurable send time (default 7:30am). LLM writes a short narrative — not a list dump. "Good morning! Today: Sasha school pickup at 3pm, soccer at Magnuson at 4:30. Busy one."

### 🎯 Conflict Alert (Proactive)
After any event write (by any means), run conflict detection. If found, send a WhatsApp message. Non-blocking — user can ignore or reply to resolve.

### 🎯 Evening Preview
If tomorrow has 2+ events, send a WhatsApp at configurable evening time (default 8pm). Skipped if tomorrow is empty.

### 🎯 Weekly Family Briefing (Sunday ~6pm)
Full week ahead via WhatsApp, organized by day, with conflict flags.

### 💡 Web Chat Interface
Persistent chat panel alongside the calendar (collapsible on mobile). Same agent backend. Unified thread with WhatsApp per user.

---

## Phase 3 — Agent Intelligence
_After Phase 2 is stable and trusted._

| Feature | Description |
|---|---|
| 🎯 **Rich Agent Context** | Family member details, frequent locations, preferences in system prompt |
| 💡 **Family WhatsApp Group Bot** | Add bot to family group chat; both parents update calendar from same thread |
| 💡 **Pattern Learning** | `family_knowledge` table; agent infers and stores "Sasha's doctor is Dr. Chen at Ballard Pediatrics" |
| 💡 **Smart Scheduling** | "Schedule Sasha's dental checkup" → agent proposes 3 open slots |
| 💡 **Per-Member iCal Feed URLs** | Subscribe link per family member for Google Calendar compatibility |
| 💡 **Travel Time Reminders** | Location + Maps API → "Leave by 3:45 to make Sasha's 4:30 soccer" |

---

## Deprioritized / Cut

| Feature | Reason |
|---|---|
| Daily digest (DigestService) | Replaced by WhatsApp morning briefing |
| Recurrence exception dates | Edge case; "this vs. series" scope sufficient for beta |
| Timezone section in Settings | Read-only info is not a setting |
| Email Recipients (separate) | Merged into Family Members |
| Beta Feedback settings section | Mailto link lives in footer |
| Ambient Family Dashboard | Doesn't advance agent vision |
| Chore & Task Lists | Scope creep |
| 2-Way Google Calendar Sync | 1-way import sufficient for adoption |
| Browser Extension | Enough input channels |
| Native mobile app | Capacitor + WhatsApp bot is sufficient |

---

## What NOT to Build
- iMessage/SMS-native (WhatsApp first; Twilio SMS as fallback)
- Team/work calendars (stay family-focused)
- Payments/premium tier (validate agent vision first)
- Multi-language support (English-only until clear demand)

---

## Open Questions

1. **Group WhatsApp attribution** — when both parents message the bot, whose calendar does it write to?
2. **Agent confidence threshold** — when should the agent skip confirmation? (Currently: always confirm)
3. **Web chat vs. WhatsApp threading** — unified thread or separate per channel?
4. **Pricing model** — multi-turn conversations multiply API costs; options: $5-8/month flat, family plan, freemium with message limit
5. **Family member accounts** — one account per family (current) vs. individual logins per parent?
6. **Correcting agent memory** — if the agent infers something wrong, how does a parent fix it?

---

## Open Access
Hold off until Phase 1 multi-turn agent is working reliably. When ready:
1. `heroku config:unset ALLOWED_EMAILS --app simple-family-calendar`
2. Remove beta banner from `Login.tsx`
3. Add waitlist or "invite a friend" flow to control growth
