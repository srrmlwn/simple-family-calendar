# CLAUDE.md — kinroo.ai

This file gives Claude Code context about the project. Read it before making changes.

---

## What This Project Is

**kinroo.ai** is an AI-native family calendar. The core bet: natural language is the primary interface, not a bolt-on feature. It's live at https://kinroo.ai.

Target user: parents managing a household with kids — sports, school, appointments, family logistics. The app treats family members as first-class entities (not just calendar owners).

---

## Tech Stack (Actual)

| Layer | Tech |
|---|---|
| Frontend | React 18 + TypeScript, Tailwind CSS, react-big-calendar, date-fns |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL (Heroku), TypeORM migrations |
| Auth | Google OAuth + JWT (HTTP-only cookies) |
| NLP | OpenAI API (event parsing from natural language) |
| Email | Nodemailer + iCalendar attachments |
| Mobile | Capacitor (cross-platform wrapper) |
| Deployment | Heroku (frontend + backend via Procfile) — app name: `simple-family-calendar` |

---

## Key Architecture

```
client/src/
  components/     # All UI components (flat, no subdirs currently)
  context/        # Auth + app state (React Context)
  hooks/          # Custom hooks
  pages/          # Route-level components
  services/       # API client (Axios)
  types/          # Shared TypeScript types

server/src/
  controllers/    # Route handlers (thin)
  services/       # Business logic (NLP, email, digest, events)
  entities/       # TypeORM models
  repositories/   # DB access layer
  migrations/     # TypeORM migrations
  routes/         # Express route definitions
  middleware/     # Auth, CORS, security headers
```

### Key Components
- `NLPInput.tsx` — natural language chat interface
- `DayView.tsx` — primary calendar view
- `EventForm.tsx` — inline event editor (bottom sheet)
- `EventDetails.tsx` — event detail panel
- `BottomSheet.tsx` — modal wrapper (slides up on mobile, centered on desktop)
- `NotificationPreferences.tsx` — daily digest settings

### Key Services (server)
- `ParserService` — OpenAI-powered NLP → calendar event extraction
- `EmailService` — sends iCal invites via SMTP
- `DigestService` — daily email digest generation
- `SchedulerService` — cron job for digest delivery

---

## Database Schema (Core Tables)

- `users` — account (UUID PK, email, name, password_hash)
- `events` — calendar events (title, start_time, end_time, location, user_id FK)
- `email_recipients` — family members / contacts (name, email, is_default)
- `event_recipients` — junction table (event ↔ recipient, notified flag)
- `user_settings` — theme, timezone, time_format, notification_preferences (JSONB)

Schema file: `schema.sql` (run with `heroku pg:psql --app simple-family-calendar < schema.sql`)

---

## Git Workflow

- **Single developer** — push directly to `main`, no PRs or feature branches needed
- Commit after any meaningful session (new features, fixes, doc updates)
- Commit message format: `type: short description` (e.g. `feat:`, `fix:`, `docs:`, `refactor:`)
- **Worktrees** — when working with git worktrees, always confirm which worktree/branch is active and that it has the latest code from `main` before claiming a feature exists or doesn't exist.

---

## Development

```bash
# Install all dependencies
npm install

# Start both client and server (check Procfile for exact commands)
npm run dev

# Client only (port 3000)
cd client && npm start

# Server only (port 4000)
cd server && npm run dev

# Run DB migrations
cd server && npm run typeorm -- migration:run -d src/data-source.ts
```

### Environment Variables

**Server** (`.env` in `/server`):
```
DATABASE_URL=postgresql://...
JWT_SECRET=...
SMTP_HOST=...
SMTP_USER=...
SMTP_PASS=...
OPENAI_API_KEY=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

**Client** (`.env` in `/client`):
```
REACT_APP_API_URL=http://localhost:4000
REACT_APP_GOOGLE_CLIENT_ID=...
```

---

## Conventions

- **TypeScript everywhere** — no plain JS files
- **Tailwind CSS** for all styling — no CSS modules or styled-components
- **React Context** for global state — no Redux
- **Heroicons** for icons — keep consistent
- **date-fns** for date manipulation — not moment.js
- API routes follow `/api/<resource>/<action>` pattern
- UUIDs as primary keys throughout

---

## Active Feature Docs

Active (unshipped) feature specs in `/features/`:
- `operational-excellence.md` — observability, uptime, error tracking
- `whatsapp-sms-bot.md` — WhatsApp/SMS bot (Phase 2, spec written, code removed)
- `attachment-parsing.md` — parse events from PDF/DOCX/images (in development)

Product strategy notes in `/product-market-fit/`:
- `competitive-analysis.md` — market landscape and positioning
- `feature-roadmap.md` — prioritized feature backlog
- `ux-notes.md` — UX observations, open issues, NLP-first vision
- `beta-launch-checklist.md` — pre-launch checklist (29/33 done)

---

## Development Workflow

Every feature follows this pipeline. Two nested loops — a fast inner loop for iteration, and a slower outer loop as the exit gate before committing.

```
┌─────────────────────────────────────────────────────────────┐
│  INNER LOOP (seconds — repeat freely while building)        │
│  Spec → Edit code → Type-check → Lint → Unit tests → Fix   │
└──────────────────────────┬──────────────────────────────────┘
                           │ happy with the logic?
