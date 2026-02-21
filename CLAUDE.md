# CLAUDE.md — famcal.ai

This file gives Claude Code context about the project. Read it before making changes.

---

## What This Project Is

**famcal.ai** is an AI-native family calendar. The core bet: natural language is the primary interface, not a bolt-on feature. It's live at https://famcal.ai.

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
| Deployment | Heroku (frontend + backend via Procfile) |

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

Schema file: `schema.sql` (run with `heroku pg:psql DATABASE_URL < schema.sql`)

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
cd server && npm run typeorm migration:run
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

Design specs and feature notes live in `/features/`:
- `natural-language-interaction.md` — NLP interface spec
- `notifications.md` — daily digest spec
- `simplified-event-details.md` — bottom sheet event form spec
- `natural-language-interaction-task-list.md` — NLP implementation tasks

Product strategy notes live in `/product-market-fit/`:
- `competitive-analysis.md` — market landscape and positioning
- `feature-roadmap.md` — prioritized feature backlog

---

## Things to Be Careful About

1. **NLP accuracy is trust-critical** — calendar mistakes (wrong dates/times) erode user trust fast. Always show a confirmation step before creating/modifying events from NLP input.
2. **Security headers** — there have been past issues with Google profile image loading due to CORS/CSP/COEP headers. Check `server/src/middleware/` before touching security config.
3. **Timezone handling** — all times stored as UTC with timezone in `user_settings`. Use date-fns-tz for conversions.
4. **Mobile-first** — the Capacitor wrapper means UI must work on small screens. Test bottom sheet behavior on mobile viewport.
5. **Email deliverability** — SMTP config is sensitive. The iCal invite format must be valid or invites silently fail in some clients.
