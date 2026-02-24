# Operational Excellence — API Observability & Reliability
**Status:** Spec — Phase 1 ready to execute now
**Goal:** Know when external APIs fail before users do. Track costs. Alert on anomalies.

---

## Current State

The foundations exist but are incomplete:

| Component | Status |
|---|---|
| Winston logger | Configured (`server/src/utils/logger.ts`) but ~80% of actual API calls still use `console.log` |
| Health endpoint | `GET /api/health` returns `{ status: 'ok' }` — doesn't check external services |
| Rate limiting | Done for inbound requests — nothing for outbound API call protection |
| Error tracking | None (no Sentry, no Datadog) |
| Retry logic | None — failed API calls fail immediately |
| Cost tracking | None — no logging of Anthropic token usage |
| Request tracing | None — no correlation IDs |
| Uptime monitoring | None |
| Alerting | None |

### External APIs at Risk

| API | Where used | Failure impact | Cost risk |
|---|---|---|---|
| **Anthropic Claude** | `llmParser.ts`, `intentParser.ts` | NLP input broken, events can't be created | High — unbounded token usage |
| **Google OAuth** | `authController.ts`, `passport.ts` | Login broken | Low |
| **Google Calendar** | `GoogleCalendarService.ts` | Import/sync broken | Low |
| **Gmail SMTP** | `emailService.ts` | Invites and digest emails silently drop | Low |

The Anthropic integration is the highest-risk on both failure impact and cost. It's also confusingly using an env var named `OPENAI_API_KEY` that actually holds an Anthropic key (`sk-ant-api03-...`). This should be renamed.

---

## What This Feature Does

Adds structured observability across all external API calls:
- Every call is logged with duration, success/failure, and metadata
- A lightweight internal dashboard shows current API health
- Email alerts fire when error rates exceed thresholds
- Token usage is tracked per request so cost anomalies are visible
- Uptime monitoring pings the app externally

This is not a full APM setup. The goal is **minimum viable observability** — enough to catch real problems in production without the overhead of Datadog or New Relic.

---

## Tooling Choices

| Tool | Purpose | Cost |
|---|---|---|
| **Sentry** | Error tracking + alerting | Free tier (5k errors/month) |
| **UptimeRobot** | External uptime monitoring + SMS/email alerts | Free (5 min checks) |
| **Logtail / Better Stack** | Structured log aggregation (replaces reading Heroku log tail) | Free tier (1GB/month) |
| **Winston** (existing) | Structured JSON logs — already configured, just underused |
| **Custom API metrics table** | Per-call logging stored in Postgres | Free, already have the DB |

This stack costs $0 until you're well past early-stage. The custom API metrics table is the key investment — it gives you a queryable audit log of every external API call without needing a third-party service.

---

## Phases

### Phase 1 — Structured logging + error capture (execute now, ~3-4 days)

This is the highest-leverage work. Almost everything downstream depends on having clean logs.

**1a. Fix the env var name**

`OPENAI_API_KEY` in `server/.env` is an Anthropic key. Rename it.

Files to touch:
- `server/.env` — rename `OPENAI_API_KEY` → `ANTHROPIC_API_KEY`
- `server/src/controllers/eventController.ts` lines 26-27 — update references
- `server/src/services/llmParser.ts` — update env var read
- `server/src/services/intentParser.ts` — update env var read
- `server/.env.example` — update

**1b. Add an API observability middleware**

Create `server/src/utils/apiMetrics.ts` — a wrapper that logs every external API call:

```typescript
interface ApiCallLog {
  service: 'anthropic' | 'google-oauth' | 'google-calendar' | 'smtp';
  operation: string;        // e.g. 'messages.create', 'calendar.events.list'
  durationMs: number;
  success: boolean;
  errorCode?: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;  // token counts, model name, etc.
  userId?: string;
  timestamp: Date;
}

export async function trackApiCall<T>(
  service: ApiCallLog['service'],
  operation: string,
  fn: () => Promise<T>,
  metadata?: Record<string, unknown>
): Promise<T> { ... }
```

This wrapper:
- Times the call
- Logs success/failure with structured fields to Winston
- Stores a row in the `api_call_logs` table (see 1c)
- Re-throws the original error so callers are unaffected

**1c. Create `api_call_logs` table**

New TypeORM migration:

