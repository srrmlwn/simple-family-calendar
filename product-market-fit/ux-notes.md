# UX Notes — kinroo.ai
_Consolidated from reviews on 2026-02-23 and 2026-02-28_

## Core Metric

> **What % of event creations happen via NLP vs. clicking the calendar?**

Target: >70% via NLP. Evaluate every UX change against this.

---

## Current State (as of 2026-02-28)

**What's working well:**
- Chat sidebar on desktop (340px, proper message thread + event cards) — big step up from old bottom bar
- Vaul drawer on mobile — snap point approach (120px collapsed / 60% expanded) is right
- Rotating placeholder suggestions in input bar — teaches vocabulary without a tutorial
- 7-day week grid as default view — good information density
- Color-coded family members — cohesive throughout
- Onboarding trimmed to 3 steps — better pacing

**Architecture:** `[Calendar grid] [340px chat sidebar]` on desktop, `[Calendar] [vaul bottom drawer]` on mobile. Desktop sidebar requires `min-width: 1024px`.

---

## Open Issues

### Critical
- **Tablet 768–1023px: NLP input may be invisible.** Desktop sidebar absent (needs 1024px), vaul drawer rendering unverified. iPad Portrait users may have no visible AI input entry point. Needs real-device test before beta. _(Beta checklist item #11)_

### Remaining (post-beta polish)
- **Year view is non-standard.** Horizontal-week format (like a GitHub contribution graph) confuses users expecting 12 monthly mini-grids. Either commit to it with better legibility (larger month labels, hover states) or offer a traditional layout. _(Beta checklist item #30)_
- **Cold start problem.** A new user with no events sees: 7 empty columns, empty sidebar, no strong CTA. Consider a "getting started" prompt that pre-populates the input with a suggested first event.
- **"Calendar AI" sidebar label** feels like a sub-product name. Consider removing it entirely or replacing with an ambient prompt.

### Already Fixed
| Issue | Fix |
|-------|-----|
| Register page had no branding | Styled to match Login (logo, gradient title, Nunito font) |
| "Simple Family Calendar" name leaked | Removed from all client UI and emailService |
| Back navigation missing in Settings | "← Back to Calendar" link added |
| Onboarding back button on step 1 | Hidden with `visibility: hidden` |
| Timezone shown as IANA string | Replaced with `Intl.DateTimeFormat` long name |
| Ambiguous import/download icon | Changed to `CalendarPlus` + "Sync from Google Calendar" label |
| Empty week view had no CTA | Added "Nothing on this week — type in the chat to add events →" |
| Month view had no click-to-create | Added `+` button on day cell hover, navigates to week view |
| Private beta banner not dismissible | Added ✕ button, persisted in localStorage |
| Active state on view switcher too subtle | White background + shadow for active tab |

---

## NLP-First Vision (for post-beta)

The boldest version is not "calendar with NLP" but "AI assistant that keeps your family schedule." The ideal first screen after login:

```
Good morning.
Emma has soccer at 4pm. Dentist tomorrow at 3pm.

[ What's happening this week?           🎤 ▶ ]

──── Today ────
4:00pm  Soccer practice  · Emma
```

Calendar view lives one tap away; NLP input is the home. Medium bets worth a design spike: NLP-first home screen, "Today's briefing" default view, 7-day agenda replacing month grid as default.
