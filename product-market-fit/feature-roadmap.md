# Feature Roadmap

_Last updated: 2026-02-22_

Prioritized by expected impact on adoption, retention, and differentiation. Features already shipped or in active development are noted.

> **Current focus:** Tier 0 complete. Family Members + NLP tagging + Onboarding all shipped. Active: Recurring Events → Google Calendar Sync.

---

## How to Track Work

This file is the single source of truth for what to build and what's in flight.

- **Change a status symbol** when you start or finish something (e.g. 🎯 → 🚧 when you begin, 🚧 → ✅ when shipped).
- **Tier 1** is the active sprint. Work through it top-to-bottom before touching Tier 2+.
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

## Tier 0 — Design & Polish ✅ All resolved as of 2026-02-21

_Identified via Puppeteer design audit on 2026-02-21. All items resolved._

### ✅ Fix: Duplicate "Sign in with Google" Button on Login Page
### ✅ Fix: TypeScript Compilation Errors in AuthContext (Visible on Mobile)
### ✅ Fix: Event Creation Not Triggered by Clicking Empty Date Cells
### ✅ Fix: "Save Preferences" Button in Settings is Not `type="submit"`
### ✅ Fix: 1 Button Missing Accessible Label
### ✅ Fix: 1 Input Missing Label or aria-label
### ✅ Fix: No "Forgot Password" Link on Login Page
### ✅ Improvement: Add Event Indicator Dots to Mini Calendar
### ✅ Improvement: Profile Dropdown — Add More Options (Settings link added)
### ✅ Improvement: Improve Accessible Labels on Icon-Only Buttons
### ✅ Improvement: Increase Secondary Text Color Contrast (`text-gray-500` → `text-gray-600` across all components)

---

## Tier 1 — Foundations

These are the features that make famcal.ai complete and trustworthy enough to become a household's primary calendar. All must ship before viral/growth features.

### ✅ Natural Language Event Creation
Type or speak plain English → event is created. Powered by OpenAI. Core feature, already implemented. See `/features/natural-language-interaction.md`.

### ✅ Email Invites with iCal Attachments
Send calendar invites to family members via email. Already shipped.

### ✅ Daily Email Digest
6 PM email summarizing tomorrow's events. Configurable time. Already shipped. See `/features/notifications.md`.

### ✅ Natural Language Event Modification and Queries
Full NLP CRUD via the bottom bar — create, update, delete, and query events in plain English. "Move my dentist to Thursday", "Cancel soccer practice", "What's on next week?" all work. Disambiguation shown when multiple events match. See `/features/natural-language-interaction.md`.

### ✅ Family Members as First-Class Entities
Named, color-coded family member profiles. Tag events to members in EventForm. Filter calendar by member via pill filter. Colored dots on event cards. Managed in Settings. See `/features/family-members.md`.

### ✅ NLP Family Member Tagging
"Add soccer practice for Maya at 3pm" correctly tags Maya on the event. Names extracted from NLP input, fuzzy-matched against actual family members. See `/features/nlp-family-member-tagging.md`.

### ✅ Full Onboarding Flow
**Shipped:** 5-step guided setup shown to new users on first login.

- Step 0: Welcome screen with feature highlights
- Step 1: Add family members (name + color picker, saved immediately)
- Step 2: Notification preferences (digest toggle + send time)
- Step 3: Email recipients (who gets calendar invites)
- Step 4: Try NLP — pre-filled example, live event creation
- Skippable at any step; X button exits the whole flow
- Step persisted in `localStorage` so partial progress survives a refresh
- `onboardingCompleted` flag stored in `user_settings`; flow never shown again once completed

### 🎯 Recurring Events
**Why:** A calendar without solid recurring events feels like a prototype. Weekly practices, school pickups, and standing appointments are the majority of a family's schedule. This is table-stakes functionality.

- Basic implementation already exists; needs polish for complex patterns
- Patterns: daily, weekly, bi-weekly, monthly, first Monday of month
- School-year-aware: recur with exceptions (e.g. no practice on holidays)
- Edit one / edit all / edit this and future — standard recurrence UX
- NLP support: "Add piano every Monday at 4pm"