```sql
CREATE TABLE api_call_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service     VARCHAR(50) NOT NULL,
  operation   VARCHAR(100) NOT NULL,
  duration_ms INTEGER NOT NULL,
  success     BOOLEAN NOT NULL,
  error_code  VARCHAR(100),
  error_message TEXT,
  metadata    JSONB,
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_api_call_logs_service_created ON api_call_logs(service, created_at DESC);
CREATE INDEX idx_api_call_logs_success ON api_call_logs(success, created_at DESC) WHERE success = false;
```

This table gives you: error rates by service, latency percentiles, cost attribution by user, and a queryable audit log — all for free using the Postgres you already have.

**1d. Wrap existing API calls**

Apply `trackApiCall()` to all external calls:

| File | Lines | Change |
|---|---|---|
| `server/src/services/llmParser.ts` | ~63-74 | Wrap `anthropic.messages.create()` — also log `inputTokens`, `outputTokens` from response |
| `server/src/services/intentParser.ts` | ~176-182 | Same |
| `server/src/services/GoogleCalendarService.ts` | ~109-117 | Wrap `calendar.events.list()` |
| `server/src/controllers/authController.ts` | ~173-227 | Wrap Google token verify |
| `server/src/services/emailService.ts` | ~73-166 | Wrap `transporter.sendMail()` calls |

**1e. Add Sentry**

```bash
cd server && npm install @sentry/node @sentry/profiling-node
```

Initialize in `server/src/app.ts` before any other middleware:
```typescript
import * as Sentry from '@sentry/node';
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,  // 10% of requests — enough signal without cost
});
```

Add Sentry error handler after all routes (after `app.use(errorHandler)`). This catches any unhandled errors and sends them to Sentry with full stack traces.

Set up one alert rule in Sentry: **"Email me when error volume spikes > 10 errors in 5 minutes"**. That's all you need to start.

**1f. Set up UptimeRobot**

1. Sign up at uptimerobot.com (free)
2. Add monitor: HTTP(S), URL `https://famcal.ai/api/health`, interval 5 minutes
3. Alert contact: your email + phone SMS
4. This catches full outages — Heroku dyno crashes, deployment failures, DNS issues

---

### Phase 2 — Internal ops dashboard (~3 days, after Phase 1)

A simple admin page in the app that queries `api_call_logs`. Not user-facing — just for you.

Route: `/admin/ops` (behind auth, restricted to your user ID)

**Dashboard panels:**

1. **API Health (last 24h)**
   - Error rate % per service (Anthropic, Google, SMTP)
   - P50/P95 latency per service
   - Total call volume

2. **Anthropic Cost Tracker**
   - Input tokens + output tokens per day (from `metadata` column)
   - Estimated cost (claude-sonnet-4-6: $3/$15 per 1M tokens in/out)
   - Rolling 30-day cost trend

3. **Recent Errors**
   - Last 20 failed API calls with error messages
   - Filterable by service

4. **Digest Health**
   - Last 7 digest runs: sent count, failed count, delivery time

Implementation notes:
- New server route: `GET /api/admin/ops-metrics` — queries `api_call_logs` with window aggregations
- New client page: `client/src/pages/OpsPage.tsx`
- Protect with middleware: `req.user.id === process.env.ADMIN_USER_ID`
- Use `recharts` for the cost trend chart (already used in the app, or add if not)

---

### Phase 3 — Alerting rules (~1 day, after Phase 2)

Move beyond "check the dashboard" to "get alerted automatically".

**Alert 1: Anthropic error rate spike**
- Condition: >3 consecutive failures from Anthropic in a 5-minute window
- Action: Email to your address
- Implementation: Add a check in `trackApiCall()` — when Anthropic failure count (in-memory rolling window or recent DB query) exceeds threshold, call `EmailService.sendEmail()` to you

**Alert 2: Daily cost anomaly**
- Condition: Daily Anthropic spend > 2x the rolling 7-day average
- Action: Email alert
- Implementation: Add a daily cron job in `SchedulerService.ts` that queries yesterday's token sum from `api_call_logs.metadata`

**Alert 3: Email delivery failure**
- Condition: SMTP `sendMail` fails for any user-triggered action (not digest)
- Action: Log to Sentry with `Sentry.captureException()` + severity "warning"

**Alert 4: Heroku dyno crash / restart**
- Covered by UptimeRobot (Phase 1f) — if the dyno crashes and doesn't recover, the health check starts failing and you get paged

---

### Phase 4 — Resilience (after Phase 3, ~2 days)

Once you can see failures, make the system survive them better.

**4a. Retry with exponential backoff for Anthropic**

