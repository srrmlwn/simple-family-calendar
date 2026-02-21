# Feature Roadmap

_Last updated: 2026-02-21_

Prioritized by expected impact on adoption, retention, and differentiation. Features already shipped or in active development are noted.

> **Current focus:** Tier 0 design & polish items must be resolved before new feature work begins. See below.

---

## How to Track Work

This file is the single source of truth for what to build and what's in flight.

- **Change a status symbol** when you start or finish something (e.g. 🎯 → 🚧 when you begin, 🚧 → ✅ when shipped).
- **Tier 0** is the active sprint. Work through it top-to-bottom before touching Tier 1+.
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

## Tier 0 — Design & Polish (Fix Before New Features)

_Identified via Puppeteer design audit on 2026-02-21. These are blocking: no new feature work starts until all are resolved._

### 🎯 Fix: Duplicate "Sign in with Google" Button on Login Page
Two Google OAuth buttons render inside the login card — one standalone, one overlapping the email/password form. Likely a component or conditional rendering bug.
- Audit source: login page screenshot shows two `Sign in with Google` buttons in the same card
- Fix: audit `Login.tsx` (or equivalent) for duplicated `<GoogleLogin />` render

### 🎯 Fix: TypeScript Compilation Errors in AuthContext (Visible on Mobile)
The React dev error overlay ("Compiled with problems") is visible on mobile viewport, covering the UI.
- `TS2554` at `AuthContext.tsx:99` — `getCurrentUser(token)` called with 1 argument, expects 0
- `TS2345` at `AuthContext.tsx:123` and `:142` — `AuthResponse` type not assignable to `{ user: User; token: string; }`
- Fix: resolve type mismatches in `AuthContext.tsx`; run `npm run type-check` to confirm clean

### 🎯 Fix: Event Creation Not Triggered by Clicking Empty Date Cells
Single-clicking an empty date cell on the mini-calendar does not open the event creation form. There is no visible `+` button on the calendar either. Users have no obvious path to create events except via NLP input.
- Add a `+` button to the mini-calendar header or on hover over each date cell
- Or handle single/double click on a date cell to open `EventForm` with that date pre-filled

### 🎯 Fix: "Save Preferences" Button in Settings is Not `type="submit"`
The button in Daily Digest Settings is a plain `<button>` without `type="submit"`, so pressing Enter in a form field does not trigger it. Change to `type="submit"` or ensure the surrounding `<form>` has an `onSubmit` handler wired up.

### 🎯 Fix: 1 Button Missing Accessible Label
One button on the main page has no `textContent`, `title`, or `aria-label`. Likely the NLP send (arrow-up) button — confirm and add `aria-label="Send"` (or `title="Send"`).

### 🎯 Fix: 1 Input Missing Label or aria-label
One visible input is not associated with a `<label>` element and has no `aria-label`/`aria-labelledby`. Identify via dev tools and add the appropriate label.

### 🎯 Fix: No "Forgot Password" Link on Login Page
Users who forget their password have no self-service recovery path. Add a "Forgot password?" link below the Sign in button that triggers a password reset email flow.

### 🎯 Improvement: Add Event Indicator Dots to Mini Calendar
Dates with events show no visual indicator in the mini-calendar grid — users cannot tell which days are busy without clicking each one. Add a small dot or count badge below dates that have events, similar to Apple Calendar's mini-calendar.

### 🎯 Improvement: Profile Dropdown — Add More Options
The profile dropdown currently only shows "Sign Out". At minimum add a link to Settings and a "Help / Feedback" option so users don't have to hunt for the gear icon.

### 🎯 Improvement: Improve Accessible Labels on Icon-Only Buttons
The mic, send (arrow-up), and settings buttons rely on `title=` for screen-reader labeling. `title` is not reliably announced by all assistive technologies — replace or supplement with `aria-label` on each.
- Mic button: `aria-label="Start voice input"`
- Send button: `aria-label="Send"`
- Settings button: `aria-label="Settings"`

### 🎯 Improvement: Increase Secondary Text Color Contrast
Secondary text throughout the app uses `text-gray-500` on a white background (~4.6:1 contrast ratio). This meets WCAG AA minimum but fails AAA. Replace with `text-gray-600` for body/secondary text to improve readability for users with low vision.

---

## Tier 1 — Core Differentiators

These are the features that answer "why use famcal.ai instead of Google Calendar?"

### ✅ Natural Language Event Creation
Type or speak plain English → event is created. Powered by OpenAI. Core feature, already implemented. See `/features/natural-language-interaction.md`.

### ✅ Email Invites with iCal Attachments
Send calendar invites to family members via email. Already shipped.

