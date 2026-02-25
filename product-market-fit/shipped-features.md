# Shipped Features Archive

_All features here are fully shipped and live in production. Moved from `feature-roadmap.md` to keep the active roadmap focused._

---

## Tier 0 — Design & Polish (all resolved 2026-02-21)

_Identified via Puppeteer design audit on 2026-02-21._

- ✅ Fix: Duplicate "Sign in with Google" Button on Login Page
- ✅ Fix: TypeScript Compilation Errors in AuthContext (Visible on Mobile)
- ✅ Fix: Event Creation Not Triggered by Clicking Empty Date Cells
- ✅ Fix: "Save Preferences" Button in Settings is Not `type="submit"`
- ✅ Fix: 1 Button Missing Accessible Label
- ✅ Fix: 1 Input Missing Label or aria-label
- ✅ Fix: No "Forgot Password" Link on Login Page
- ✅ Improvement: Add Event Indicator Dots to Mini Calendar
- ✅ Improvement: Profile Dropdown — Add More Options (Settings link added)
- ✅ Improvement: Improve Accessible Labels on Icon-Only Buttons
- ✅ Improvement: Increase Secondary Text Color Contrast (`text-gray-500` → `text-gray-600` across all components)

---

## Tier 1 — Foundations (all shipped)

### ✅ Natural Language Event Creation
Type or speak plain English → event is created. Powered by OpenAI. See `/features/natural-language-interaction.md`.

### ✅ Natural Language Event Modification and Queries
Full NLP CRUD via the bottom bar — create, update, delete, query. "Move my dentist to Thursday", "Cancel soccer practice", "What's on next week?" Disambiguation shown when multiple events match.

### ✅ Email Invites with iCal Attachments
Send calendar invites to family members via email.

### ✅ Daily Email Digest
6 PM email summarizing tomorrow's events. Configurable time. See `/features/notifications.md`.

### ✅ Family Members as First-Class Entities
Named, color-coded family member profiles. Tag events to members in EventForm. Filter calendar by member via pill filter. Colored dots on event cards. Managed in Settings. See `/features/family-members.md`.

### ✅ NLP Family Member Tagging
"Add soccer practice for Maya at 3pm" correctly tags Maya. Names extracted from NLP input, fuzzy-matched against actual family members. See `/features/nlp-family-member-tagging.md`.

### ✅ Full Onboarding Flow
5-step guided setup shown to new users on first login:
- Step 0: Welcome screen with feature highlights
- Step 1: Add family members (name + color picker)
- Step 2: Notification preferences (digest toggle + send time)
- Step 3: Email recipients (who gets calendar invites)
- Step 4: Try NLP — pre-filled example, live event creation
- Skippable at any step; `onboardingCompleted` flag in `user_settings`

### ✅ Multi-Parent / Co-Manager Access
- "Invite a co-manager" flow in Settings — tokenized email invite (7-day expiry)
- Invitee visits `/accept-invite?token=xxx`, signs in with Google, accepts
- Co-manager sees the owner's calendar — same events, family members, settings
- JWT carries `managingFamilyId`; `effectiveUserId()` scopes all data queries transparently
- Co-managing banner in app header; owner can revoke/remove co-managers from Settings

### ✅ Recurring Events
- Patterns: daily, weekly, bi-weekly, monthly, first Monday of month
- Edit one / edit all / edit this and future — standard recurrence UX
- NLP support: "Add piano every Monday at 4pm"

### ✅ Google Calendar Import (one-way)
One-way import from Google Calendar. OAuth with `calendar.readonly` scope. Deduplicates by `externalId`. Imports 30 days past → 12 months future.

### ✅ NLP-Driven Google Calendar Sync
- NLP trigger: "Sync my Google Calendar" → calls import endpoint directly
- Proactive sync setting: toggle in Settings with frequency options (on login, hourly, daily)
- Last-synced timestamp shown near Import button

---

## Tier 2 — Growth & Delight (shipped)

### ✅ Photo / Flyer → Events (Bulk Import)
Snap a photo of a soccer schedule, school holiday list, or sports flyer → AI extracts all dates → confirmation screen → bulk event creation. Uses OpenAI vision API. Mobile share sheet entrypoint.
