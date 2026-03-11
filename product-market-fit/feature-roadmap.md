# Feature Roadmap

_Last updated: 2026-03-11 — **Beta launch gate: UI simplification sprint in progress**_

> **Current focus:** Beta launch prep — simplify and polish. Email ingest + WhatsApp merged. UI sprint underway. See cleanup checklist below before inviting any beta users.
>
> **Sprint status:** Phase 1 ✅. WhatsApp + Email Ingest ✅ (merged, pending infra config). UI polish sprint 🚧 in progress (digest deleted, Settings restructured, console.logs removed).

---

## The Strategic Bet

**kinroo.ai is no longer a calendar with NLP bolted on. It is a family calendar agent that happens to have a visual calendar view.**

The distinction matters. A calendar app requires behavior change — open the app, navigate, fill in a form. An agent works within the behavior parents already have: messaging. Parents already talk about their schedules in WhatsApp. They already forward soccer schedules and school notices to each other. The agent intercepts that existing behavior and turns it into a managed calendar, without asking parents to change how they communicate.

No one has built this. Google Calendar, Cozi, and TimeTree are all form-based products with NLP bolted on as a feature. We have a chance to define a new category: **the family logistics agent**.

---

## Does This Make Sense for Product-Market Fit?

**Short answer: yes, with clear-eyed risks.**

### Why this is the right bet

**1. The behavior already exists — we're just inserting into it.**
Parents already manage their family schedule through WhatsApp messages: "Soccer moved to Saturday 10am", "Dentist is at 3pm Thursday", "Don't forget Sasha has a half day Friday". That information lives in chat threads, gets forgotten, causes double-bookings. The agent doesn't ask parents to do anything new — it just captures what they're already saying and turns it into calendar data.

**2. WhatsApp as primary UX is a genuine category gap.**
No mainstream calendar has a conversational agent as its primary interface. Google Calendar's Gemini integration is productivity-focused, not family-focused, and requires opening the app. We can own the "WhatsApp-native family calendar" position before anyone else does. That position is defensible because it requires deep integration with family-specific context (members, routines, school schedules) that a generic productivity tool won't prioritize.

**3. The agent model builds a moat that grows over time.**
An agent that learns your family — Sasha's soccer is always at Magnuson Park, Dr. Chen is the pediatrician, the family doesn't do anything before 8am on weekends — becomes genuinely hard to replace. The personalized context layer is the moat. Cozi and Google Calendar don't have this and won't build it because it requires a fundamentally different architecture than CRUD.

**4. Timing is right. The technology is ready.**
LLM tool use, reliable intent parsing, and WhatsApp Business API are all mature enough to build on in 2026. This wasn't true 18 months ago. The window to establish the category position is now, before Google or a well-funded startup gets here first.

### The real risks — don't underestimate them

**Trust is harder to earn with an agent than a UI.**
A form-based calendar is predictable. An agent is not. One wrong deletion, one event created for the wrong day, erodes confidence that takes weeks to rebuild. The confirmation-before-write pattern we already have is not optional — it's the product's trust foundation. Every agentic action that mutates data must have a clear, frictionless confirmation step. The agent earns trust by being right 99% of the time AND by making it painless to catch the 1%.

**WhatsApp is dominant globally but split in the US.**
Roughly 60-70% of US smartphone users have WhatsApp. That's the primary channel and worth building for first. But iMessage is the default for a large slice of US iOS households. A web-based chat interface in the app (which we previously ruled out) becomes important for the users who aren't WhatsApp-native. Keep this in mind when designing the agent infrastructure — the conversation layer should be channel-agnostic.

