# portfolio-monitor

A FastAPI service that monitors the health of your deployed projects. It pings
your projects on a schedule, classifies their responses, and opens/closes
incidents — surfacing everything through a clean API backed by Supabase.

All reads and writes go through the FastAPI backend using the Supabase service
role key. The frontend never touches the database directly.

## Setup

1. Clone the repo:

   ```bash
   git clone <repo-url>
   cd portfolio-monitor
   ```

2. Create your `.env` from the example and fill in the values:

   ```bash
   cp .env.example .env
   ```

3. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

4. Run the app:

   ```bash
   uvicorn app.main:app --reload
   ```

The API will be available at `http://127.0.0.1:8000`. Interactive docs are at
`http://127.0.0.1:8000/docs`.

## Environment variables

| Variable                     | Description                                      |
| ---------------------------- | ------------------------------------------------ |
| `SUPABASE_URL`               | Your Supabase project URL                        |
| `SUPABASE_SERVICE_ROLE_KEY`  | Service role key (server-side only)              |
| `SLACK_WEBHOOK_URL`          | Slack incoming webhook for incident alerts       |
| `DATABASE_URL`               | Supabase Postgres connection string (job store)  |
