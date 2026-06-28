"""Incident endpoints."""

from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException

from app.auth import get_current_user
from app.database import supabase
from app.models import IncidentResponse
from app.scheduler.jobs import schedule_project

router = APIRouter(tags=["incidents"])


def _user_project_ids(user_id: str) -> list[str]:
    result = (
        supabase.table("projects")
        .select("id")
        .eq("user_id", user_id)
        .eq("is_active", True)
        .execute()
    )
    return [p["id"] for p in result.data]


def _assert_incident_ownership(incident_id: str, user_id: str) -> dict:
    """Return the incident if it belongs to one of the user's projects, else 404."""
    result = (
        supabase.table("incidents")
        .select("id, project_id, opened_at, closed_at, alerted")
        .eq("id", incident_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Incident not found")
    incident = result.data[0]
    project_ids = _user_project_ids(user_id)
    if str(incident["project_id"]) not in [str(p) for p in project_ids]:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident


@router.get("/projects/{project_id}/incidents", response_model=List[IncidentResponse])
def list_project_incidents(
    project_id: str,
    current_user: dict = Depends(get_current_user),
):
    proj = (
        supabase.table("projects")
        .select("id")
        .eq("id", project_id)
        .eq("user_id", current_user["id"])
        .execute()
    )
    if not proj.data:
        raise HTTPException(status_code=404, detail="Project not found")

    result = (
        supabase.table("incidents")
        .select("*")
        .eq("project_id", project_id)
        .order("opened_at", desc=True)
        .execute()
    )
    return result.data


@router.get("/incidents/open", response_model=List[IncidentResponse])
def list_open_incidents(current_user: dict = Depends(get_current_user)):
    project_ids = _user_project_ids(current_user["id"])
    if not project_ids:
        return []
    result = (
        supabase.table("incidents")
        .select("*")
        .in_("project_id", project_ids)
        .is_("closed_at", "null")
        .order("opened_at", desc=True)
        .execute()
    )
    return result.data


@router.post("/incidents/{incident_id}/pause")
@router.get("/incidents/{incident_id}/pause")
def pause_incident(incident_id: str, current_user: dict = Depends(get_current_user)):
    _assert_incident_ownership(incident_id, current_user["id"])
    supabase.table("incidents").update({"alerted": True}).eq("id", incident_id).execute()
    return {"status": "paused"}


@router.post("/projects/restart-by-incident/{incident_id}")
@router.get("/projects/restart-by-incident/{incident_id}")
def restart_by_incident(incident_id: str, current_user: dict = Depends(get_current_user)):
    incident = _assert_incident_ownership(incident_id, current_user["id"])
    project_id = incident["project_id"]

    project_result = (
        supabase.table("projects")
        .select("url")
        .eq("id", project_id)
        .execute()
    )
    if not project_result.data:
        raise HTTPException(status_code=404, detail="Project not found")

    supabase.table("incidents").update(
        {"closed_at": datetime.utcnow().isoformat()}
    ).eq("id", incident_id).execute()

    schedule_project(project_id, project_result.data[0]["url"], interval_minutes=5)
    return {"status": "restarted"}
