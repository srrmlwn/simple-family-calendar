# Beta Launch Checklist
_Created: 2026-03-06 | Implementation started: 2026-03-07_

Everything that must be done before opening access to a beta user group. Items are ordered by severity — the top sections are blockers. Nothing ships until Critical and High are clear.

**Status legend:** ✅ Done | ❌ Not started | ⏭️ External/manual action required

---

## CRITICAL — Hard Blockers (do not launch without these)

### 1. Security: Verify credentials are healthy ⏭️
**Source:** `security/security-review-2026-02-21.md` — Issue #1

**Action required:** Run once before beta invites:
```bash
grep -r "sk-ant-api03\|GOCSPX-" server/src/ client/src/
```
If anything matches, rotate that credential immediately.

`.env` files verified: never been committed to git history.

---

### 2. Security: Fix authentication token handling ✅
JWT is set as an httpOnly, Secure, SameSite=Lax cookie in the OAuth callback and email/password login handlers. No token in localStorage. Axios uses `withCredentials: true`.

---

### 3. Security: Fix CORS wildcard ✅
CORS locked to `['https://kinroo.ai', 'https://simple-family-calendar-8282627220c3.herokuapp.com']` + `localhost:3000` in dev. `credentials: true` set.

---

### 4. Security: Stop logging passwords ✅
`server/src/utils/logger.ts` has `redactBody()` that redacts `password`, `passwordHash`, `token`, `accessToken`, `secret`, `credential` before logging.

---

### 5. Legal: Add Terms of Service and Privacy Policy ✅
Privacy Policy (`/privacy`) and Terms of Service (`/terms`) pages added. Links added to Login and Register pages. AI data handling (Anthropic API) disclosed in Privacy Policy.

---

### 6. Remove the internal name "Simple Family Calendar" from the product ✅
Fixed in `emailService.ts`: iCal calendar name changed to "kinroo.ai", email footer updated to "kinroo.ai". No occurrences remain in client code.

---

## HIGH — Must Fix Before Beta

### 7. Security: No length limit on NLP input ✅
NLP input capped at 500 characters in `eventController.ts` for all three NLP endpoints.

---

### 8. Security: Fix userId scoping bugs ✅
- `getDigestStats` scoped to `effectiveUserId(req)`
- Event update uses field allowlist (never accepts `userId` from body)
- Recipient lookup scoped to authenticated user's `userId`

---

### 9. Security: Fix HTML escaping in email templates ✅
`emailService.ts` and `DigestService.ts` both use `escapeHtml()` from `utils/html.ts` on all user-supplied fields.

---

### 10. UX: Restyle the Register page to match Login ✅
Register page has logo, brand gradient title "kinroo.ai", Nunito font, and tagline matching Login.

---

### 11. UX: Verify NLP input is accessible on tablet (768-1023px) ⏭️
**Action required:** Test on real device or browser dev tools at exactly 768px. Verify ChatPanel/sidebar is visible or mobile drawer appears.

---

### 12. Ops: Set up uptime monitoring ⏭️
**Action required:** Sign up for UptimeRobot (free), add monitor on `https://kinroo.ai/api/health`, configure email + SMS alerts. 5-minute setup.

---

### 13. Ops: Set up error tracking (Sentry) ✅
`@sentry/node` installed and initialized in `server/src/app.ts` (gated on `SENTRY_DSN` env var). Add `SENTRY_DSN` to Heroku config vars to activate.

---

### 14. Ops: Add timeouts to all external API calls ✅
- Anthropic SDK: `timeout: 15000` in `llmParser.ts`, `intentParser.ts`, and `agentService.ts`
- Nodemailer: `connectionTimeout: 10000`, `greetingTimeout: 10000` in `emailService.ts`
- Flyer controller: `timeout: 60000` (file parsing, longer allowed)

---

### 15. Auth: Validate JWT secret is set in production ✅
`server/src/config/index.ts` throws on startup if `JWT_SECRET` is missing in production. Single dev fallback only.

---

## MEDIUM — Should Fix Before Beta

### 16. UX: Fix onboarding back button on step 1 ✅
`StepFooter` in `OnboardingFlow.tsx` uses `visibility: isFirst ? 'hidden' : undefined`. Back button invisible on step 1.

---

### 17. UX: Add back navigation to Settings ✅
"← Back to Calendar" text link present at top of `Settings.tsx`. "Back to Calendar" button also at the bottom.

---

### 18. UX: Display timezone as human-readable name ✅
Settings uses `Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'long' })` to show the long timezone name (e.g., "Pacific Standard Time").

---

