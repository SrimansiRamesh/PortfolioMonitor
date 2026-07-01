"""Scheduler jobs."""

import logging
import statistics
from datetime import datetime
from typing import Optional

import httpx
from apscheduler.jobstores.memory import MemoryJobStore
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.alerts import send_incident_alert, send_recovery_alert
from app.database import supabase

logger = logging.getLogger(__name__)

scheduler: AsyncIOScheduler | None = None


def _classify_ping(
    status_code: Optional[int],
    response_time_ms: Optional[int],
    baseline_ms: Optional[int],
) -> str:
    if status_code is None or response_time_ms is None:
        return "outage"
    if status_code != 200:
        return "outage"
    if baseline_ms is None:
        return "healthy"
    if response_time_ms > baseline_ms * 5:
        return "cold_start"
    return "healthy"


def compute_next_interval_minutes(consecutive_failures: int, base_interval: int = 5) -> int:
    """Exponential backoff from base_interval, capped at 60m. Skipped for long-interval projects."""
    if base_interval >= 60:
        return base_interval  # already infrequent — no backoff needed
    interval = base_interval * (2 ** (consecutive_failures - 1))
    return min(interval, 60)


def _count_consecutive_failures(project_id: int) -> int:
    recent_pings = (
        supabase.table("pings")
        .select("classification")
        .eq("project_id", project_id)
        .order("pinged_at", desc=True)
        .limit(20)
        .execute()
    )
    count = 0
    for ping in recent_pings.data:
        if ping["classification"] == "healthy":
            break
        count += 1
    return max(count, 1)


def ping_project(project_id: int, url: str):
    logger.debug("ping_project called for %s", url)
    try:
        pinged_at = datetime.utcnow()

        # Step 1: HTTP GET
        status_code: Optional[int] = None
        response_time_ms: Optional[int] = None
        try:
            response = httpx.get(url, timeout=30.0, follow_redirects=True)
            status_code = response.status_code
            response_time_ms = int(response.elapsed.total_seconds() * 1000)
        except Exception:
            pass

        # Step 2: Fetch project name and baseline
        project_result = (
            supabase.table("projects")
            .select("name, baseline_response_ms, ping_interval_minutes")
            .eq("id", project_id)
            .execute()
        )
        if not project_result.data:
            logger.warning("[ping] Project %s not found — skipping", project_id)
            return
        project = project_result.data[0]
        baseline_ms: Optional[int] = project.get("baseline_response_ms")
        project_name: str = project.get("name", str(project_id))
        base_interval: int = project.get("ping_interval_minutes") or 5

        # Step 3: Classify
        classification = _classify_ping(status_code, response_time_ms, baseline_ms)

        # Step 4: Build diagnosis for non-healthy pings
        diagnosis: Optional[str] = None
        if classification == "cold_start":
            diagnosis = (
                f"Response time {response_time_ms}ms vs baseline {baseline_ms}ms"
                " — looks like a cold start"
            )
        elif classification == "outage":
            diagnosis = (
                f"Returned status {status_code}"
                f" — possible outage. Last checked at {pinged_at}"
            )

        # Step 5: Insert ping row
        supabase.table("pings").insert(
            {
                "project_id": project_id,
                "status_code": status_code,
                "response_time_ms": response_time_ms,
                "classification": classification,
                "diagnosis": diagnosis,
                "pinged_at": pinged_at.isoformat(),
            }
        ).execute()

        # Step 6: Baseline computation (healthy pings only)
        if classification == "healthy" and baseline_ms is None:
            count_result = (
                supabase.table("pings")
                .select("id", count="exact")
                .eq("project_id", project_id)
                .eq("classification", "healthy")
                .execute()
            )
            if (count_result.count or 0) >= 10:
                fastest_result = (
                    supabase.table("pings")
                    .select("response_time_ms")
                    .eq("project_id", project_id)
                    .eq("classification", "healthy")
                    .order("response_time_ms", desc=False)
                    .limit(10)
                    .execute()
                )
                times = [
                    r["response_time_ms"]
                    for r in fastest_result.data
                    if r["response_time_ms"] is not None
                ]
                if times:
                    median_ms = int(statistics.median(times))
                    supabase.table("projects").update(
                        {"baseline_response_ms": median_ms}
                    ).eq("id", project_id).execute()

        # Step 7: Incident handling + backoff + alerts
        if classification in ("outage", "cold_start"):
            open_incident = (
                supabase.table("incidents")
                .select("id, alerted")
                .eq("project_id", project_id)
                .is_("closed_at", "null")
                .execute()
            )
            if not open_incident.data:
                new_incident_result = supabase.table("incidents").insert(
                    {
                        "project_id": project_id,
                        "opened_at": pinged_at.isoformat(),
                        "alerted": False,
                    }
                ).execute()
                if new_incident_result.data:
                    new_incident_id = new_incident_result.data[0]["id"]
                    try:
                        send_incident_alert(project_name, new_incident_id, diagnosis or "")
                        supabase.table("incidents").update({"alerted": True}).eq(
                            "id", new_incident_id
                        ).execute()
                    except Exception:
                        logger.exception("[alert] Failed to send incident alert for project %s", project_id)

            consecutive_failures = _count_consecutive_failures(project_id)
            next_interval = compute_next_interval_minutes(consecutive_failures, base_interval=base_interval)
            schedule_project(project_id, url, interval_minutes=next_interval)
        else:
            open_incident = (
                supabase.table("incidents")
                .select("id, opened_at")
                .eq("project_id", project_id)
                .is_("closed_at", "null")
                .execute()
            )
            if open_incident.data:
                incident_id = open_incident.data[0]["id"]
                opened_at_str: str = open_incident.data[0]["opened_at"]
                opened_at_dt = datetime.fromisoformat(opened_at_str[:19])
                duration_minutes = max(0, int((datetime.utcnow() - opened_at_dt).total_seconds() / 60))
                supabase.table("incidents").update(
                    {"closed_at": datetime.utcnow().isoformat()}
                ).eq("id", incident_id).execute()
                try:
                    send_recovery_alert(project_name, duration_minutes)
                except Exception:
                    logger.exception("[alert] Failed to send recovery alert for project %s", project_id)
                schedule_project(project_id, url, interval_minutes=base_interval)

        # Step 8: Log
        logger.info("[ping] %s — %s — %sms", project_name, classification, response_time_ms)

    except Exception:
        logger.exception("[ping] Unexpected error pinging project %s (%s)", project_id, url)