### 🎯 2-Way Google Calendar Sync
**Why:** The single biggest adoption barrier. "I already use Google Calendar" is a hard objection if there's no bridge. Sync removes the switching cost and lets famcal.ai coexist with existing family workflows.

- Import events from Google Calendar into famcal.ai
- Push famcal.ai events back to Google Calendar
- Incremental sync (not full re-import on every request)
- Handle conflicts gracefully (last-write-wins or explicit merge UI)
- OAuth scope: `https://www.googleapis.com/auth/calendar` (already have Google OAuth, scope extension needed)

---

## Tier 2 — Growth & Delight

Features that create memorable moments and drive word-of-mouth once the foundation is solid.

### 🎯 Photo / Flyer → Events (Bulk Import)
**Why it's a viral demo moment:** Snap a photo of a soccer season schedule, school holiday list, or sports flyer → AI extracts all dates and creates events in bulk. This is a 10-minute manual task turned into 10 seconds.

- Use OpenAI vision API to extract structured event data from images
- Show a confirmation screen with all parsed events before creating
- "Share image" entrypoint from mobile share sheet (iOS/Android)

---

## Pending Queue — Not Yet Prioritized

These are good ideas. They will be ordered and tiered when the Tier 1 foundation is complete.

| Feature | Notes |
|---|---|
| Family-Wide Weekly View | Week grid, one column per family member, conflict highlighting |
| Weekly Family Briefing | Sunday evening email summarizing the whole week |
| Per-Member iCal Feed URLs | Subscribe from Google/Apple Calendar; removes "I use Google" objection |
| Conflict Detection & Alerts | Proactive flag when two members overlap |
| Smart Reminders with Travel Buffer | "Leave by 3:45 to make 4pm soccer" |
| Voice Input (Mobile) | Whisper API; most natural on mobile |
| Event Templates | Soccer season, school year, weekly routine |
| "Add to FamCal" Browser Extension | Right-click any webpage date/event |
| WhatsApp / SMS Bot | Forward messages → AI parses → event created. Spec ready in `/features/whatsapp-sms-bot.md`. Revisit after foundations complete. |
| School/Sports League Integrations | TeamSnap, SportsEngine direct import |
| Location-Aware Commute Planning | Google Maps integration for travel-time reminders |
| Shared Grocery / Task Lists | Cozi-style; validate demand before building |
| Calendar Empty-State Nudge | Low-effort discoverability for family member filter |

---

## Open Access — Remove Private Beta Restriction

**Status:** 💡 Not yet prioritized

**Context:** famcal.ai launched in private beta on 2026-02-22 with access restricted to an email allowlist (`ALLOWED_EMAILS` env var on the server). The login page shows a "private beta" banner. Before opening to the public, do the following:

1. Remove or unset `ALLOWED_EMAILS` from Heroku config (`heroku config:unset ALLOWED_EMAILS --app simple-family-calendar`)
2. Update or remove the beta banner on the `Login.tsx` page
3. Optionally: add a waitlist / early-access signup form instead of a hard block

**When to do this:** Once the core product is stable enough for general users and you're ready to grow.

---

## What NOT to Build (Yet)

- **Full chat/AI assistant UI** — The NLP input embedded in the calendar is enough for now. A dedicated chat view adds navigation complexity. Revisit after multi-channel is working.
- **Native mobile app (React Native)** — Capacitor wrapper is sufficient until retention metrics justify the investment.
- **Team/work calendars** — Stay family-focused. Generic work scheduling is Google Calendar's territory.
- **Payments / premium tier** — Validate the core value proposition first before monetization complexity.

---

## Open Questions to Resolve

1. Should family members have their own login accounts, or is the family calendar always owned by one "admin" parent?
2. What's the right confirmation UX for WhatsApp-parsed events — reply in WhatsApp, or require opening the app?
3. For the weekly briefing, should it go to one parent, all adults, or be configurable?
4. Privacy model for children's events — should kids be able to see their own events on the family calendar?
