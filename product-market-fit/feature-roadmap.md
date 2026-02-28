# Feature Roadmap

_Last updated: 2026-02-28 — **Strategic pivot: conversational agent**_

> **Current focus:** Phase 1 — Agent Foundation. See the PMF case and architecture rationale in [`conversational-first-strategy.md`](./conversational-first-strategy.md).
>
> **Sprint status:** Phase 1 complete ✅. All agent foundation items shipped. Next: Phase 2 — proactive agent.

---

## The Strategic Bet

**famcal.ai is no longer a calendar with NLP bolted on. It is a family calendar agent that happens to have a visual calendar view.**

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

### 🎯 Morning Briefing via WhatsApp

**Why:** The most valuable message of the day. "Here's what today looks like" delivered to your phone before the chaos starts. No other calendar does this on WhatsApp.

**What to build:**
- Opt-in (onboarding or Settings toggle), configurable send time (default 7:30am in user's timezone)
- Message format: short, conversational narrative — not a list dump. "Good morning! Today: Sasha school pickup at 3pm, soccer at Magnuson at 4:30. Dinner reservation at Cafe Juanita at 7pm. Busy one — want me to set a reminder for anything?"
- The LLM writes the narrative, not a template. This is a legitimate use of the existing IntentParser infrastructure repurposed for outbound.
- Delivery via Twilio WhatsApp (already set up)

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

### 💡 Forward-and-Forget

**Why:** The killer feature. Parents already forward schedule updates from group chats — "Practice moved to Saturday 10am at Magnuson" — and have to manually re-enter them. The agent should handle this automatically.

**What to build:**
- No change needed in the WhatsApp bot — forwarded messages are just natural language
- The agent needs to handle the disambiguation gracefully: recognize when a message is more likely a forwarded update than a direct command
- Key heuristic: if the message contains a name, a place, and a time but doesn't read like a command ("Coach Mike said..."), treat it as a forwarded notice and extract the event details
- Respond: "I see a schedule change — Practice Saturday 10am at Magnuson. Add it? YES/NO"

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

**Why:** The second parent who insists on staying in Google Calendar. A live iCal feed lets them subscribe from any calendar app without switching. The agent populates famcal.ai; Google Calendar reflects it automatically.

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

These were in the previous roadmap. Honest assessment of why they move down:

| Feature | Status | Reason |
|---|---|---|
| Ambient Family Dashboard ("TV Mode") | ❌ Deprioritized | Good idea but it's a passive display feature — doesn't advance the agent vision. Revisit post-Phase 2. |
| Chore & Task Lists | ❌ Deprioritized | Scope creep. Cozi has this. We win on the agent, not on matching Cozi feature-for-feature. |
| 2-Way Google Calendar Sync | ❌ Deprioritized | 1-way import is sufficient for adoption. 2-way sync is a reliability and conflict-resolution investment that only matters at higher retention. |
| Browser Extension | ❌ Cut | Another input channel. We have enough input channels. Depth over breadth. |
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