┌──────────────────────────▼──────────────────────────────────┐
│  OUTER LOOP (minutes — run once before committing)          │
│  Migrate DB → Start servers → Health check →                │
│  Puppeteer E2E → Security scan → Commit                     │
└─────────────────────────────────────────────────────────────┘
```

### Step 0 — Spec first
Before writing any code, write or read the feature spec in `/features/<feature-name>.md`. Define:
- What the feature does (user-facing behavior)
- Which files will be touched (server routes, services, components)
- Acceptance criteria — these become the Puppeteer test cases
- Any security considerations (new inputs? new DB queries? new auth paths?)

No spec → no clear "done" → the loop never exits cleanly.

---

### Step 1 — Inner loop: edit → type-check → lint → unit test

Run these constantly while editing. They are fast (seconds) and catch most bugs before a browser is involved.

```bash
# Type-check only (no emit) — run after every meaningful edit
cd server && npx tsc --noEmit
cd client && npx tsc --noEmit

# Lint
cd server && npm run lint
cd client && npm run lint

# Unit tests (Jest) — run tests relevant to files you changed
cd server && npm test -- --testPathPattern=<service-name>
cd client && npm test -- --watchAll=false
```

Fix everything here before moving to the outer loop. If TypeScript or lint is red, don't start the servers.

---

### Step 2 — Outer loop: run DB migrations (if schema changed)

If the feature added or modified files in `server/src/migrations/`, run migrations before starting servers:

```bash
cd server && npm run typeorm -- migration:run -d src/data-source.ts
```

If no new migration files exist, skip this step.

---

### Step 3 — Outer loop: start servers + health check

Before starting servers, kill any stale processes on ports 3000 and 4000 — old processes or wrong worktrees serving outdated code are a common source of confusing test failures.

```bash
# Terminal 1 — backend (port 4000)
cd server && npm run dev

# Terminal 2 — frontend (port 3000)
cd client && npm start

# Or both at once from project root
npm run dev
```

After the server starts, confirm it's healthy before running E2E tests:

```bash
curl http://localhost:4000/api/health
# Expected: {"status":"ok"}
```

If the server crashes on startup, fix the error before proceeding. Common causes: missing env vars, migration not run, TypeScript ambient type issues.

---

### Step 4 — Outer loop: Puppeteer E2E tests

E2E tests live in `tests/e2e/`. Each feature has its own test file. Tests run against local servers (port 3000/4000) using a test user account seeded in the local DB.

```bash
# Run all E2E tests
npm run test:e2e