### ✅ Daily Email Digest
6 PM email summarizing tomorrow's events. Configurable time. Already shipped. See `/features/notifications.md`.

### ✅ Natural Language Event Modification and Queries
Full NLP CRUD via the bottom bar — create, update, delete, and query events in plain English. "Move my dentist to Thursday", "Cancel soccer practice", "What's on next week?" all work. Disambiguation shown when multiple events match. See `/features/natural-language-interaction.md`.

### 🎯 WhatsApp / SMS Bot Integration
**Why it's #1 priority:** Parents already forward event info via WhatsApp. Forward any message to a famcal.ai phone number → AI parses it → event added to calendar. Zero friction. No other calendar does this.

- Implementation: Twilio (SMS/WhatsApp) webhook → same NLP parser used for the chat interface
- Confirmation reply back to the user with parsed details before creating
- Deep link to view/edit the created event

### 🎯 Family Members as First-Class Entities
**Why:** Right now recipients are just email contacts. Family members should be named, persistent, and taggable on any event.

- Named family member profiles (e.g., "Maya - age 10", "Dad")
- Tag any event to one or more family members
- Filter calendar by family member
- Foundation for the family-wide view and per-member iCal feeds

### 🎯 Family-Wide Weekly View
**Why:** The visual answer to "who has what this week?" — a grid with a column per family member. Instantly surface conflicts. This is the view that makes famcal.ai feel family-native.

- Week grid, one column per family member
- Color-coded by member
- Conflict highlighting (two members with overlapping events)
- "Who needs a ride?" surface (events with location that overlap in time)

---

## Tier 2 — Strong Retention Features

These keep users coming back and building habits.

### 🎯 Weekly Family Briefing
A Sunday evening email (or WhatsApp message) summarizing the whole family's upcoming week. More valuable than the daily digest because it helps parents plan logistics.

- Grouped by day, then by family member
- Highlights conflicts
- One-click to view in app

### 💡 Per-Member iCal Feed URLs
Each family member gets a unique iCal subscription URL. Subscribe from Google Calendar, Apple Calendar, or any other app. Removes the "but I already use Google" objection — famcal.ai becomes the source of truth.

### 💡 Conflict Detection and Alerts
When two family members have overlapping events (especially with location), proactively flag it.

- "Both kids have practice at the same time on Tuesday"
- "Dad's flight arrives at 3pm but school pickup is also at 3pm"
- Integrates naturally with the family-wide view

### 🚧 Recurring Events
Already has basic implementation. Needs polish for complex patterns (bi-weekly, first Monday of month, school year schedule with exceptions).

### 💡 Smart Reminders with Travel Buffer
"Leave by 3:45 to get to soccer by 4:00" — use event location to compute departure time. Surface as a pre-event notification rather than just an alarm.

---

## Tier 3 — Acquisition and Viral Features

These drive new user sign-ups and word-of-mouth.

### 🎯 Photo / Flyer → Events (Bulk Import)
**Why it's a viral demo moment:** Snap a photo of a soccer season schedule, school holiday list, or sports flyer → AI extracts all dates and creates events in bulk. This is a 10-minute manual task turned into 10 seconds.

- Use OpenAI vision API to extract structured event data from images
- Show a confirmation screen with all parsed events before creating
- "Share image" entrypoint from mobile share sheet (iOS/Android)

### 💡 Voice Input (Mobile-First)
On mobile, voice is the most natural input. "Hey FamCal, add piano lesson every Monday at 4pm" while driving. Already in the NLP spec; Whisper API is the implementation path.

### 💡 Event Templates
Pre-built templates for common recurring structures:
- Soccer season (practices + game days)
- School year (with holiday auto-population by district)
- Weekly routine (homework time, bedtime, recurring errands)

### 💡 "Add to FamCal" Browser Extension
Right-click any date/event on a webpage or forward an email → parse and add to calendar. Useful for school websites, sports league pages, etc.

---

## Tier 4 — Ecosystem and Platform

These expand the addressable market and create lock-in.

### 🚧 2-Way Google Calendar Sync
Already in README as a planned feature. Import from and sync back to Google Calendar. Critical for users who don't want to abandon their existing setup.

### ❓ School/Sports League Integrations
Direct import from platforms like TeamSnap, SportsEngine, or school portals. Reduces setup friction significantly but requires per-integration engineering.

### ❓ Location-Aware Commute Planning
Integration with Google Maps / Apple Maps to compute travel time and surface "leave by X" reminders. Depends on family members' locations being stored (privacy consideration).

### ❓ Shared Grocery / Task Lists (Cozi-style)
Cozi's success is partly due to combining calendar + lists. Adds complexity but expands the "family OS" positioning. Validate first whether users want this in famcal.ai vs. a dedicated list app.

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
