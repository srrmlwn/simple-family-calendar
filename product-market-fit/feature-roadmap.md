# Feature Roadmap

_Last updated: 2026-02-23 (multi-parent co-manager access shipped)_

Prioritized by expected impact on adoption, retention, and differentiation. Features already shipped or in active development are noted.

> **Current focus:** Tier 1 complete — NLP CRUD, Family Members, Onboarding, Daily Digest, Email Invites, Google Calendar Import, Recurring Events, NLP-driven Google Calendar sync, and Multi-parent / co-manager access all shipped. Next: Tier 2 growth features (Photo → Events, Conflict Detection, iCal Feeds).

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

### ✅ Multi-Parent / Co-Manager Access
**Why:** Without this, famcal.ai is a single-user tool with family branding. In a two-parent household, the second parent either doesn't engage or both share one login — neither is acceptable for a product whose core promise is *shared* family coordination. This is the single biggest adoption multiplier for household-wide usage.

- "Invite a co-manager" flow in Settings — sends a tokenized email invite (7-day expiry)
- Invitee visits `/accept-invite?token=xxx`, signs in with Google, and accepts
- Co-manager lands directly on the owner's calendar — same events, family members, settings
- JWT carries `managingFamilyId`; `effectiveUserId()` scopes all data queries transparently
- Co-managing banner shown in app header; co-managers blocked from sending further invites
- Owner can revoke pending invites and remove active co-managers from Settings

### ✅ Recurring Events
**Why:** A calendar without solid recurring events feels like a prototype. Weekly practices, school pickups, and standing appointments are the majority of a family's schedule. This is table-stakes functionality.

- Basic implementation already exists; needs polish for complex patterns
- Patterns: daily, weekly, bi-weekly, monthly, first Monday of month
- School-year-aware: recur with exceptions (e.g. no practice on holidays)
- Edit one / edit all / edit this and future — standard recurrence UX
- NLP support: "Add piano every Monday at 4pm"

### ✅ Google Calendar Import (one-way)
One-way import from Google Calendar into famcal.ai. Import button in calendar toolbar. OAuth separate from login (calendar.readonly scope). Deduplicates by `externalId`. Imports 30 days past → 12 months future.

### ✅ NLP-Driven Google Calendar Sync
**Why:** The Import button is discoverable but manual. Power users should be able to trigger a sync via natural language, and eventually have it happen automatically.

- **NLP trigger:** "Sync my Google Calendar", "Import from Google" → calls the import endpoint directly from the NLP bar
- **Proactive sync setting:** Toggle in Settings → "Auto-sync Google Calendar" with frequency options (on login, every hour, daily). Stored in `user_settings`. Server-side scheduler calls import on the configured cadence.
- **Sync status in UI:** Last synced timestamp shown near the Import button
- **2-way sync (future):** Push famcal.ai events back to Google Calendar; handle conflicts (last-write-wins or merge UI); requires `calendar` scope upgrade

### 💡 2-Way Google Calendar Sync
Push famcal.ai events to Google Calendar + handle conflicts. Requires upgrading OAuth scope from `calendar.readonly` → `calendar`. Incremental sync preferred over full re-import.

---

## Tier 2 — Growth & Delight

Features that create memorable moments and drive word-of-mouth once the foundation is solid.

### 🎯 Photo / Flyer → Events (Bulk Import)
**Why it's a viral demo moment:** Snap a photo of a soccer season schedule, school holiday list, or sports flyer → AI extracts all dates and creates events in bulk. This is a 10-minute manual task turned into 10 seconds.

- Use OpenAI vision API to extract structured event data from images
- Show a confirmation screen with all parsed events before creating
- "Share image" entrypoint from mobile share sheet (iOS/Android)

### 💡 Ambient Family Dashboard ("TV Mode")
**Why:** Skylight sells a $149 hardware device + $39/year subscription whose only job is showing the family calendar on a wall screen. famcal.ai can replace it entirely in software. A shareable URL anyone can bookmark, cast to a TV, or open on a kitchen iPad — no hardware purchase required.

- Settings → "Family Dashboard" → generates a secret, shareable URL (no login needed to view)
- Renders a full-screen weekly view: color-coded by family member, large font, auto-refreshes every few minutes
- "Tomorrow at a glance" section at the top for the most time-sensitive view
- Works on any device: Fire TV Stick browser, old iPad, smart TV browser
- Direct competitive answer to Skylight — same value, zero hardware cost, AI-powered input

