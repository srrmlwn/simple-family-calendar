# Feature Spec: Full Onboarding Flow

_Created: 2026-02-22_
_Status: 🚧 Spec written, implementation pending_

---

## Problem

New users land on a blank calendar with zero context. The core differentiators — family members, NLP input, notifications — are invisible or buried in Settings. First-time retention depends on users understanding what famcal.ai does and completing enough setup to see immediate value.

**Current experience:** Login → empty calendar → confusion → churn.

---

## Goal

Walk new users through setup in a single focused flow that:
1. Collects the information needed to make the app useful from day one
2. Introduces the NLP input naturally, not as a tutorial
3. Is skippable at every step — no forced tutorials
4. Takes under 2 minutes to complete in full

---

## User-Facing Behavior

### Entry Point
- Triggers automatically on first login (Google OAuth or email/password)
- Detected via `onboarding_completed: false` in `user_settings`
- Renders as a full-screen overlay on top of the calendar (calendar visible but blurred in background)
- Persists progress: if user refreshes mid-flow, they resume at the same step

### Flow Structure (5 steps)

```
Step 1: Welcome
Step 2: Add Family Members
Step 3: Notification Preferences
Step 4: Email Recipients
Step 5: Try It
```

A simple step indicator (dots or "Step X of 5") shows progress at the top.
A **Skip setup** link in the top-right of every step exits the flow immediately.

---

### Step 1 — Welcome

**Heading:** "Welcome to famcal.ai, [First Name]"
**Subtext:** "You're one setup away from a calendar that actually understands your family."

Three brief value bullets:
- "Talk to your calendar in plain English"
- "Keep track of who has what and when"
- "Get daily reminders so nothing slips through"

**CTA:** "Let's get started →"

No form fields. Pure orientation. Time: ~10 seconds.

---

### Step 2 — Add Family Members

**Heading:** "Who's in your family?"
**Subtext:** "Add the people whose schedules you manage. You can always add more later."

- Inline add-member form (name + color picker), same UI as FamilyMemberManager
- Added members appear in a list below the form
- Can add multiple members before moving on
- Skip link: "Skip for now" (proceeds to Step 3, members can be added in Settings)

**CTA:** "Continue →" (enabled whether or not members were added)

Note: family members added here are immediately persisted via existing `/api/family-members` endpoint.

---

### Step 3 — Notification Preferences

**Heading:** "Stay on top of tomorrow"
**Subtext:** "famcal.ai can email you a daily summary of the next day's events."

