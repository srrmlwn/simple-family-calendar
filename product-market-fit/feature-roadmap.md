# Feature Roadmap

_Last updated: 2026-02-24 (Photo/Flyer → Events shipped)_

Prioritized by expected impact on adoption, retention, and differentiation.

> **Current focus:** Tier 2 growth features. All Tier 0 and Tier 1 foundations are complete — see [`shipped-features.md`](./shipped-features.md) for the full list.

---

## How to Track Work

- **Change a status symbol** when you start or finish something (e.g. 🎯 → 🚧 when you begin, 🚧 → ✅ when shipped, then move to `shipped-features.md`).
- **New ideas** go at the bottom of the appropriate tier with 💡.
- **No separate task tracker** — keep it all here.

---

## Status Key

| Symbol | Meaning |
|---|---|
| ✅ | Shipped |
| 🚧 | In progress / has a spec |
| 🎯 | Next to build (high priority) |
| 💡 | Good idea, not yet prioritized |
| ❓ | Needs validation before committing |

---

## Tier 2 — Growth & Delight

### 🎯 Ambient Family Dashboard ("TV Mode")
**Why:** Skylight sells a $149 hardware device + $39/year subscription whose only job is showing the family calendar on a wall screen. famcal.ai can replace it entirely in software.

- Settings → "Family Dashboard" → generates a secret, shareable URL (no login needed to view)
- Full-screen weekly view: color-coded by family member, large font, auto-refreshes every few minutes
- "Tomorrow at a glance" section at the top
- Works on any device: Fire TV Stick browser, old iPad, smart TV browser

### 💡 Push Notifications / Browser Notifications
**Why:** The daily digest tells you what's tomorrow. Push tells you what's *now*. Without timely reminders, famcal.ai loses the "don't forget" moment to the phone's built-in clock app.

- Request browser/app push permission during onboarding (or on first event creation)
- Configurable per-event reminders: 15 min, 1 hour, 1 day before
- Smart defaults: short events → 45-min reminder; all-day events → morning-of
- NLP support: "Remind me about Maya's recital 2 hours before"
- Server-side delivery via Web Push API; Capacitor push for native app

### 💡 Per-Member iCal Feed URLs
**Why:** The single biggest objection from the second parent is "I already use Google Calendar." A per-member iCal feed removes that objection entirely — subscribe from any calendar app without switching tools.

- Settings → each family member has a "Subscribe" button that copies a secret iCal URL
- URL format: `/api/feed/<secret-token>/member/<id>.ics` — serves a live iCal feed
- A family-wide feed (all members combined) also available
- Deduplicates with any existing Google Calendar import

### 💡 Conflict Detection & Alerts
**Why:** Families regularly double-book without realizing it. A proactive flag at creation time ("⚠️ Maya already has soccer at 4pm Thursday") prevents the trust-eroding conflict discovery moment.

- On event create/edit: server checks for overlapping events for any tagged family member
- Inline warning in EventForm before saving — non-blocking (user can override)
- NLP query: "Do we have any conflicts next week?" lists all overlapping events
- Weekly digest optionally includes a "Conflicts this week" section

### 💡 Weekly Family Briefing (Sunday Evening Email)
**Why:** The Sunday planning ritual is deeply ingrained in family households. An automated email showing the full week ahead builds a strong recurring habit.

- Sunday ~6pm: email with full week's events, organized by day, color-coded by family member
- Highlights conflicts detected, if any
- Configurable: recipients, send time, toggle on/off
- Subject line personalised: "This week for the Smiths — 5 things on the calendar"
- Reuses DigestService infrastructure

### 💡 Chore & Task Lists (Lightweight, NLP-Driven)
**Why:** Cozi's grocery list and chore tracking is the primary reason families stay on it. A lightweight NLP-driven task list neutralizes that advantage.

- "Things to do" section alongside the calendar (not a separate app)
- NLP: "Remind me to pick up Maya's cleats this weekend" → task, not a calendar event
- Assignable to family members
- Tasks appear in the weekly briefing email
- Scope: simple checklist only — not projects, subtasks, or due-date tracking

### 💡 2-Way Google Calendar Sync
Push famcal.ai events to Google Calendar + handle conflicts. Requires upgrading OAuth scope from `calendar.readonly` → `calendar`. Incremental sync preferred over full re-import.

---

## Pending Queue — Not Yet Prioritized

| Feature | Notes |
|---|---|
| Family-Wide Weekly View | Week grid, one column per family member, conflict highlighting |
| Smart Reminders with Travel Buffer | "Leave by 3:45 to make 4pm soccer" — requires Google Maps API |
| Voice Input — Whisper Upgrade | Basic voice via Web Speech API already live. Upgrade to OpenAI Whisper for better accuracy. |
| Event Templates | Soccer season, school year, weekly routine — good for power users |
| "Add to FamCal" Browser Extension | Right-click any webpage date/event |
| WhatsApp / SMS Bot | Forward messages → AI parses → event created. Spec in `/features/whatsapp-sms-bot.md`. |
| School/Sports League Integrations | TeamSnap, SportsEngine direct import |
| Location-Aware Commute Planning | Google Maps integration for travel-time reminders |

---

## Open Access — Remove Private Beta Restriction

**Status:** 💡 Not yet prioritized

famcal.ai launched in private beta on 2026-02-22 with access restricted to an email allowlist (`ALLOWED_EMAILS` env var). Before opening to the public:

1. Remove or unset `ALLOWED_EMAILS` from Heroku config (`heroku config:unset ALLOWED_EMAILS --app simple-family-calendar`)
2. Update or remove the beta banner on `Login.tsx`
3. Optionally: add a waitlist / early-access signup form instead of a hard block

---

## What NOT to Build (Yet)

- **Full chat/AI assistant UI** — The NLP input embedded in the calendar is enough. A dedicated chat view adds navigation complexity.
- **Native mobile app (React Native)** — Capacitor wrapper is sufficient until retention metrics justify the investment.
- **Team/work calendars** — Stay family-focused. Generic work scheduling is Google Calendar's territory.
- **Payments / premium tier** — Validate the core value proposition first.

---

## Open Questions

1. Should family members have their own login accounts, or is the family calendar always owned by one "admin" parent?
2. What's the right confirmation UX for WhatsApp-parsed events — reply in WhatsApp, or require opening the app?
3. For the weekly briefing, should it go to one parent, all adults, or be configurable?
4. Privacy model for children's events — should kids be able to see their own events on the family calendar?
