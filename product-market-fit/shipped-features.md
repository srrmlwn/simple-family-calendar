# Shipped Features

_All features here are live in production. Moved from `feature-roadmap.md` to keep the active roadmap focused._

---

## Design & Polish (resolved 2026-02-21)

- ✅ Fix duplicate "Sign in with Google" button on Login page
- ✅ Fix TypeScript compilation errors in AuthContext (visible on mobile)
- ✅ Fix event creation not triggered by clicking empty date cells
- ✅ Fix "Save Preferences" button in Settings not `type="submit"`
- ✅ Fix 1 button and 1 input missing accessible labels
- ✅ Fix "Forgot Password" link missing on Login page
- ✅ Add event indicator dots to mini calendar
- ✅ Profile dropdown — add Settings link
- ✅ Improve accessible labels on icon-only buttons
- ✅ Increase secondary text color contrast (`text-gray-500` → `text-gray-600`)

---

## Tier 1 — Foundations

- ✅ **Natural Language Event Creation** — type plain English → event created, powered by Anthropic
- ✅ **Natural Language Event Modification and Queries** — full NLP CRUD: create, update, delete, query. Disambiguation shown when multiple events match.
- ✅ **Email Invites with iCal Attachments** — send calendar invites to family members via email
- ✅ **Daily Email Digest** — 6 PM email summarizing tomorrow's events (now superseded by WhatsApp morning briefing)
- ✅ **Family Members as First-Class Entities** — named, color-coded profiles; tag events to members; filter calendar by member; managed in Settings
- ✅ **NLP Family Member Tagging** — "Add soccer practice for Maya at 3pm" correctly tags Maya via fuzzy-match
- ✅ **Full Onboarding Flow** — 5-step guided setup: Welcome → Family Members → Notifications → Email Recipients → Try NLP. Skippable at any step.
- ✅ **Multi-Parent / Co-Manager Access** — tokenized email invite (7-day expiry); co-manager sees owner's calendar; `effectiveUserId()` scopes all data queries; owner can revoke
- ✅ **Recurring Events** — daily, weekly, bi-weekly, monthly, first Monday of month; edit one / edit all / edit this and future; NLP support ("Add piano every Monday at 4pm")
- ✅ **Google Calendar Import (one-way)** — OAuth with `calendar.readonly`; deduplicates by `externalId`; imports 30 days past → 12 months future
- ✅ **NLP-Driven Google Calendar Sync** — "Sync my Google Calendar" triggers import; proactive sync toggle with frequency options; last-synced timestamp shown

---

## Tier 2 — Growth & Delight

- ✅ **Photo / Flyer → Events (Bulk Import)** — snap a photo of a soccer schedule or school flyer → AI extracts all dates → confirmation screen → bulk event creation. OpenAI vision API. Mobile share sheet entrypoint.
