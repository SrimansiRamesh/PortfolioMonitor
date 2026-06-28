"""Google OAuth2 sign-in endpoints."""

import base64
import hashlib
import json
import logging
import os
import secrets
import tempfile

import httpx
from fastapi import APIRouter, Depends
from fastapi.responses import RedirectResponse

from app.auth import create_access_token, get_current_user
from app.config import settings
from app.database import supabase

os.environ.setdefault("OAUTHLIB_INSECURE_TRANSPORT", "1")
# Allow Google to return a narrower scope (e.g. calendar not yet approved)
os.environ.setdefault("OAUTHLIB_RELAX_TOKEN_SCOPE", "1")

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])

# File-backed PKCE store — survives --reload restarts
_PKCE_FILE = os.path.join(tempfile.gettempdir(), "pm_pkce.json")


def _pkce_set(state: str, verifier: str) -> None:
    try:
        store: dict = {}
        if os.path.exists(_PKCE_FILE):
            with open(_PKCE_FILE) as f:
                store = json.load(f)
        store[state] = verifier
        with open(_PKCE_FILE, "w") as f:
            json.dump(store, f)
    except Exception:
        logger.exception("Failed to write PKCE store")


def _pkce_pop(state: str) -> str | None:
    try:
        if not os.path.exists(_PKCE_FILE):
            return None
        with open(_PKCE_FILE) as f:
            store = json.load(f)
        verifier = store.pop(state, None)
        with open(_PKCE_FILE, "w") as f:
            json.dump(store, f)
        return verifier
    except Exception:
        logger.exception("Failed to read PKCE store")
        return None


def _make_verifier() -> str:
    return secrets.token_urlsafe(32)


def _make_challenge(verifier: str) -> str:
    digest = hashlib.sha256(verifier.encode()).digest()
    return base64.urlsafe_b64encode(digest).rstrip(b"=").decode()

SCOPES = [
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/calendar.readonly",
]


def _make_flow():
    from google_auth_oauthlib.flow import Flow

    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [settings.GOOGLE_REDIRECT_URI],
            }
        },
        scopes=SCOPES,
    )
    flow.redirect_uri = settings.GOOGLE_REDIRECT_URI
    return flow


@router.get("/google")
def google_auth():
    """Return the Google OAuth consent URL."""
    flow = _make_flow()
    verifier = _make_verifier()
    challenge = _make_challenge(verifier)
    auth_url, state = flow.authorization_url(
        access_type="offline",
        prompt="consent",
        code_challenge=challenge,
        code_challenge_method="S256",
    )
    _pkce_set(state, verifier)
    return {"auth_url": auth_url}


@router.get("/callback")
def google_callback(code: str = "", state: str = "", error: str = ""):
    """Exchange code → upsert user → redirect to frontend with JWT."""
    if error or not code:
        return RedirectResponse(url=f"{settings.FRONTEND_URL}?auth=error")
    try:
        flow = _make_flow()
        verifier = _pkce_pop(state)
        flow.fetch_token(code=code, code_verifier=verifier)
        creds = flow.credentials

        user_info = httpx.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {creds.token}"},
        ).json()

        google_id: str = user_info["sub"]
        email: str = user_info.get("email", "")
        name: str = user_info.get("name", "")
        avatar_url: str = user_info.get("picture", "")

        existing = (
            supabase.table("users")
            .select("id, refresh_token")
            .eq("google_id", google_id)
            .execute()
        )

        if existing.data:
            row = existing.data[0]
            update: dict = {"name": name, "avatar_url": avatar_url}
            if creds.refresh_token:
                update["refresh_token"] = creds.refresh_token
            supabase.table("users").update(update).eq("id", row["id"]).execute()
            user_id: str = row["id"]
        else:
            result = (
                supabase.table("users")
                .insert({
                    "google_id": google_id,
                    "email": email,
                    "name": name,
                    "avatar_url": avatar_url,
                    "refresh_token": creds.refresh_token,
                })
                .execute()
            )
            user_id = result.data[0]["id"]

        token = create_access_token(user_id=user_id, email=email, name=name)
        return RedirectResponse(url=f"{settings.FRONTEND_URL}?token={token}")

    except Exception:
        logger.exception("OAuth callback error")
        return RedirectResponse(url=f"{settings.FRONTEND_URL}?auth=error")


@router.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "id": current_user["id"],
        "email": current_user["email"],
        "name": current_user["name"],
        "avatar_url": current_user["avatar_url"],
    }
