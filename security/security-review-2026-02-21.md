# Security Review — famcal.ai
_Date: 2026-02-21 | Status: Open_

---

## Summary

19 issues found across 4 severity levels. The most urgent require immediate action before any other work.

| Severity | Count |
|---|---|
| Critical | 2 |
| High | 6 |
| Medium | 6 |
| Low | 5 |

---

## CRITICAL — Act Now

### 1. Live Secrets Committed to Git History
**Files**: `server/.env`, `server/.env.test`, `client/.env.local`
**Status**: `server/.env` was committed in April 2025 and is in public GitHub history.

Exposed credentials:
- PostgreSQL password
- Gmail app password
- Anthropic API key (`sk-ant-api03-...`)
- Google OAuth client secret (`GOCSPX-...`)

**Actions required**:
1. Rotate all four credentials immediately (Anthropic console, Google Cloud Console, Heroku Postgres, Google Account app passwords)
2. Purge git history: `git filter-repo --path server/.env --invert-paths`
3. Force-push cleaned history to GitHub
4. Ensure `server/.env` and `client/.env.local` are explicitly in `.gitignore`

---

### 2. JWT Passed in URL After Google OAuth Callback
**File**: `server/src/controllers/authController.ts:224`

After OAuth, server redirects to `https://famcal.ai/auth/callback?token=eyJ...` — the JWT is visible in browser history, server logs, and Referrer headers.

**Fix**: Use a short-lived one-time code in the redirect; client exchanges it for the JWT via POST. Or set the JWT directly as an httpOnly cookie in the callback handler.

---

## HIGH

### 3. JWT Stored in `localStorage` — XSS Theft Risk
**Files**: `client/src/context/AuthContext.tsx:62`, `client/src/services/api.ts:22`

CLAUDE.md says "httpOnly cookies" but the implementation uses `localStorage`. Any XSS gives an attacker the JWT.

**Fix**: Switch to httpOnly cookies. Set via `Set-Cookie: token=...; HttpOnly; Secure; SameSite=Strict` on the server. Use `axios` with `withCredentials: true` on the client. Remove all `localStorage.setItem('token')` calls.

---

### 4. CORS Configured as Wildcard
**File**: `server/src/app.ts:21` — `app.use(cors())` with no options

Allows any origin to make cross-origin requests and read responses. Combined with localStorage JWT storage, an attacker can exfiltrate all calendar data from a logged-in user.

**Fix**:
```typescript
app.use(cors({
    origin: ['https://famcal.ai', ...(isDev ? ['http://localhost:3000'] : [])],
    credentials: true,
}));
```

---

### 5. Weak Fallback JWT Secret + Inconsistent Usage
**Files**: `server/src/config/index.ts:25`, `server/src/services/authService.ts:117`

Two different fallback strings (`'your_jwt_secret_key_change_me_in_production'` and `'your-secret-key'`). `authService.ts` reads `process.env.JWT_SECRET` directly instead of using `config.jwt.secret` — they could silently diverge.

**Fix**: Throw on startup if `JWT_SECRET` is missing in production. Remove fallbacks. Use `config.jwt.secret` everywhere.

---

### 6. Google OAuth Access Token Not Audience-Verified
**File**: `server/src/services/authService.ts:125`

The `/api/auth/google/verify` endpoint accepts any valid Google access token, not just ones issued to famcal.ai. No `aud` (audience) claim check.

**Fix**: Remove this endpoint and use only the Passport OAuth flow, OR switch to verifying a Google **ID token** using `google-auth-library`'s `OAuth2Client.verifyIdToken()` which validates the `aud` claim.

---

### 7. Plaintext Passwords Logged to Disk and Browser Console
**Files**: `server/src/utils/logger.ts:28`, `server/src/controllers/authController.ts:39`, `client/src/context/AuthContext.tsx:121`

The request logger logs full `req.body` — including plaintext passwords on login — to `logs/combined.log`. A `console.log` in AuthContext logs `email + password` to the browser console.

**Fix**: Redact `password`, `token`, `accessToken` from the logger body. Remove the password `console.log` in AuthContext.

---

### 8. No Length Limit on NLP Input — Prompt Injection + Cost Abuse
**File**: `server/src/controllers/eventController.ts:29`, `server/src/services/llmParser.ts:38`

Raw user text is interpolated directly into the LLM prompt with no length cap or sanitization. Allows prompt injection and API cost abuse.

