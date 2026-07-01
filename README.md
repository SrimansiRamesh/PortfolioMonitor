# Portfolio Monitor

A personal uptime and health monitor for your deployed portfolio projects. It pings your apps on a schedule, classifies responses, opens and closes incidents, sends email alerts, and pre-warms slow cold-start services before interviews and demos — all surfaced through a clean dark-themed dashboard.

---

## What it does

Portfolio projects hosted on free tiers (Render, Railway, Fly.io, etc.) spin down after inactivity. Portfolio Monitor keeps tabs on them, alerts you when something goes down, and automatically increases ping frequency before events in your Google Calendar that look like interviews or demos — so your projects are warm and responsive when it matters.

---

## Features

### Dashboard
Sign in with Google and you land on the projects dashboard. Each card shows:
- **Status badge** — Healthy / Cold Start / Outage
- **Response time** with a sparkline of recent pings
- **Baseline** — median of the 10 fastest healthy responses, used to detect cold starts (>5× baseline = cold start)
- **Last pinged** timestamp

Click a card to edit the project name, URL, platform, or ping interval. Use **Restart** to clear an active incident and resume normal monitoring. Use **Add** (top right) to add a new project.

### Ping intervals
Each project has its own configurable ping frequency — set it in minutes, hours, or days when adding or editing a project. Defaults to every 5 minutes.

During an outage the interval backs off exponentially (`base × 2^n`, capped at 60 minutes) to avoid hammering a dead service. It resets to the configured interval automatically on recovery.

### Incidents & alerts
When a project goes into outage, an incident is opened and a one-time email alert is sent via Resend. The incident closes automatically when the project recovers and a recovery email is sent. You can also pause and restart monitoring from the incident email links.

### Calendar
Switch to the **Calendar** tab to see your Google Calendar in a week view. Events are shown as colored blocks with click popovers for time details. The view adapts to your screen: 1 day on mobile, 3 days on tablet, 7 days on desktop.

### Pre-interview warmup
The warmup sidebar (Calendar tab, right side) lets you configure:
- **Auto warmup toggle** — enable/disable the feature entirely
- **How early** — how many minutes before a matching event to start warming up (default 45)
- **Trigger keywords** — which event titles trigger warmup (default: interview, demo, technical, screen, take-home); add your own custom keywords

When a matching event is detected, the scheduler ramps all your projects up to 1-minute ping intervals for the lead-up window, then restores each project's own configured interval afterwards. The warmup check runs every 15 minutes in the background.

---

## How pings are classified

| Status | Condition |
|---|---|
| Healthy | HTTP 200, response time within 5× baseline |
| Cold Start | HTTP 200, response time more than 5× baseline |
| Outage | Non-200 response or timeout |

The baseline is computed lazily after the first 10 healthy pings (median of the 10 fastest). Until then, any 200 response is classified as healthy.

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Backend | FastAPI, Python 3.12 |
| Database | Supabase (PostgreSQL) |
| Auth | Google OAuth2 with PKCE |
| Scheduler | APScheduler (in-process) |
| Email alerts | Resend |
| Calendar | Google Calendar API v3 |
| Deployment | Render (backend) + Vercel (frontend) |