_warmup_active_users: set[str] = set()


def _set_user_project_intervals(user_id: str, interval_minutes: Optional[int] = None) -> None:
    """Set all user projects to interval_minutes. If None, restore each project's configured interval."""
    projects_result = (
        supabase.table("projects")
        .select("id, url, ping_interval_minutes")
        .eq("is_active", True)
        .eq("user_id", user_id)
        .execute()
    )
    for project in projects_result.data:
        mins = interval_minutes if interval_minutes is not None else (project.get("ping_interval_minutes") or 5)
        schedule_project(project["id"], project["url"], interval_minutes=mins)


def _check_user_warmup(user: dict) -> None:
    global _warmup_active_users
    user_id: str = user["id"]
    try:
        from app.google_calendar import get_matching_events, get_warmup_settings, is_connected
        if not is_connected(user):
            _warmup_active_users.discard(user_id)
            return
        cfg = get_warmup_settings(user_id)
        if not cfg.get("warmup_enabled", True):
            _warmup_active_users.discard(user_id)
            return
        events = get_matching_events(user)
        was_active = user_id in _warmup_active_users
        if events and not was_active:
            titles = ", ".join(e.get("summary", "event") for e in events)
            logger.info("[calendar] User %s: '%s' starting soon — warming up projects", user_id, titles)
            _warmup_active_users.add(user_id)
            _set_user_project_intervals(user_id, interval_minutes=1)
        elif not events and was_active:
            logger.info("[calendar] User %s: no more upcoming events — resetting intervals", user_id)
            _warmup_active_users.discard(user_id)
            _set_user_project_intervals(user_id)  # restores each project's configured interval
    except Exception:
        logger.exception("[calendar] Error checking warmup for user %s", user_id)


def check_calendar_and_warmup() -> None:
    try:
        users_result = supabase.table("users").select("*").execute()
        for user in users_result.data:
            _check_user_warmup(user)
    except Exception:
        logger.exception("[calendar] Error in calendar warmup check")


def schedule_project(project_id: int, url: str, interval_minutes: int = 5):
    """Schedule (or reschedule) a ping job for a project."""
    if scheduler is None:
        return
    scheduler.add_job(
        ping_project,
        trigger="interval",
        minutes=interval_minutes,
        args=[project_id, url],
        id=f"ping_{project_id}",
        replace_existing=True,
    )
    logger.info("Scheduled ping job for project %s every %sm", project_id, interval_minutes)


async def start_scheduler() -> AsyncIOScheduler:
    """Initialise APScheduler and schedule all currently active projects."""
    global scheduler

    if scheduler is not None:
        scheduler.shutdown(wait=False)

    scheduler = AsyncIOScheduler(jobstores={"default": MemoryJobStore()})
    scheduler.start()
    logger.info("Scheduler started")

    projects_result = (
        supabase.table("projects").select("id, url, ping_interval_minutes").eq("is_active", True).execute()
    )
    logger.info("Scheduler starting — found %d active projects", len(projects_result.data))
    for project in projects_result.data:
        schedule_project(project["id"], project["url"], interval_minutes=project.get("ping_interval_minutes") or 5)

    scheduler.add_job(
        check_calendar_and_warmup,
        trigger="interval",
        minutes=15,
        id="check_calendar",
        replace_existing=True,
    )
    logger.info("Scheduled calendar warmup check every 15m")

    return scheduler
