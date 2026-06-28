"""Google Calendar integration — per-user credentials via stored refresh tokens."""

import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

os.environ.setdefault("OAUTHLIB_INSECURE_TRANSPORT", "1")

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

from app.database import supabase

logger = logging.getLogger(__name__)

SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"]
DEFAULT_KEYWORDS = ["interview", "demo", "technical", "screen", "take-home"]


def get_valid_credentials(user: dict) -> Optional[Credentials]:
    from app.config import settings

    refresh_token = user.get("refresh_token")
    if not refresh_token:
        return None

    creds = Credentials(
        token=None,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=settings.GOOGLE_CLIENT_ID,
        client_secret=settings.GOOGLE_CLIENT_SECRET,
        scopes=SCOPES,
    )
    try:
        creds.refresh(Request())
    except Exception:
        logger.exception("Failed to refresh credentials for user %s", user.get("id"))
        return None
    return creds


def is_connected(user: dict) -> bool:
    return get_valid_credentials(user) is not None


# ---------------------------------------------------------------------------
# Warmup settings (per-user, keyed by user_id)
# ---------------------------------------------------------------------------

def get_warmup_settings(user_id: str) -> dict:
    result = (
        supabase.table("warmup_settings")
        .select("*")
        .eq("user_id", user_id)
        .execute()
    )
    if result.data:
        return result.data[0]
    return {"user_id": user_id, "minutes_before": 45, "keywords": DEFAULT_KEYWORDS}


def update_warmup_settings(
    user_id: str, minutes_before: int, keywords: list[str], warmup_enabled: bool = True
) -> dict:
    supabase.table("warmup_settings").upsert(
        {
            "user_id": user_id,
            "minutes_before": minutes_before,
            "keywords": keywords,
            "warmup_enabled": warmup_enabled,
            "updated_at": datetime.utcnow().isoformat(),
        }
    ).execute()
    return {
        "user_id": user_id,
        "minutes_before": minutes_before,
        "keywords": keywords,
        "warmup_enabled": warmup_enabled,
    }


# ---------------------------------------------------------------------------
# Event fetching and matching
# ---------------------------------------------------------------------------

def get_upcoming_events(user: dict, minutes_ahead: int) -> list[dict]:
    creds = get_valid_credentials(user)
    if creds is None:
        return []
    try:
        service = build("calendar", "v3", credentials=creds, cache_discovery=False)
        now = datetime.now(timezone.utc)
        time_max = now + timedelta(minutes=minutes_ahead)
        result = (
            service.events()
            .list(
                calendarId="primary",
                timeMin=now.isoformat(),
                timeMax=time_max.isoformat(),
                singleEvents=True,
                orderBy="startTime",
            )
            .execute()
        )
        return result.get("items", [])
    except Exception:
        logger.exception("Failed to fetch calendar events for user %s", user.get("id"))
        return []


def get_matching_events(user: dict) -> list[dict]:
    cfg = get_warmup_settings(user["id"])
    minutes_before: int = cfg["minutes_before"]
    keywords: list[str] = [k.lower() for k in cfg["keywords"]]
    events = get_upcoming_events(user, minutes_ahead=minutes_before)
    return [
        e for e in events
        if any(kw in e.get("summary", "").lower() for kw in keywords)
    ]
