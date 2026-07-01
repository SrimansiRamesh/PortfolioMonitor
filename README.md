# Portfolio Monitor

A personal uptime and health monitor for your deployed portfolio projects. It pings your apps on a schedule, classifies responses, opens and closes incidents, sends email alerts, and pre-warms slow cold-start services before interviews and demos — all surfaced through a clean dark-themed dashboard.

---

## Purpose

Portfolio projects hosted on free tiers (Render, Railway, Fly.io, etc.) spin down after inactivity. Portfolio Monitor keeps tabs on them, alerts you when something goes down, and automatically increases ping frequency before events in your Google Calendar that look like interviews or demos — so your projects are warm and responsive when it matters.

---

## Use Cases

- **Uptime visibility** — see at a glance which projects are healthy, cold-starting, or in outage
- **Incident tracking** — automatic open/close lifecycle with email notifications via Resend
- **Exponential backoff** — ping frequency backs off during outages (5m → 10m → 20m → 60m cap) to avoid hammering a dead service
- **Pre-interview warmup** — detects "interview", "demo", "technical screen" etc. in your Google Calendar and ramps up ping frequency to 1-minute intervals in the lead-up window
- **Multi-user** — each Google account gets isolated projects, incidents, and calendar settings

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Next.js 14 frontend  (frontend/)                       │
│  TypeScript · Tailwind CSS · Axios · Dark theme         │
└──────────────────────┬──────────────────────────────────┘
                       │ REST (JWT Bearer)
┌──────────────────────▼──────────────────────────────────┐
│  FastAPI backend  (app/)                                │
│                                                         │
│  Routers                                                │
│  ├── /auth          Google OAuth2 + PKCE, JWT issue     │
│  ├── /projects      CRUD, scoped to user                │
│  ├── /pings         Ping history per project            │
│  ├── /incidents     Open/close lifecycle, pause/restart │
│  └── /calendar      Google Calendar events + warmup     │
│                                                         │
│  Scheduler (APScheduler)                                │
│  ├── ping_project   HTTP GET → classify → alert         │
│  └── check_calendar_and_warmup  every 15m               │
└──────────────────────┬──────────────────────────────────┘
                       │ supabase-py (service role)
┌──────────────────────▼──────────────────────────────────┐
│  Supabase (PostgreSQL)                                  │
│  Tables: users · projects · pings · incidents           │
│          warmup_settings                                │
└─────────────────────────────────────────────────────────┘
                       │ Google APIs
              ┌────────┴────────┐
         OAuth2 + PKCE     Calendar API v3
         (sign-in flow)    (event fetching)
```

**Ping classification**

| Result       | Condition                                  |
| ------------ | ------------------------------------------ |
| `healthy`    | HTTP 200, response time within 5× baseline |
| `cold_start` | HTTP 200, response time > 5× baseline      |
| `outage`     | Non-200 or timeout                         |

Baseline is computed after 10 healthy pings (median of the 10 fastest).

---

## Tech Stack

| Layer        | Tech                                       |
| ------------ | ------------------------------------------ |
| Frontend     | Next.js 14, TypeScript, Tailwind CSS       |
| Backend      | FastAPI, Python 3.12                       |
| Database     | Supabase (PostgreSQL via supabase-py)      |
| Auth         | Google OAuth2 with PKCE, JWT (python-jose) |
| Scheduler    | APScheduler (AsyncIOScheduler)             |
| HTTP client  | httpx (pings), Axios (frontend)            |
| Email alerts | Resend                                     |
| Calendar     | Google Calendar API v3                     |

## Setup

### Prerequisites

- Python 3.12+
- Node.js 18+
- A Supabase project
- A Google Cloud project with **Google Calendar API** enabled and an OAuth 2.0 Web Client configured
- A Resend account for email alerts

### 1. Clone and configure

```bash
git clone <repo-url>
cd ProjectMonitor
cp .env.example .env   # fill in all values
```

### 2. Backend

```bash
python -m venv project-monitor
source project-monitor/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Backend runs at `http://localhost:8000`. Swagger docs at `http://localhost:8000/docs`.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:3000`.

### 4. Database

Run the schema SQL above in the Supabase SQL editor. Also run:

```sql
ALTER TABLE warmup_settings ADD COLUMN IF NOT EXISTS warmup_enabled boolean DEFAULT true;
```

---

## Environment Variables

| Variable                    | Description                                                                  |
| --------------------------- | ---------------------------------------------------------------------------- |
| `SUPABASE_URL`              | Supabase project URL                                                         |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (never exposed to frontend)                                 |
| `DATABASE_URL`              | Postgres connection string                                                   |
| `RESEND_API_KEY`            | Resend API key for email alerts                                              |
| `ALERT_EMAIL`               | Email address to send incident alerts to                                     |
| `API_BASE_URL`              | Backend URL (e.g. `http://localhost:8000`)                                   |
| `FRONTEND_URL`              | Frontend URL (e.g. `http://localhost:3000`)                                  |
| `GOOGLE_CLIENT_ID`          | OAuth 2.0 client ID                                                          |
| `GOOGLE_CLIENT_SECRET`      | OAuth 2.0 client secret                                                      |
| `GOOGLE_REDIRECT_URI`       | Must match Google Cloud Console (e.g. `http://localhost:8000/auth/callback`) |
| `JWT_SECRET`                | Long random string for signing JWTs                                          |

### Google Cloud setup checklist

1. Create a project at [console.cloud.google.com](https://console.cloud.google.com)
2. Enable **Google Calendar API** under APIs & Services
3. Create an OAuth 2.0 **Web application** credential
4. Add `http://localhost:8000/auth/callback` as an authorised redirect URI
5. Under OAuth consent screen → Test users → add your Gmail address (while in Testing mode)
6. Scopes needed: `openid`, `email`, `profile`, `https://www.googleapis.com/auth/calendar.readonly`