**Multi-turn conversations multiply API costs.**
A single-turn interaction costs one LLM call. A multi-turn conversation with history might cost 3-5. At scale, this is a real unit economics problem. Mitigate it by: (a) keeping conversation context windows lean — pass a summary of prior context rather than the full transcript, (b) using a smaller/faster model for simple queries (what's on my calendar today?) and reserving Claude Sonnet for complex reasoning, (c) building a pricing model before the costs surprise you.

**The visual calendar is still essential.**
Don't abandon it in pursuit of the conversational vision. Parents need to see the week at a glance — a chat interface doesn't replace that visual spatial view. The right division: **conversation is for doing, the calendar is for seeing**. The agent handles all creates/updates/queries via conversation. The calendar grid is the verification layer that shows parents the result and makes them trust the agent.

---

---

## Beta Launch Gate — Polish & Simplification Sprint
_These must be done before inviting any beta users. No new features until this list is clear._

### UI Cleanup (must fix)
- [x] **Delete `LoginPage.tsx` and `/login-test` route** ✅ — dead code removed
- [x] **Remove all `console.log` calls from client** ✅ — Login.tsx, api.ts, GoogleLogin.tsx, Header.tsx, InstallPrompt.tsx, PrivateRoute.tsx, eventService.ts all cleaned
- [ ] **Merge Email Recipients into Family Members** — same concept from user perspective; Family Member gets an optional email field; one UI, one concept, no confusion
- [x] **Remove daily digest entirely** ✅ — `DigestService`, `SchedulerService`, `notificationRoutes`, `notificationController` deleted; Notification Preferences removed from Settings
- [x] **Remove Installation Help section from Settings entirely** ✅ — Settings rewritten to 3 sections; manual browser instructions gone
- [ ] **Cut exception dates from recurrence form** — "this occurrence vs. series" scope is sufficient for beta; exception date picker adds complexity and edge cases
- [x] **Remove Timezone as a Settings section** ✅ — gone in Settings rewrite
- [x] **Remove "Beta Feedback" section from Settings** ✅ — replaced with `hello@kinroo.ai` link in footer of Settings page
- [x] **Fix onboarding step 3 (WhatsApp)** ✅ — replaced with Connect step: email forward (add@kinroo.ai) primary, WhatsApp "coming soon"
- [x] **Audit `bg-blue-600` → `bg-indigo-600`** ✅ — Login, Register, ForgotPassword, RecurrenceScopeDialog buttons updated to indigo
- [x] **Unify Settings section heading typography** ✅ — Settings rewritten with consistent section label style (`text-xs font-semibold uppercase tracking-wider`)

### Settings page target structure (3 sections, down from 8)
| Section | Contents |
|---|---|
| **Family** | Family members (name + colour + optional email) · Co-manager invite |
| **Connect** | WhatsApp phone number |
| **Account** | Delete account |

### Infrastructure (must configure before launch)
- [ ] Set `SENTRY_DSN` in Heroku config vars
- [ ] Set up UptimeRobot on `https://kinroo.ai/api/health`
- [ ] Twilio: set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, enable WhatsApp Business in Twilio console
- [ ] SendGrid: add MX record `add.kinroo.ai → mx.sendgrid.net`, configure Inbound Parse webhook, set `SENDGRID_INBOUND_WEBHOOK_SECRET`

---

## How to Track Work

- **Change status** when you start or finish something (e.g. 🎯 → 🚧 → ✅, then archive to `shipped-features.md`).
- **New ideas** go at the bottom of the appropriate phase with 💡.

| Symbol | Meaning |
|---|---|
| ✅ | Shipped |
| 🚧 | In progress / has a spec |
| 🎯 | Next to build |
| 💡 | Good idea, not yet prioritized |
| ❌ | Deprioritized / cut |

---

## Phase 1 — Agent Foundation
_Goal: Turn our single-turn bot into a genuine multi-turn conversational agent. This is the architectural transformation. Nothing else in Phase 2 or 3 is possible without this._

---

### ✅ Conversation Memory (Multi-Turn Context)

**Why this is #1:** Every other agent feature depends on it. Without memory, "move it to Friday" after "what's Sasha's dentist?" is impossible. Multi-turn is the difference between a bot and an assistant.

**What to build:**
- `conversation_sessions` DB table: `phone_number` (or `session_id` for web), `messages` (JSONB array of `{role, content, timestamp}`), `updated_at`
- On every incoming message: load the last N messages for that user, prepend them to the LLM system prompt as conversation history
- Trim older messages beyond a token budget — pass a rolling window, not the full history
- Web input also gets a session (keyed to userId + browser session) for multi-turn via the web interface

**Unlocks:** Every Phase 2 feature. Without this, none of them are meaningful.

---

### ✅ LLM Tool Use Architecture (Replace Intent Router)

**Why:** The current `if (result.intent === 'create')` router is a dead end. It can execute exactly one operation per message. A real agent needs to reason, call multiple tools, ask clarifying questions, and handle complex requests like "clear my Thursday afternoon" or "plan Sasha's week."

**What to build:**
- Define a tool set: `list_events`, `create_event`, `update_event`, `delete_event`, `check_conflicts`, `get_family_members`
- Replace the intent parser + router with a Claude tool-use loop: the LLM receives the tools, decides which to call (and in what order), gets results back, and continues until the task is done or it needs to ask the user something
- Confirmation step remains: any tool call that mutates data (`create_event`, `update_event`, `delete_event`) is intercepted, shown to the user, and requires YES before execution
- The LLM can ask clarifying questions mid-conversation ("Did you mean the dentist on Tuesday or Thursday?") rather than picking one and hoping

**What this unlocks:**
- "Clear my Thursday afternoon" → agent lists events, identifies afternoon ones, proposes deletions in one confirmation message
- "Move soccer to next week" where there are 3 soccer events → agent lists candidates, asks which one
- "Schedule a pediatrician follow-up for Sasha" → agent suggests times based on existing calendar gaps

---

### ✅ Persistent Conversation State (Move Off In-Memory Map)

**Why:** The current pending confirmations live in a JavaScript `Map`. Every dyno restart or Heroku sleep cycle wipes them. This is a reliability bug.

**What to build:**
- Fold pending action state into the `conversation_sessions` table (it's just part of the conversation)
- The tool-use architecture above makes this natural: pending state is just "an unconfirmed tool call in the current conversation turn"

---

### ✅ Conflict Detection at Every Write

**Why:** The agent's credibility depends on never creating a conflict silently. A double-booked Saturday is the kind of failure that makes parents stop trusting it.

**What to build:**
- Before confirming any `create_event` or `update_event`, the agent checks for overlapping events for any tagged family member
- If a conflict exists: include it in the confirmation message. "Add Sasha's dentist Thursday 2pm–3pm? ⚠️ She already has early release at 2pm that day."
- Apply to both WhatsApp bot AND web NLP input

---

---

## Phase 2 — Proactive Agent
_Goal: The agent reaches out, not just responds. This is what separates a tool from an assistant. All of Phase 1 must be shipped first._

---

### ✅ WhatsApp / SMS Bot — Text or WhatsApp to add events

**Status:** Merged into main. Inbound handler (`webhookController.ts`) + outbound `sendWhatsAppMessage()` both in main. Pending Heroku config and Twilio console setup before it works in production.

**Why:** Parents are already in WhatsApp. Texting "Emma has soccer Saturday at 9am" to kinroo.ai's number and getting a confirmation back — without opening an app — is a genuinely different product from every form-based calendar. This is the primary input channel for mobile-native families.

**What's built:**
- Inbound Twilio webhook: receives SMS/WhatsApp, routes to agent, returns TwiML reply
- Two-phase confirmation for mutations (create/update/delete): user texts → agent proposes → user replies YES/NO
- Immediate reply for queries ("what's this week?")
- Disambiguation for ambiguous requests ("cancel soccer" when there are 2 soccer events)
- Unlinked phone fallback: sends Settings link if phone not connected to an account
- Outbound `sendWhatsAppMessage()` for proactive messages (used by email ingest confirmations)

**Merge checklist:**
- [x] Merge `worktree-peppy-sleeping-rocket` into main ✅ 2026-03-11
- [ ] Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` in Heroku config
- [ ] Enable WhatsApp Sandbox or register WhatsApp Business number in Twilio console
- [ ] Add phone number field to Settings UI (already specced in `whatsapp-sms-bot.md`)
- [ ] Expose Twilio number in onboarding ("Save this number as 'kinroo.ai' in your contacts")

---

### ✅ Email Ingest — Forward any email to add@kinroo.ai

**Status:** Merged into main. `emailIngestController`, `emailIngestService`, `/api/email/inbound` route all in main. Pending SendGrid + DNS setup before it works in production.

**Why:** The killer feature for parents. Forward the school's soccer schedule PDF to add@kinroo.ai. Get a WhatsApp ping 10 seconds later: "Found 8 soccer games. Add them all? YES/NO". Zero new behavior required — forwarding is something every parent already knows how to do.

**What's built:**
- `POST /api/email/inbound` webhook handler (SendGrid Inbound Parse)
- `emailIngestService`: extracts content from plain text, HTML, PDFs (`pdf-parse`), images (Claude vision), `.ics` files
- User identification by `From` address → `users.email` lookup
- Batch confirmation: stores all extracted events as a single pending action, YES adds all
- Deduplication: flags events already on the calendar in the confirmation message
- Confirmation routing: WhatsApp if phone linked, email reply otherwise
- Unknown sender gets a "sign up" reply; no-events emails get a helpful error
- SendGrid webhook signature verification; rate limiting by sender

**Merge checklist:**
- [x] Merge `worktree-peppy-sleeping-rocket` into main ✅ 2026-03-11
- [ ] Set `SENDGRID_INBOUND_WEBHOOK_SECRET` and `INBOUND_EMAIL_ADDRESS=add@kinroo.ai` in Heroku config
- [ ] Configure SendGrid Inbound Parse: MX record `add.kinroo.ai → mx.sendgrid.net`, webhook URL `https://kinroo.ai/api/email/inbound`
- [ ] Register `add@kinroo.ai` mailbox (or alias) in DNS
- [ ] Surface in onboarding: "Forward any email to add@kinroo.ai"

---

### 🎯 Morning Briefing — WhatsApp / SMS / email / in-app

**Why:** The most valuable message of the day. "Here's what today looks like" before the chaos starts. This fully replaces the old daily digest email — same idea, every channel, done properly.

**Replaces:** `DigestService` + `SchedulerService` (to be deleted). The email digest was a batch workaround; this is the real thing.

**What to build:**
- Opt-in per channel: WhatsApp, SMS, email, or in-app push. User picks which channel(s) they want.
- Configurable send time (default 7:30am in user's timezone)
- Message format: short, conversational narrative — not a list dump. "Good morning! Today: Sasha school pickup at 3pm, soccer at Magnuson at 4:30. Dinner at Cafe Juanita at 7pm. Busy one."
- LLM writes the narrative, not a template
- WhatsApp delivery via Twilio (already wired). Email via existing SMTP. In-app via push notification (future). SMS via Twilio SMS.

---

### 🎯 Conflict Alert (Proactive, Not Just At Creation)

**Why:** Conflicts sometimes appear later — when a recurring event extends into a date that already has something, or when a co-manager adds something that conflicts with an existing event. Catch them as they happen.

**What to build:**
- After any event creation or update (by any means — web, WhatsApp, co-manager, Google Calendar sync), run conflict detection for affected family members
- If a conflict is found: send a WhatsApp message to the primary user. "Heads up — Sasha now has soccer AND a dentist at the same time on Thursday. Want to reschedule one?"
- Non-blocking. User can ignore or reply to resolve.

---

### 🎯 Evening Preview ("Tomorrow at a Glance")

**Why:** The bedtime planning moment. Parents often realize at 9pm that tomorrow is packed and they haven't thought about logistics. The agent can surface this proactively.

**What to build:**
- If tomorrow has 2+ events: send a WhatsApp message at configurable evening time (default 8pm)
- Format: "Tomorrow: Sasha's half day ends at noon, then dentist at 2pm at Ballard Pediatrics, then soccer at 4:30. Want me to add travel time reminders?"
- If tomorrow is empty: no message (don't be noisy)

---

### 🎯 Weekly Family Briefing (Sunday Evening)

**Why:** The Sunday planning ritual. Knowing the week ahead lets families prep — grocery run, carpool arrangements, who's picking up who.

**What to build:**
- Sunday ~6pm: WhatsApp message with the full week ahead, organized by day, with conflict flags
- "This week: Monday quiet, Tuesday Sasha soccer 4:30, Wednesday dentist 2pm ⚠️ conflicts with your 1:30pm call, Thursday–Friday clear, Saturday Sasha's birthday party at 2pm."
- Reuse DigestService infrastructure, add WhatsApp delivery alongside the existing email digest

---

### 💡 Web Chat Interface (For Non-WhatsApp Users)

**Why:** WhatsApp is the primary channel, but we previously ruled out a dedicated chat UI in the web app. We should reverse that decision. With a true multi-turn agent, a chat panel in the web app is the right desktop experience — it's not redundant, it's the same agent on a different channel.

**What to build:**
- Persistent chat panel alongside the calendar view (collapsible on mobile)
- Shares the same agent backend (conversation_sessions, tool use loop)
- Shows conversation history from both web and WhatsApp in the same thread (unified per user)
- This is the interface for users who aren't WhatsApp-native AND for power users who want to see their conversation history

---

## Phase 3 — Agent Intelligence
_Goal: The agent gets genuinely smart about your family. Personalization and proactive scheduling. Build after Phase 2 is stable and trusted._

---

### 🎯 Rich Agent Context (Family Intelligence Layer)

**Why:** An agent that doesn't know your family produces generic responses. An agent that knows Sasha is 3 years old, Dr. Chen is at Ballard Pediatrics, and soccer is always at Magnuson Park produces responses that feel like a real assistant.

**What to build:**
- System prompt enhancement: include family member relationships if stored, recent frequent locations extracted from event history, explicit user preferences from `user_settings`
- Start simple: just family members + timezone (already included). Add location inference after Phase 2 ships.

---

### ✅ Forward-and-Forget (Email channel — shipped in worktree)

**Why:** The killer feature. Parents already forward schedule emails and PDFs. Now they can forward directly to add@kinroo.ai. See Phase 2 "Email Ingest" for full details.

**Still to build (WhatsApp channel):**
- Forwarded WhatsApp messages are already natural language — no code change needed for the agent to handle them
- Heuristic to detect forwarded context vs. direct commands: if a message contains a name, a place, and a time but reads like a third-party notice ("Coach Mike said practice moved to Saturday 10am"), extract the event and respond: "I see a schedule change — Practice Saturday 10am at Magnuson. Add it? YES/NO"

---

### 💡 Family WhatsApp Group Bot

**Why:** Two parents managing one calendar from the same WhatsApp thread is dramatically more natural than one parent as the sole agent user. Add the bot to the family group chat and both parents can update the calendar from their existing group conversation.

**Design challenges to solve:**
- Which parent's account does a message go to? (Option: bot writes to the primary account; co-manager model already handles reading)
- How does the bot distinguish relevant messages from general family chat? (Listen only when @mentioned, or when the message contains date/time language above a confidence threshold)
- Privacy: the bot shouldn't respond to every message in a group

---

### 💡 Pattern Learning and Memory

**Why:** A truly helpful assistant remembers things so you don't have to repeat them. "Sasha's pediatrician is Dr. Chen at Ballard Pediatrics" should only need to be said once.

**What to build:**
- `family_knowledge` table: key-value store per family (`sasha_doctor = "Dr. Chen, Ballard Pediatrics, +1 206 555 1234"`, `soccer_location = "Magnuson Park"`, etc.)
- Agent extracts facts from conversations and events: when "Ballard Pediatrics" appears in 3 events tagged to Sasha, it infers and stores the association
- Stored facts surface in the agent's system prompt: "Known: Sasha's pediatrician is Dr. Chen at Ballard Pediatrics"
- User can view and edit stored facts in Settings

---

### 💡 Smart Scheduling Suggestions

**Why:** The agent knows your calendar. It should be able to help you find time, not just record time.

**Examples:**
- "Schedule Sasha's 6-month dental checkup" → agent looks at the calendar, proposes 3 open slots in the next 2 weeks
- "Find time this week for a 1-hour call" → proposes gaps that work
- "Does anything need rescheduling this week?" → agent identifies upcoming conflicts and proposes fixes

---

### 💡 Per-Member iCal Feed URLs

**Why:** The second parent who insists on staying in Google Calendar. A live iCal feed lets them subscribe from any calendar app without switching. The agent populates kinroo.ai; Google Calendar reflects it automatically.

**What to build:**
- Settings → each family member has a "Subscribe" button that copies a secret iCal URL (`/api/feed/<secret>/member/<id>.ics`)
- A family-wide feed (all members combined) also available
- Stateless — just a query that formats current DB events as iCal

---

### 💡 Travel Time and Leave-By Reminders

**Why:** Knowing you have soccer at 4:30pm is useful. Knowing you need to leave by 4pm to get there is actionable.

**What to build:**
- Location field on events (already exists) + Google Maps API for travel time estimate from home
- "Leave by" reminder calculated at creation time, surfaced in morning briefing and day-of notifications
- "Leave by 3:45 to make Sasha's 4:30 soccer at Magnuson"

---

## Deprioritized / Cut

| Feature | Status | Reason |
|---|---|---|
| Daily digest (DigestService) | ❌ Cut | Replaced by WhatsApp/SMS/email/in-app morning briefing (Phase 2). Two notification systems is worse than one good one. `DigestService` + `SchedulerService` to be deleted. |
| Notification Preferences section in Settings | ❌ Removed | Goes away with the digest. Morning briefing opt-in lives in onboarding/Connect settings. |
| Installation Help section in Settings | ❌ Removed | PWA install prompt is automatic. Browser instruction manual is noise. |
| Year view | ✅ Kept (Skylight use case) | Horizontal week grid is intentional for wide landscape displays (like Skylight family calendar). Not a bug, a feature. |
| Recurrence exception dates | ❌ Cut for beta | Edge case complexity; "this occurrence vs. series" scope is sufficient. Revisit if users request it. |
| Timezone section in Settings | ❌ Removed from UI | Read-only info is not a setting. |
| Email Recipients (separate from Family Members) | ❌ Merged | Exposed internal data model to users. Family Members gets an optional email field instead. |
| `LoginPage.tsx` / `/login-test` | ❌ Deleted | Dead code, duplicate login page, security surface. |
| Beta Feedback settings section | ❌ Removed | Mailto link doesn't need a named section; lives in footer. |
| Ambient Family Dashboard ("TV Mode") | ❌ Deprioritized | Passive display feature, doesn't advance the agent vision. Revisit post-Phase 2. |
| Chore & Task Lists | ❌ Deprioritized | Scope creep. We win on the agent, not on matching Cozi feature-for-feature. |
| 2-Way Google Calendar Sync | ❌ Deprioritized | 1-way import sufficient for adoption. 2-way sync only matters at higher retention. |
| Browser Extension | ❌ Cut | Enough input channels already. Depth over breadth. |
| School/Sports League Integrations | 💡 Keep in backlog | High value, but requires partnerships. Not now. |
| Voice Input Whisper Upgrade | 💡 Keep in backlog | Basic voice is fine. WhatsApp voice messages as an input channel are more interesting — forward a voice message, agent transcribes and parses it. |

---

## What NOT to Build

- **iMessage/SMS native integration** — WhatsApp first. Twilio SMS works as a fallback for non-WhatsApp users, but don't invest in iMessage-native (requires Apple Business Register and is more complex).
- **Native mobile app (React Native)** — Capacitor wrapper is sufficient. The WhatsApp bot IS the mobile experience for most interactions.
- **Team/work calendars** — Stay family-focused. Generic work scheduling is Google Calendar's territory.
- **Payments / premium tier** — Validate the agent vision with real families before monetizing. The switching cost argument (the agent knows your family) is the retention moat; build that first.
- **Multi-language support** — English-only until there's clear demand from a specific non-English market.

---

## Open Access — Remove Private Beta Restriction

**Status:** 💡 Ready when Phase 1 is stable

Hold off on opening fully until the multi-turn agent is working reliably. The single-turn bot is good but the agent story is dramatically more compelling. Open with the agent — not before it.

When ready:
1. `heroku config:unset ALLOWED_EMAILS --app simple-family-calendar`
2. Remove beta banner from `Login.tsx`
3. Add a waitlist or "invite a friend" flow to control growth rate initially

---

## Open Questions

1. **Group WhatsApp attribution**: When both parents message the bot in the family group, whose calendar does it write to? Options: primary account only; whichever parent sent the message if their phone number is linked; ask.

2. **Agent confidence threshold**: At what confidence level should the agent skip the confirmation step? (Currently: always confirm. Long-term: confirm only when uncertain.) This is a trust calibration problem — getting it wrong in either direction is bad.

3. **Conversation thread vs. stateless**: Should the web chat interface share a conversation thread with WhatsApp, or be a separate thread per channel? (Unified feels cleaner; separate is simpler to implement.)

4. **Pricing model**: The agent makes multi-LLM-call conversations the norm. API costs scale accordingly. Think about pricing before growth makes this a surprise. Options: flat subscription ($5-8/month), family plan pricing, freemium with a message limit.

5. **Family member accounts**: Should each family member (both parents) have their own login, or is one-account-per-family the model? Multi-parent login is the right long-term answer but co-manager access handles the immediate need.

6. **What does "the agent learned something wrong" recovery look like?** If the agent infers "soccer is always at Magnuson" but you moved to a new field, how does a parent correct the agent's memory? This is a trust-critical UX problem worth designing before building pattern learning.
