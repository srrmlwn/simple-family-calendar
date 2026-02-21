# famcal.ai

**Live:** https://famcal.ai

A family calendar that understands plain English. Create events by describing them, get daily digests, and keep the whole family on the same page.

---

## What Makes It Different

- **Natural language first** — "Schedule dentist for Maya next Tuesday at 2pm" creates the event
- **Family-aware** — tag events to family members, not just calendars
- **Email invites** — send iCal invites to family members directly from the app
- **Daily digest** — 6 PM email summarizing tomorrow's events
- **Multi-channel** (roadmap) — WhatsApp/SMS, photo import, voice input

---

## Tech Stack

| | |
|---|---|
| Frontend | React + TypeScript, Tailwind CSS, react-big-calendar |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL (Heroku) with TypeORM |
| Auth | Google OAuth + JWT |
| NLP | OpenAI API |
| Email | Nodemailer + iCalendar |
| Mobile | Capacitor |

See `CLAUDE.md` for full architecture and development notes.

---

## Getting Started

### Prerequisites
- Node.js v16+
- PostgreSQL v13+

### Setup

```bash
git clone https://github.com/yourusername/famcal-ai.git
cd famcal-ai
npm install
```

Create `.env` files in `/server` and `/client` (see `CLAUDE.md` for required variables).

```bash
# Run DB migrations
cd server && npm run typeorm migration:run

# Start development servers
npm run dev
# Frontend: http://localhost:3000
# Backend API: http://localhost:4000/api
```

---

## Project Docs

| Path | Contents |
|---|---|
| `CLAUDE.md` | Architecture, conventions, development guide |
| `schema.sql` | Full database schema |
| `features/` | Feature specs (NLP, notifications, event form) |
| `product-market-fit/feature-roadmap.md` | Prioritized backlog and active work tracking |
| `product-market-fit/competitive-analysis.md` | Market landscape and positioning |
| `security/` | Security review notes |

---

## License

MIT — see `LICENSE`.