- Toggle: "Send me a daily digest" (default: on)
- Time picker: "Send it at" (default: 6:00 PM, same as current default)
- Simple and direct — no digest statistics shown here (that's for Settings)

**CTA:** "Continue →"

Settings saved immediately on Continue via existing `/api/user-settings` endpoint.

---

### Step 4 — Email Recipients

**Heading:** "Who else should get calendar invites?"
**Subtext:** "Add family members or anyone you regularly send event invites to."

- Inline add-recipient form (name + email + "default?" checkbox), same UI as existing email recipients section
- Added recipients appear in a list below
- Skip link: "Skip for now"

**CTA:** "Continue →"

---

### Step 5 — Try It

**Heading:** "Your calendar is ready."
**Subtext:** "famcal.ai understands plain English. Try adding your first event:"

- A read-only NLP input preview showing an example command, e.g.:
  `"Add soccer practice for [first family member name] on Friday at 4pm"`
  (If no family members added, use: `"Add dentist appointment on Thursday at 10am"`)
- A single text input (pre-filled with the example, editable) with a Send button
- Submitting creates the event and shows a success state: "Event added! ✓"
- If user edits the text and submits, uses the actual NLP endpoint
- Skip link: "Go to my calendar"

**CTA after submit:** "Go to my calendar →"
**CTA without submitting:** "Skip, go to my calendar →"

On completing Step 5 (either via submit or skip):
- `onboarding_completed` set to `true` in `user_settings`
- Overlay closes, calendar loads with any events/members just created

---

## Empty State on Calendar (Post-Onboarding)

After onboarding completes, if the user has no events:

In DayView, replace "No events scheduled for this day" with:
> "Nothing here yet. Try: **Add soccer practice for Maya on Friday at 4pm**"

The bold text is a visual suggestion, not a clickable action. It disappears once any event exists for that day.

If no family members exist, the example uses a generic event:
> "Nothing here yet. Try: **Add dentist appointment on Thursday at 10am**"

---

## First-Run Detection Logic

### Backend
- Add `onboarding_completed` boolean column to `user_settings` table (default: `false`)
- New migration: `AddOnboardingCompletedToUserSettings`
- New API endpoint: `POST /api/user-settings/complete-onboarding` — sets flag to true
- Existing `GET /api/user-settings` already returns user settings; add `onboarding_completed` to the response

### Frontend
- `AuthContext` fetches user settings on login and stores `onboardingCompleted` in app state
- `Calendar.tsx` checks `onboardingCompleted`; if false, renders `<OnboardingFlow />` overlay
- `OnboardingFlow` component manages step state locally (no need for server round-trips per step — only save on each step's "Continue" action)
- Step progress stored in `localStorage` as `onboarding_step` so refresh resumes correctly
- On skip or completion: clear `localStorage` key, set `onboarding_completed = true` via API

---

## Files to Touch

### New Files
- `client/src/components/OnboardingFlow.tsx` — main orchestrator, step router
- `client/src/components/OnboardingStep1Welcome.tsx`
- `client/src/components/OnboardingStep2FamilyMembers.tsx`
- `client/src/components/OnboardingStep3Notifications.tsx`
- `client/src/components/OnboardingStep4Recipients.tsx`
- `client/src/components/OnboardingStep5TryIt.tsx`
- `server/src/migrations/XXXXXXXXXX-AddOnboardingCompletedToUserSettings.ts`

### Modified Files
- `client/src/pages/Calendar.tsx` — mount `<OnboardingFlow />` when `!onboardingCompleted`
- `client/src/context/AuthContext.tsx` — expose `onboardingCompleted` state
- `client/src/components/DayView.tsx` — update empty-state message with NLP prompt
- `server/src/controllers/userSettingsController.ts` — add `complete-onboarding` endpoint
- `server/src/routes/userSettingsRoutes.ts` — wire up new endpoint
- `server/src/entities/UserSettings.ts` — add `onboarding_completed` field

---

## Design Principles

- **One thing per step.** Each screen has a single job. No combining family members and notification preferences on the same screen.
- **Skip is always visible.** Never trap the user. The flow should feel like guidance, not a gate.
- **No fake demos.** Step 5 actually creates a real event via the real NLP endpoint. If it fails, show an error but let the user continue anyway.
- **Mobile-first.** The overlay must work on small screens. Steps use the same bottom-sheet-like layout pattern already in the app.
- **No animations needed for v1.** Simple show/hide transitions. Fancy animations can come later.

---

## Acceptance Criteria (Puppeteer Tests)

1. New user who registers → sees onboarding overlay on first calendar load
2. Returning user who has completed onboarding → no overlay
3. User can skip at Step 1 → lands on calendar, `onboarding_completed = true`
4. User can skip at Step 2 → proceeds to Step 3, family members step skipped
5. User adds a family member in Step 2 → member appears in calendar filter after flow completes
6. User sets notification time in Step 3 → digest time persisted in user settings
7. User submits NLP input in Step 5 → event created, visible on calendar
8. User refreshes browser mid-flow (at Step 3) → resumes at Step 3
9. User skips Step 5 → `onboarding_completed = true`, calendar loads
10. Empty state on calendar shows NLP prompt when no events exist and onboarding is complete

---

## Security Considerations

- `complete-onboarding` endpoint must be behind `authenticateToken` middleware (same as all user-settings endpoints)
- No new user inputs that aren't already validated by existing endpoints (family member add, notification prefs, email recipients all reuse existing API routes)
- `onboarding_completed` is user-scoped — no risk of one user affecting another's state
- No new OAuth scopes or third-party calls introduced by this feature

---

## Out of Scope (for this version)

- Re-triggering onboarding (e.g. "redo setup") — can add a "Reset onboarding" link in Settings later
- Per-step analytics / funnel tracking — add after ship
- Onboarding for existing users (retroactive) — existing users already have data; skip flow for them
- Dark mode / theme selection in onboarding — punt to Settings