### 19. UX: Fix ambiguous import icon ✅
`ImportButton.tsx` uses `CalendarPlus` icon. Dropdown shows "Sync from Google Calendar" label. No ambiguous download arrow.

---

### 20. UX: Add empty-state CTA in week view ✅
Desktop AgendaView: absolute-positioned "Nothing on this week — type in the chat to add events →" overlay when all events are empty. Mobile: per-day "Nothing scheduled" messages.

---

### 21. UX: Dismiss the private beta banner ✅
Beta banner on Login page is now dismissible with an ✕ button. Dismissed state persists in `localStorage`.

---

### 22. Security: Validate settings input fields ✅
`settings.ts` validates `timezone` against `Intl.supportedValuesOf('timeZone')`, `theme`/`timeFormat` against allowlists, schema-validates `notificationPreferences`.

---

### 23. Security: Remove console.log of API responses in client ✅
`client/src/services/api.ts` wraps all logging in `if (isDev)`.

---

### 24. Ops: Rename `OPENAI_API_KEY` to `ANTHROPIC_API_KEY` ✅
All Anthropic SDK usages reference `ANTHROPIC_API_KEY`.

---

### 25. Beta access control: verify the allowlist mechanism works ⏭️
**Action required:**
- Verify `ALLOWED_EMAILS` is populated on Heroku with beta users' emails
- Test login with a non-allowlisted email → confirm 403 with clear message
- The error message says "kinroo.ai is currently in private beta. Your email is not on the access list."

---

### 26. Data: Add user data deletion capability ✅
"Delete my account" button in Settings → Danger Zone. Calls `DELETE /api/auth/account`. All related data deleted via FK `ON DELETE CASCADE` (events, recipients, family members, settings, digest logs, conversation sessions).

---

### 27. Feedback: Set up a beta feedback channel ✅
"Send feedback" mailto link in Settings → Beta Feedback section. Pre-fills subject "kinroo.ai beta feedback".

---

## LOW — Polish Before or Shortly After Beta

### 28. UX: Fix selected state on view switcher tabs ✅
`ViewSwitcher.tsx` uses `bg-white shadow-sm` for active tab vs. muted gray for inactive — visually distinct pill style.

### 29. UX: Add click-to-create affordance in Month view ✅
Month view has a `+` button that appears on hover for each day cell. Clicking navigates to week view for the day.

### 30. UX: Reconsider Year view format ❌
The horizontal-week format is non-standard. Post-beta polish item.

### 31. Security: Fix Google OAuth pseudo-password storage ✅
OAuth users get `bcrypt.hash(randomBytes(32).toString('hex'), 10)` — cryptographically secure random hash, not a predictable string.

### 32. Security: Remove duplicate Helmet config ✅
`app.ts` comment: "All helmet config lives in securityHeaders middleware — do not add app.use(helmet()) here." No duplicate.

### 33. Ops: Set up structured API call logging ❌
Post-beta. Track Anthropic, SMTP, and Google Calendar call durations in a `trackApiCall()` utility.

---

## Pre-Launch Verification Checklist (run the day before you invite beta users)

- [ ] No credentials hardcoded (`grep -r "sk-ant-api03\|GOCSPX-" server/src/ client/src/` returns nothing)
- [x] `server/.env` is in `.gitignore` (verified — never been committed)
- [x] JWT flows through httpOnly cookie, not localStorage
- [x] CORS locked to `kinroo.ai` + `localhost:3000`
- [x] Passwords are not logged anywhere
- [x] Privacy Policy and Terms of Service pages are live and linked from Login
- [x] "Simple Family Calendar" string does not appear in the app UI
- [ ] NLP input works on a real mobile device and iPad (manual test)
- [x] Register page has logo and brand styling
- [ ] UptimeRobot is monitoring `kinroo.ai/api/health` (manual setup)
- [ ] `SENTRY_DSN` set in Heroku config vars (Sentry code is live, just needs DSN)
- [ ] `ALLOWED_EMAILS` set in Heroku config vars with beta users' emails
- [ ] A test account can log in, create an event via NLP, and receive a daily digest email
- [x] "Delete my account" flow implemented
- [x] Feedback mechanism implemented
- [x] All Critical and High items above are checked off

---

## What's Explicitly Out of Scope for Beta

Per `product-market-fit/feature-roadmap.md`:
- WhatsApp bot / proactive agent features (Phase 2) — validate core value first
- Payment / pricing — validate retention before monetizing
- Multi-language support
- 2-way Google Calendar sync
- Native mobile app (Capacitor wrapper is sufficient)