# Run tests for a specific feature
npm run test:e2e -- --grep "event creation"
```

**What Puppeteer tests cover:**
- Happy path for every user-facing feature
- Auth flow (login, logout, session persistence)
- NLP event creation → confirm → event appears on calendar
- Edge cases defined in the feature spec acceptance criteria

**Test data:** Each test suite resets to a known state using a seed script (`tests/e2e/seed.ts`) before running. Tests must not depend on order or shared mutable state.

If a Puppeteer test fails, go back to the inner loop to fix the issue.

---

### Step 5 — Outer loop: scoped security scan

Run a fast automated security scan on **changed files only** before every commit. This catches new issues introduced in this session — not a full audit, just a regression guard.

```bash
# Scan only files changed in this working session
npm run security:scan
```

This script (`scripts/security-scan.sh`) checks changed files for:
- New Express routes missing `authenticateToken` middleware
- Raw `req.body` passed directly to a DB query or ORM `.save()` / `.update()`
- String interpolation into HTML templates (XSS in emails)
- Hardcoded secrets / API key patterns (`sk-`, `GOCSPX-`, passwords in strings)
- New environment variable names not covered by `.gitignore`
- `console.log` calls that include `password`, `token`, or `secret`

The scan is intentionally fast — grep-based pattern matching, not AI-powered. Reserve the full Claude security reviewer (the `feature-dev:code-reviewer` agent) for after a batch of features or before a production release.

If the scan flags something, fix it before committing.

---

### Step 6 — Commit and push

Once inner loop, E2E tests, and security scan all pass:

```bash
git add <specific files>
git commit -m "type: description"
git push origin main
```

Always add files by name — never `git add .` or `git add -A` (risks accidentally staging `.env` files or large build artifacts).

---

### Full pipeline as a single command

```bash
npm run verify
```

This runs: `type-check → lint → unit tests → start servers → E2E tests → security scan`. If everything passes, it prints a commit-ready confirmation. Does **not** run migrations or auto-commit — those remain manual steps.

---

### When to run the full Claude security reviewer

Not every session — it's slow and expensive. Run it:
- After completing a full feature (especially anything touching auth, email, or DB queries)
- Before a production deployment
- After any dependency upgrade
- Any time you're unsure about a new pattern you've introduced

```
# In Claude Code, invoke the reviewer agent:
# "Do a security review of the changes in this session"
```

---

### Puppeteer test structure

```
tests/
  e2e/
    seed.ts              # DB seed/reset utility
    auth.test.ts         # Login, logout, session
    events.test.ts       # Create, edit, delete events
    nlp.test.ts          # Natural language input flows
    notifications.test.ts # Digest preferences
    <feature>.test.ts    # One file per feature
  unit/                  # Jest unit tests (currently in server/tests/)
```

---

### Scripts reference

| Command | What it does |
|---|---|
| `npm run dev` | Start client (3000) + server (4000) concurrently |
| `npm run type-check` | TypeScript check, no emit, both client and server |
| `npm run lint` | ESLint on client and server |
| `npm run test:unit` | Jest unit tests (server + client) |
| `npm run test:e2e` | Puppeteer E2E tests (requires servers running) |
| `npm run security:scan` | Fast grep-based security scan on changed files |
| `npm run verify` | Full pipeline: type-check → lint → unit → E2E → security scan |

_Note: Some of these scripts need to be wired up in `package.json`._

---

## Build & Deploy

- **TypeScript monorepo** (client + server) — always run `npm run build` or type-check after making changes to catch TS errors before committing.
- **Build-time env vars** — `REACT_APP_*` variables are baked in at build time. Changing them requires a full rebuild to take effect; they are not read at runtime.
- **Deploy target: Heroku** — app name `simple-family-calendar`. DB migrations run via the release phase in `Procfile` (runs automatically on every deploy).
- **devDependencies not installed in production** — ensure any package needed at build time (e.g. TypeScript, type definitions) is in `dependencies`, not `devDependencies`.

---

## AI Features

When implementing AI-powered features (NLP parsing, vision/OCR, flyer extraction):
- **Always handle null/missing fields** — AI outputs are unpredictable. Never assume required fields are present.
- **Validate before DB insertion** — explicitly check `startTime`, `endTime`, `duration`, and other NOT NULL columns before calling `.save()` or `.update()`.
- **Show a confirmation step** — NLP accuracy is trust-critical. Never create or modify events from AI output without user confirmation.

---

## UI/UX Guidelines

- **Prefer minimal, targeted changes** over sweeping redesigns. If you didn't touch a component, don't restyle it.
- **Match the existing aesthetic** — warm color scheme, Nunito font, consistent Tailwind classes. Avoid generic "AI slop" styling.
- **Landing page consistency** — if a change touches the landing page, verify it looks consistent with the authenticated app pages.
- **Mobile-first** — the Capacitor wrapper means UI must work on small screens. Test bottom sheet behavior on mobile viewport.

---

## Things to Be Careful About

1. **NLP accuracy is trust-critical** — calendar mistakes (wrong dates/times) erode user trust fast. Always show a confirmation step before creating/modifying events from NLP input.
2. **Security headers** — there have been past issues with Google profile image loading due to CORS/CSP/COEP headers. Check `server/src/middleware/` before touching security config.
3. **Timezone handling** — all times stored as UTC with timezone in `user_settings`. Use date-fns-tz for conversions.
4. **Mobile-first** — the Capacitor wrapper means UI must work on small screens. Test bottom sheet behavior on mobile viewport.
5. **Email deliverability** — SMTP config is sensitive. The iCal invite format must be valid or invites silently fail in some clients.