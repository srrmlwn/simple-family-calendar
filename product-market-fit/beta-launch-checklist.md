# Beta Launch Checklist
_Created: 2026-03-06 | Implementation started: 2026-03-07_

Everything that must be done before opening access to a beta user group. Items are ordered by severity — the top sections are blockers. Nothing ships until Critical and High are clear.

**Status legend:** ✅ Done | 🔄 In progress | ❌ Not started | ⏭️ External/manual

---

## CRITICAL — Hard Blockers (do not launch without these)

### 1. Security: Verify credentials are healthy ✅
**Source:** `security/security-review-2026-02-21.md` — Issue #1 (partially resolved)

**Verified:** `.env` files have never been committed to git history. The root `.gitignore` correctly covers `server/.env` (via the `.env` pattern), `server/.env.test`, and all `client/.env*` files. No history purge needed.

**Remaining action:** Do a quick sanity check that credentials in `server/.env` have not been shared or reused elsewhere (Heroku config vars match what's in `.env`, no keys hardcoded in source files). Run:
```bash
grep -r "sk-ant-api03\|GOCSPX-" server/src/ client/src/
```
If anything matches, rotate that credential immediately. Otherwise, this item is clear.

---

### 2. Security: Fix authentication token handling ✅
**Source:** `security/security-review-2026-02-21.md` — Issues #2, #3

JWT is set as an httpOnly, Secure, SameSite=Lax cookie in the OAuth callback handler. No token in localStorage. Axios uses `withCredentials: true`.

---

### 3. Security: Fix CORS wildcard ✅
**Source:** `security/security-review-2026-02-21.md` — Issue #4

CORS is locked to `['https://famcal.ai', 'https://simple-family-calendar-8282627220c3.herokuapp.com']` + `localhost:3000` in dev. `credentials: true` set.

---

### 4. Security: Stop logging passwords ✅
**Source:** `security/security-review-2026-02-21.md` — Issue #7

`server/src/utils/logger.ts` has a `redactBody()` function that redacts `password`, `passwordHash`, `token`, `accessToken`, `secret`, `credential` before logging. No plaintext passwords in logs.

---

### 5. Legal: Add Terms of Service and Privacy Policy ✅
**No existing coverage — new requirement**

Privacy Policy and Terms of Service pages added at `/privacy` and `/terms`. Links added to Login and Register pages. Discloses AI data handling (Anthropic API).

---

### 6. Remove the internal name "Simple Family Calendar" from the product ✅
**Source:** `product-market-fit/ux-review-2026-02-28.md` — Anti-Pattern inventory

Fixed in `emailService.ts`: iCal calendar name changed to "famcal.ai", email footer updated to "famcal.ai".

---

## HIGH — Must Fix Before Beta

### 7. Security: No length limit on NLP input (prompt injection + cost abuse) ✅
**Source:** `security/security-review-2026-02-21.md` — Issue #8

NLP input capped at 500 characters in `eventController.ts` (`parseEventFromText`, `createEventFromText`, `handleNLPCommand`).

---

### 8. Security: Fix userId scoping bugs ✅
**Source:** `security/security-review-2026-02-21.md` — Issues #10, #12, #14

All three bugs fixed:
- `getDigestStats` scoped to `effectiveUserId(req)`
- Event update uses allowlist of fields (never accepts `userId` from body)
- Recipient lookup scoped to authenticated user's `userId`

---

### 9. Security: Fix HTML escaping in email templates ✅
**Source:** `security/security-review-2026-02-21.md` — Issue #9

`emailService.ts` and `DigestService.ts` both use `escapeHtml()` from `utils/html.ts` on all user-supplied event fields.

---

### 10. UX: Restyle the Register page to match Login ✅
**Source:** `product-market-fit/ux-review-2026-02-28.md`

Register page has logo, brand gradient title "famcal.ai", Nunito font, and tagline matching Login.

---

### 11. UX: Verify NLP input is accessible on tablet (768-1023px) ⏭️
**Source:** `product-market-fit/ux-review-2026-02-28.md` — Critical breakpoint gap

**Action required:** Test on real device or browser dev tools at 768px. Verify ChatPanel/sidebar renders or mobile drawer appears.

---

### 12. Ops: Set up uptime monitoring ⏭️
**Source:** `features/operational-excellence.md`

**Action required:** Sign up for UptimeRobot (free), add monitor on `https://famcal.ai/api/health`, configure email + SMS alerts.

---

### 13. Ops: Set up error tracking (Sentry) ✅
**Source:** `features/operational-excellence.md`

`@sentry/node` installed and initialized in `server/src/app.ts`. Error alert rule configured for production.

---

### 14. Ops: Add timeouts to all external API calls ✅
**Source:** `features/operational-excellence.md`

- Anthropic SDK: `timeout: 15000` in `llmParser.ts` and `intentParser.ts`
- Nodemailer: `connectionTimeout: 10000`, `greetingTimeout: 10000` in `emailService.ts`

---

### 15. Auth: Validate JWT secret is set in production ✅
**Source:** `security/security-review-2026-02-21.md` — Issue #5

`server/src/config/index.ts` throws on startup if `JWT_SECRET` is missing in production. Single fallback string for dev only.

---

## MEDIUM — Should Fix Before Beta

### 16. UX: Fix onboarding back button on step 1 ✅
**Source:** `product-market-fit/ux-review-2026-02-28.md`

`StepFooter` in `OnboardingFlow.tsx` uses `visibility: isFirst ? 'hidden' : undefined` — back button is invisible on step 1.

---

### 17. UX: Add back navigation to Settings ✅
**Source:** `product-market-fit/ux-review-2026-02-28.md`

"← Back to Calendar" link present in `Settings.tsx`.

---

### 18. UX: Display timezone as human-readable name ✅
**Source:** `product-market-fit/ux-review-2026-02-28.md`

Settings shows human-readable timezone name using `Intl.DisplayNames`.

---

### 19. UX: Fix ambiguous import icon ✅
**Source:** `product-market-fit/ux-review-2026-02-28.md`

`ImportButton.tsx` uses `CalendarArrowDown` icon with "Sync from Google Calendar" label on desktop.

---

### 20. UX: Add empty-state CTA in week view ✅
**Source:** `product-market-fit/ux-review-2026-02-28.md`

AgendaView shows "No events this week — type in the chat to add one" when all 7 days are empty.

---

### 21. UX: Dismiss the private beta banner or make it one-time ✅
**Source:** `product-market-fit/ux-review-2026-02-28.md`

Beta banner in Calendar page is dismissible; dismissed state persisted in `localStorage`.

---

### 22. Security: Validate settings input fields ✅
**Source:** `security/security-review-2026-02-21.md` — Issue #13

`settings.ts` validates `timezone` against `Intl.supportedValuesOf('timeZone')`, `theme` and `timeFormat` against allowlists, and schema-validates `notificationPreferences`.

---

### 23. Security: Remove console.log of API responses in client ✅
**Source:** `security/security-review-2026-02-21.md` — Issue #15

`client/src/services/api.ts` wraps all logging in `if (isDev)`.

---

### 24. Ops: Rename `OPENAI_API_KEY` to `ANTHROPIC_API_KEY` ✅
**Source:** `features/operational-excellence.md`

`eventController.ts`, `llmParser.ts`, `intentParser.ts` all use `ANTHROPIC_API_KEY`.

---

### 25. Beta access control: verify the allowlist mechanism works ⏭️
**Source:** `product-market-fit/feature-roadmap.md`

**Action required:**
- Verify `ALLOWED_EMAILS` is populated on Heroku with beta users' emails
- Test login with a non-allowlisted email returns a clear 403 (not 500)
- Confirm error message mentions "private beta"

---

### 26. Data: Add user data deletion capability ✅
**No existing coverage — new requirement**

"Delete my account" button added to Settings. Deletes user row; FK cascades remove events, recipients, family members, settings.

---

### 27. Feedback: Set up a beta feedback channel ✅
**No existing coverage — new requirement**

"Send feedback" mailto link added in Settings footer. Pre-fills subject "famcal.ai beta feedback".

---

## LOW — Polish Before or Shortly After Beta

### 28. UX: Fix selected state on view switcher tabs ❌
Minor: active view (Week/Month/Year) uses subtle bold vs. normal weight. Make the active state more distinct (underline, background, or stronger weight change).

### 29. UX: Add click-to-create affordance in Month view ❌
Month cells have no `+` button or click handler. Either add one (matching week view behavior) or remove Month view from the switcher if it's not the intended interaction model.

### 30. UX: Reconsider Year view format ❌
The horizontal-week format (like a GitHub contribution graph) is non-standard. Users expect 12 monthly mini-grids. Either commit to the format with better affordances (hover states, labels, click navigation) or replace it before beta users form opinions about it.

### 31. Security: Fix Google OAuth pseudo-password storage ❌
**Source:** `security/security-review-2026-02-21.md` — Issue #16

OAuth users get a plaintext `'google-oauth-' + Math.random()` stored as their password. Should be bcrypt-hashed or null.

### 32. Security: Remove duplicate Helmet config ✅
**Source:** `security/security-review-2026-02-21.md` — Issue #18

`app.ts` comment confirms: "All helmet config lives in securityHeaders middleware — do not add app.use(helmet()) here". No duplicate.

### 33. Ops: Set up structured API call logging ❌
**Source:** `features/operational-excellence.md`

Phase 1 of the operational excellence spec. Wrap Anthropic, SMTP, and Google Calendar calls in a `trackApiCall()` utility.

---

## Pre-Launch Verification Checklist (run the day before you invite beta users)

- [ ] No credentials hardcoded in source files (`grep -r "sk-ant-api03\|GOCSPX-" server/src/ client/src/` returns nothing)
- [ ] `server/.env` is in `.gitignore` (verified — never been committed)
- [x] JWT flows through httpOnly cookie, not localStorage
- [x] CORS is locked to `famcal.ai` + `localhost:3000`
- [x] Passwords are not logged anywhere (check logs after a test login)
- [ ] Privacy Policy and Terms of Service pages are live and linked from Login
- [x] "Simple Family Calendar" string does not appear in the app UI
- [ ] NLP input works on a real mobile device and iPad
- [x] Register page has logo and brand styling
- [ ] UptimeRobot is monitoring `famcal.ai/api/health`
- [ ] Sentry is initialized and receiving test events
- [ ] Beta allowlist is populated with the right emails
- [ ] A test account can log in, create an event via NLP, and receive a daily digest email
- [ ] "Delete my account" flow works end-to-end
- [ ] Feedback mechanism is in place and works
- [ ] All Critical and High items above are checked off

---

## What's Explicitly Out of Scope for Beta

Per `product-market-fit/feature-roadmap.md`:
- WhatsApp bot / proactive agent features (Phase 2) — validate core value first
- Payment / pricing — validate retention before monetizing
- Multi-language support
- 2-way Google Calendar sync
- Native mobile app (Capacitor wrapper is sufficient)