**Fix**: Cap input at ~500 characters. Use structured message format to separate system instructions from user input.

---

## MEDIUM

### 9. Unescaped User Data in HTML Emails — Stored XSS
**Files**: `server/src/services/emailService.ts:240`, `server/src/services/DigestService.ts:67`

Event titles, locations, descriptions interpolated directly into HTML email bodies. A title like `<img src=x onerror="...">` executes in recipients' email clients.

**Fix**: HTML-escape all event fields before interpolation:
```typescript
const esc = (s: string) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
```

---

### 10. `getDigestStats` Exposes Platform-Wide Data
**File**: `server/src/controllers/notificationController.ts:109`

Any authenticated user can query `/api/notifications/digest-stats` and see total/successful/failed digest counts across **all users**, not just their own.

**Fix**: Pass `userId` to `getDigestStats()` and add it to the WHERE clauses in `DigestLogRepository`.

---

### 11. TLS Certificate Validation Disabled for PostgreSQL
**File**: `server/src/config/database.ts:28`

`ssl: { rejectUnauthorized: false }` — disables certificate validation on the DB connection.

**Fix**: Use Heroku's CA certificate, or at minimum document the trust assumption. Do not silently disable cert validation.

---

### 12. Event Update Allows Overwriting `userId`
**Files**: `server/src/services/eventService.ts:100`, `server/src/controllers/eventController.ts:292`

`req.body` is passed directly to `eventService.update()`. A client can include `{ "userId": "victim-uuid" }` to reassign their event to another user's account.

**Fix**: Explicitly allowlist updatable fields in the controller — never pass raw `req.body` to an ORM update.

---

### 13. No Validation on Settings Fields
**File**: `server/src/routes/settings.ts:53`

`notificationPreferences` (JSONB) accepted with no schema validation. `timezone` accepted as any string — an invalid value crashes DigestService.

**Fix**: Validate `theme`/`timeFormat` against allowlists. Validate `timezone` against `Intl.supportedValuesOf('timeZone')`. Validate `notificationPreferences` against a schema.

---

### 14. Recipient Lookup Not Scoped to Authenticated User
**File**: `server/src/controllers/eventController.ts:246`

`recipientRepository.findByIds(eventData.recipientIds)` has no `userId` filter. An attacker can supply recipient IDs from other users' contact lists to send calendar invites to strangers' family contacts.

**Fix**: `recipientRepository.find({ where: { id: In(recipientIds), userId } })`

---

## LOW

### 15. Full Request/Response (Including JWT) Logged in Browser Console
**File**: `client/src/services/api.ts:22`

Every API request logs `headers` (containing the Bearer token) and full response bodies. No production guard.

**Fix**: Wrap all client `console.log` calls in `if (process.env.NODE_ENV !== 'production')`.

---

### 16. Google OAuth Users Get Unhashed Pseudo-Password
**Files**: `server/src/config/passport.ts:47`, `server/src/services/authService.ts:170`

Stored as plaintext: `'google-oauth-' + Math.random().toString(36).slice(-8)`. Not bcrypt-hashed.

**Fix**: Use `bcrypt.hash(uuidv4(), 10)` or allow `null` if the schema supports it.

---

### 17. `unsafe-inline` in CSP Defeats XSS Protection
**File**: `server/src/middleware/security.ts:34`

`'unsafe-inline'` in `scriptSrc` makes the Content Security Policy ineffective against XSS.

**Fix**: Use CSP nonces generated per-request. Inject into the React app's script tags at serve time.

---

### 18. Helmet Applied Twice with Conflicting Config
**File**: `server/src/app.ts:22` and `server/src/middleware/security.ts:27`

`helmet()` runs twice per request. The second call disables `crossOriginEmbedderPolicy`, silently overriding the first.

**Fix**: Remove `app.use(helmet())` from `app.ts`. Configure everything inside `securityHeaders` in one place.

---

## Fix Priority Order

1. **Rotate all credentials** (do this before anything else)
2. **Purge git history** of `.env` files
3. **Fix auth token flow** — httpOnly cookies (#2 + #3 together)
4. **Fix CORS** (#4)
5. **Fix password logging** (#7) — quick win, do alongside #4
6. **Fix prompt injection / NLP input** (#8)
7. **Fix HTML email escaping** (#9)
8. **Fix `userId` scoping bugs** (#10, #12, #14)
9. **Fix settings validation** (#13)
10. **Fix JWT secret handling** (#5)
11. Remaining LOW items (#15–#18)
