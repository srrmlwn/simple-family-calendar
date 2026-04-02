# Feature Roadmap

_Last updated: 2026-04-01_

> **Current focus:** Production launch. Core agent + channels are built. Remaining work is infra config, one UI cleanup, and manual channel setup.

---

## Strategic Bet

kinroo.ai is a family calendar agent, not a calendar with NLP bolted on. Parents already talk about schedules in WhatsApp — we intercept that existing behavior and turn it into a managed calendar without asking them to change anything.

**Competitive position:** AI-Native + Family-Focused. Nobody else is here yet.

**Core risk:** Agent trust. One wrong deletion erodes confidence that takes weeks to rebuild. Confirmation-before-write is not optional — it's the trust foundation.

---

## Prod Launch Gate

### Code (must merge before launch)
- [x] Merge Email Recipients into Family Members — Family Member gets optional email field ✅
- [x] Cut exception dates from recurrence form — "this vs. series" is sufficient ✅

### Infrastructure (manual — must configure in Heroku)
- [ ] `SENTRY_DSN` — Sentry is wired, just needs the DSN env var
- [ ] `ALLOWED_EMAILS` — beta allowlist (or unset for open access)
- [ ] `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
- [ ] WhatsApp Business: enable Sandbox or register number in Twilio console
- [ ] `SENDGRID_INBOUND_WEBHOOK_SECRET` + `INBOUND_EMAIL_ADDRESS=add@kinroo.ai`
- [ ] SendGrid Inbound Parse: add MX record `add.kinroo.ai → mx.sendgrid.net`, configure webhook URL

### Manual verification (run the day before launch)
- [ ] `grep -r "sk-ant-api03\|GOCSPX-" server/src/ client/src/` returns nothing
- [ ] NLP input works at 768px (browser devtools)
- [ ] UptimeRobot monitor on `https://kinroo.ai/api/health`
- [ ] End-to-end smoke test: login → NLP event → WhatsApp confirm → event on calendar

---

## Settings target structure (current)
| Section | Contents |
|---|---|
| **Family** | Family members (name + colour + optional email) · Co-manager invite |
| **Connect** | WhatsApp phone number · Email forwarding (add@kinroo.ai) |
| **Account** | Redo setup tour · Delete account |

---

## Shipped ✅

### Phase 1 — Agent Foundation
| Feature | Notes |
|---|---|
| **Conversation Memory** | `conversation_sessions` table; last N messages threaded into every LLM call |
| **LLM Tool Use Architecture** | Replaced intent router; LLM calls `list_events`, `create_event`, `update_event`, `delete_event`, `check_conflicts`, `get_family_members` |
| **Persistent Conversation State** | Pending confirmations stored in DB, not in-memory Map |
| **Conflict Detection** | Every create/update checks for overlapping events; conflict included in confirmation message |
| **Family Members** | Name + color + optional email; tag events per person; filter calendar by member |
| **Co-manager / Family Access** | Invite a partner to share the same calendar |
| **Google OAuth + JWT auth** | httpOnly cookie, no localStorage tokens |
| **Privacy Policy + Terms** | `/privacy` and `/terms` pages live and linked |
| **Account deletion** | Deletes all data via FK CASCADE |

### Phase 2 — Channels (merged, pending Heroku config)
| Feature | Notes |
|---|---|
| **WhatsApp / SMS Bot** | Inbound Twilio webhook, two-phase confirmation, disambiguation, outbound messages |
| **Email Ingest** | `POST /api/email/inbound`; extracts from plain text, HTML, PDF, images, .ics; dedup; rate limiting |

### UI / Infra cleanup (all done)
- Deleted `LoginPage.tsx` / `/login-test`
- Removed all `console.log` from client
- Removed daily digest
- Removed Installation Help from Settings
- Removed Timezone settings section
- Removed Beta Feedback section
- Fixed onboarding step 3 (WhatsApp)
- Unified Settings section headings
- Warm design system (Nunito, CSS variables)
- Brand name "kinroo.ai" throughout (no "Simple Family Calendar")
- Exception dates cut from recurrence form

---

## Phase 3 — Proactive Agent
_After launch is stable and trusted._

### Notifications (next sprint)
| Feature | Description |
|---|---|
| 🎯 **Morning Briefing** | Daily WhatsApp/SMS opt-in. LLM writes a short narrative — not a list dump. |
| 🎯 **Conflict Alert (Proactive)** | After any event write, if conflict found → send WhatsApp. |
| 🎯 **Evening Preview** | If tomorrow has 2+ events, send a WhatsApp at configurable evening time. |
| 🎯 **Weekly Family Briefing** | Full week ahead via WhatsApp Sunday ~6pm, with conflict flags. |

### Agent Intelligence
| Feature | Description |
|---|---|
| 🎯 **Rich Agent Context** | Family member details, frequent locations, preferences in system prompt |
| 💡 **Family WhatsApp Group Bot** | Add bot to family group chat; both parents update calendar from same thread |
| 💡 **Pattern Learning** | `family_knowledge` table; agent infers and stores "Sasha's doctor is Dr. Chen" |
| 💡 **Smart Scheduling** | "Schedule Sasha's dental checkup" → agent proposes 3 open slots |
| 💡 **Per-Member iCal Feed URLs** | Subscribe link per family member for Google Calendar compatibility |
| 💡 **Travel Time Reminders** | Location + Maps API → "Leave by 3:45 to make Sasha's 4:30 soccer" |

---

## Deprioritized / Cut

| Feature | Reason |
|---|---|
| Daily digest (DigestService) | Replaced by WhatsApp morning briefing |
| Recurrence exception dates | Edge case; "this vs. series" scope sufficient |
| Timezone section in Settings | Read-only info is not a setting |
| Email Recipients (separate table) | Merged into Family Members |
| Beta Feedback settings section | Mailto link lives in footer |
| Ambient Family Dashboard | Doesn't advance agent vision |
| Chore & Task Lists | Scope creep |
| 2-Way Google Calendar Sync | 1-way import sufficient for adoption |
| Browser Extension | Enough input channels |
| Native mobile app | Capacitor + WhatsApp bot is sufficient |
| Year view format polish | Post-launch |
| Structured API call logging | Post-launch |

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
3. **Pricing model** — multi-turn conversations multiply API costs; options: $5-8/month flat, family plan, freemium with message limit
4. **Correcting agent memory** — if the agent infers something wrong, how does a parent fix it?

---

## Open Access (when ready)
1. `heroku config:unset ALLOWED_EMAILS --app simple-family-calendar`
2. Remove beta banner from `LandingPage.tsx`
3. Add waitlist or "invite a friend" flow to control growth
