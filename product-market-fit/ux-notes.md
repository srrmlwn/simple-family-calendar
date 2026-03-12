# UX Notes — kinroo.ai
_Consolidated from reviews on 2026-02-23 and 2026-02-28_

## Core Metric

> **What % of event creations happen via NLP vs. clicking the calendar?**

Target: >70% via NLP. Evaluate every UX change against this.

---

## Current State (as of 2026-02-28)

**Architecture:** `[Calendar grid] [340px chat sidebar]` on desktop (requires `min-width: 1024px`), `[Calendar] [vaul bottom drawer]` on mobile (snap: 120px collapsed / 60% expanded).

**Working well:**
- Chat sidebar on desktop — proper message thread + event cards
- Vaul drawer on mobile — snap point approach is right
- Rotating placeholder suggestions — teaches vocabulary without a tutorial
- 7-day week grid as default view — good information density
- Color-coded family members — cohesive throughout
- Onboarding trimmed to 3 steps — better pacing

---

## Open Issues

### Critical (beta blocker)
- **Tablet 768–1023px: NLP input may be invisible.** Desktop sidebar absent (needs 1024px), vaul drawer rendering unverified. Needs real-device test before beta. _(Checklist #11)_

### Post-beta polish
- **Year view is non-standard.** Horizontal-week format confuses users expecting 12 monthly mini-grids. Either commit with better legibility or offer traditional layout. _(Checklist #30)_
- **Cold start problem.** New user with no events sees 7 empty columns and no strong CTA. Consider pre-populated input with a suggested first event.
- **"Calendar AI" sidebar label** feels like a sub-product name. Consider removing or replacing with an ambient prompt.

### Already Fixed
| Issue | Fix |
|-------|-----|
| Register page had no branding | Styled to match Login (logo, gradient title, Nunito) |
| "Simple Family Calendar" name leaked | Removed from all client UI and emailService |
| Back navigation missing in Settings | "← Back to Calendar" link added |
| Onboarding back button on step 1 | Hidden with `visibility: hidden` |
| Timezone shown as IANA string | Replaced with `Intl.DateTimeFormat` long name |
| Ambiguous import/download icon | Changed to `CalendarPlus` + "Sync from Google Calendar" |
| Empty week view had no CTA | Added "Nothing on this week — type in the chat to add events →" |
| Month view had no click-to-create | Added `+` button on day cell hover, navigates to week view |
| Private beta banner not dismissible | Added ✕ button, persisted in localStorage |
| Active state on view switcher too subtle | White background + shadow for active tab |

---

## NLP-First Vision (post-beta)

The boldest version: AI assistant that keeps your family schedule. Ideal first screen after login:

```
Good morning.
Emma has soccer at 4pm. Dentist tomorrow at 3pm.

[ What's happening this week?           🎤 ▶ ]

──── Today ────
4:00pm  Soccer practice  · Emma
```

Calendar view lives one tap away; NLP input is the home. Bets worth a design spike: NLP-first home screen, "Today's briefing" default view, 7-day agenda replacing month grid as default.