Add retry logic inside `trackApiCall()` for the Anthropic service:
```typescript
const RETRYABLE_SERVICES = ['anthropic'];
const MAX_RETRIES = 2;
const BACKOFF_BASE_MS = 500;
```

On failure, retry up to 2 times with 500ms, 1000ms delays. Log each retry attempt. Only retry on transient errors (network timeout, 5xx) — not on 4xx (bad request, auth failure).

**4b. Add timeouts to all external calls**

Currently there are no explicit timeouts. A hung Anthropic call will hang the user's request indefinitely.

- Anthropic: Set `timeout: 15000` in the SDK init options
- Google Calendar: The `googleapis` client supports `timeout` in request options
- SMTP: Nodemailer transport has `connectionTimeout` and `greetingTimeout` options (set both to 10s)

**4c. Circuit breaker for Anthropic (optional, later)**

If Anthropic is down, failing fast (returning "NLP unavailable, try again soon") is better than queuing up requests that all time out. The `hybridParser.ts` already has a fallback to the local NLP parser — make this fallback automatic when Anthropic error rate is high, not just on individual failures.

This is optional complexity — don't build it until you've been burned by an Anthropic outage.

---

## Files to Create / Modify (Summary)

| File | Action | Phase |
|---|---|---|
| `server/src/utils/apiMetrics.ts` | Create — API call wrapper | 1b |
| `server/src/migrations/<timestamp>-add-api-call-logs.ts` | Create — DB migration | 1c |
| `server/src/entities/ApiCallLog.ts` | Create — TypeORM entity | 1c |
| `server/src/services/llmParser.ts` | Edit — wrap Anthropic call | 1d |
| `server/src/services/intentParser.ts` | Edit — wrap Anthropic call | 1d |
| `server/src/services/GoogleCalendarService.ts` | Edit — wrap calendar calls | 1d |
| `server/src/services/emailService.ts` | Edit — wrap sendMail calls | 1d |
| `server/src/app.ts` | Edit — add Sentry init | 1e |
| `server/src/controllers/authController.ts` | Edit — rename env var refs | 1a |
| `server/src/controllers/eventController.ts` | Edit — rename env var refs | 1a |
| `server/.env` | Edit — rename key | 1a |
| `server/src/routes/admin.ts` | Create — ops metrics endpoint | 2 |
| `client/src/pages/OpsPage.tsx` | Create — ops dashboard UI | 2 |
| `server/src/services/SchedulerService.ts` | Edit — add cost anomaly job | 3 |

---

## Acceptance Criteria

**Phase 1:**
- [ ] Every Anthropic call is logged to `api_call_logs` with duration, success, input/output tokens
- [ ] Every SMTP send is logged with success/failure
- [ ] Every Google Calendar API call is logged
- [ ] Sentry receives errors from unhandled exceptions in production
- [ ] UptimeRobot sends an alert within 10 minutes of `famcal.ai` going down
- [ ] `OPENAI_API_KEY` env var renamed to `ANTHROPIC_API_KEY` everywhere

**Phase 2:**
- [ ] `/admin/ops` page loads and shows last-24h error rates per service
- [ ] Anthropic daily cost estimate is visible and matches rough manual calculation
- [ ] Recent errors table shows last 20 failures with messages

**Phase 3:**
- [ ] An intentionally failed Anthropic call triggers an email alert within 5 minutes
- [ ] A simulated cost spike (insert fake rows) triggers the daily cost alert

**Phase 4:**
- [ ] A timed-out Anthropic call retries twice and resolves if the service recovers
- [ ] A permanently down SMTP server causes the request to fail within 10 seconds (not hang)

---

## Quick Wins You Can Do Today (< 1 hour each)

Before Phase 1 is fully built, these are zero-infrastructure improvements:

1. **Rename `OPENAI_API_KEY` to `ANTHROPIC_API_KEY`** — 15 minutes, 5 files
2. **Set up UptimeRobot** — 5 minutes, zero code
3. **Add `timeout` to Anthropic SDK init in `llmParser.ts` and `intentParser.ts`** — prevents silent hangs today

---

## When to Execute

**Phase 1:** Start now (or next session). The `api_call_logs` table + `trackApiCall()` wrapper is the most valuable single investment you can make. It pays dividends for every future debugging session.

**Phase 2:** After Phase 1 has been running for a week and you have real data to display.

**Phases 3-4:** After you have real users. Alerting is only valuable once there's something to alert about.
