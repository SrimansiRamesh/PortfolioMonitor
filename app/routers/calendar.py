"""Google Calendar status, events, and warmup-settings endpoints."""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

import app.google_calendar as gc
from app.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/calendar", tags=["calendar"])


class WarmupSettingsUpdate(BaseModel):
    minutes_before: Optional[int] = None
    keywords: Optional[list[str]] = None
    warmup_enabled: Optional[bool] = None


@router.get("/status")
def calendar_status(current_user: dict = Depends(get_current_user)):
    connected = gc.is_connected(current_user)
    upcoming_events: list[dict] = []
    if connected:
        raw = gc.get_matching_events(current_user)
        upcoming_events = [
            {
                "id": e.get("id", ""),
                "title": e.get("summary", "Untitled event"),
                "start": (
                    e.get("start", {}).get("dateTime")
                    or e.get("start", {}).get("date", "")
                ),
            }
            for e in raw
        ]
    settings = gc.get_warmup_settings(current_user["id"])
    return {
        "connected": connected,
        "upcoming_events": upcoming_events,
        "settings": {
            "minutes_before": settings.get("minutes_before", 45),
            "keywords": settings.get("keywords", []),
            "warmup_enabled": settings.get("warmup_enabled", True),
        },
    }


@router.get("/events")
def calendar_events(
    start: str = Query(...),
    end: str = Query(...),
    current_user: dict = Depends(get_current_user),
):
    creds = gc.get_valid_credentials(current_user)
    if not creds:
        return []
    try:
        from googleapiclient.discovery import build
        service = build("calendar", "v3", credentials=creds, cache_discovery=False)
        result = (
            service.events()
            .list(
                calendarId="primary",
                timeMin=start,
                timeMax=end,
                singleEvents=True,
                orderBy="startTime",
            )
            .execute()
        )
        events = []
        for e in result.get("items", []):
            s = e.get("start", {})
            en = e.get("end", {})
            events.append({
                "id": e.get("id"),
                "title": e.get("summary", "(No title)"),
                "start": s.get("dateTime", s.get("date", "")),
                "end": en.get("dateTime", en.get("date", "")),
                "all_day": "date" in s and "dateTime" not in s,
                "color_id": e.get("colorId"),
            })
        return events
    except Exception:
        logger.exception("Failed to fetch calendar events for user %s", current_user["id"])
        raise HTTPException(status_code=500, detail="Failed to fetch events")


@router.patch("/settings")
def update_settings(
    body: WarmupSettingsUpdate,
    current_user: dict = Depends(get_current_user),
):
    current = gc.get_warmup_settings(current_user["id"])
    minutes_before = body.minutes_before if body.minutes_before is not None else current.get("minutes_before", 45)
    keywords = body.keywords if body.keywords is not None else current.get("keywords", [])
    warmup_enabled = body.warmup_enabled if body.warmup_enabled is not None else current.get("warmup_enabled", True)
    if minutes_before < 1:
        raise HTTPException(status_code=400, detail="minutes_before must be at least 1")
    return gc.update_warmup_settings(
        user_id=current_user["id"],
        minutes_before=minutes_before,
        keywords=keywords,
        warmup_enabled=warmup_enabled,
    )