### 💡 Push Notifications / Browser Notifications
**Why:** The daily email digest tells you what's tomorrow. Push tells you what's *now*. Without timely reminders, famcal.ai loses the "don't forget" moment to the phone's built-in clock app — and that erodes perceived value fast.

- Request browser/app push permission during onboarding (or on first event creation)
- Configurable per-event reminders: 15 min, 1 hour, 1 day before
- Smart defaults: short events → 45-min reminder; all-day events → morning-of
- NLP support: "Remind me about Maya's recital 2 hours before"
- Server-side delivery via Web Push API (no third-party service required for browser push; Capacitor push for native app)

### 💡 Per-Member iCal Feed URLs
**Why:** The single biggest objection from the second parent is "I already use Google Calendar." A per-member iCal feed removes that objection entirely — they can subscribe from any calendar app and see famcal.ai events without switching tools. famcal.ai becomes the source of truth without requiring anyone to change their habits.

- Settings → each family member has a "Subscribe" button that copies a secret iCal URL
- URL format: `/api/feed/<secret-token>/member/<id>.ics` — serves a live iCal feed
- A family-wide feed (all members combined) also available
- Deduplicates with any existing Google Calendar import to avoid double-entries
- Moved up from Pending Queue — high ROI, relatively low build effort

### 💡 Conflict Detection & Alerts
**Why:** Families with multiple kids regularly double-book without realizing it. A proactive flag at creation time ("⚠️ Maya already has soccer at 4pm Thursday") prevents the trust-eroding "I didn't realize there was a conflict" moment. No competitor does this well.

- On event create/edit: server checks for overlapping events for any tagged family member
- Inline warning in EventForm before saving — non-blocking (user can override)
- NLP query: "Do we have any conflicts next week?" lists all overlapping events
- Weekly digest optionally includes a "Conflicts this week" section
- Moved up from Pending Queue

### 💡 Weekly Family Briefing (Sunday Evening Email)
**Why:** The Sunday planning ritual is deeply ingrained in family households. An automated email showing the full week ahead builds a strong recurring habit and reinforces famcal.ai as the family command center — not just a place to log events.

- Sunday ~6pm: email with the full week's events, organized by day, color-coded by family member
- Highlights conflicts detected, if any
- Configurable: recipients (both parents), send time, toggle on/off
- Subject line personalised: "This week for the Smiths — 5 things on the calendar"
- Reuses DigestService infrastructure; incremental build on the existing daily digest
- Moved up from Pending Queue

### 💡 Chore & Task Lists (Lightweight, NLP-Driven)
**Why:** Cozi's grocery list and chore tracking is the primary reason families stay on it despite dated UX. A lightweight, NLP-driven task list neutralizes that advantage without requiring a full project management UI.

- "Things to do" section alongside the calendar (not a separate app)
- NLP: "Remind me to pick up Maya's cleats this weekend" → task, not a calendar event
- Assignable to family members: "Buy birthday present for Jake — Sarah"
- Tasks appear in the weekly briefing email
- Scope: simple checklist only — not projects, subtasks, or due-date tracking

---

## Pending Queue — Not Yet Prioritized

These are good ideas. They will be ordered and tiered when the Tier 1 foundation is complete.

| Feature | Notes |
|---|---|
| Family-Wide Weekly View | Week grid, one column per family member, conflict highlighting |
| Smart Reminders with Travel Buffer | "Leave by 3:45 to make 4pm soccer" — requires Google Maps API |
| Voice Input — Whisper Upgrade | Basic voice input via Web Speech API already live. Upgrade to OpenAI Whisper API for offline/native support and better accuracy. |
| Event Templates | Soccer season, school year, weekly routine — good for power users |
| "Add to FamCal" Browser Extension | Right-click any webpage date/event |
| WhatsApp / SMS Bot | Forward messages → AI parses → event created. Spec ready in `/features/whatsapp-sms-bot.md`. Revisit after foundations complete. |
| School/Sports League Integrations | TeamSnap, SportsEngine direct import |
| Location-Aware Commute Planning | Google Maps integration for travel-time reminders |
| Calendar Empty-State Nudge | Low-effort discoverability for family member filter |

_Note: Weekly Family Briefing, Per-Member iCal Feed URLs, and Conflict Detection have been promoted to Tier 2._

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
5. ✅ Multi-parent access model: shipped as option (a) — invite-based co-manager joining the owner's family account. Option (b) (linked separate accounts) remains a future consideration for blended/divorced family structures.
