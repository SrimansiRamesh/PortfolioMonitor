"""Incident endpoints."""

from datetime import datetime
from typing import List

from fastapi import APIRouter, HTTPException

from app.database import supabase
from app.models import IncidentResponse
from app.scheduler.jobs import schedule_project

router = APIRouter(tags=["incidents"])


@router.get("/projects/{project_id}/incidents", response_model=List[IncidentResponse])
def list_project_incidents(project_id: int):
    """Return all incidents for a project."""
    result = (
        supabase.table("incidents")
        .select("*")
        .eq("project_id", project_id)
        .order("opened_at", desc=True)
        .execute()
    )
    return result.data


@router.get("/incidents/open", response_model=List[IncidentResponse])
def list_open_incidents():
    """Return all currently open incidents across all projects."""
    result = (
        supabase.table("incidents")
        .select("*")
        .is_("closed_at", "null")
        .order("opened_at", desc=True)
        .execute()
    )
    return result.data


@router.post("/incidents/{incident_id}/pause")
@router.get("/incidents/{incident_id}/pause")
def pause_incident(incident_id: str):
    """Suppress further alerts for this incident."""
    result = (
        supabase.table("incidents")
        .update({"alerted": True})
        .eq("id", incident_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Incident not found")
    return {"status": "paused"}


@router.post("/projects/restart-by-incident/{incident_id}")
@router.get("/projects/restart-by-incident/{incident_id}")
def restart_by_incident(incident_id: str):
    """Close the incident and reset the project's ping interval to 5 minutes."""
    incident_result = (
        supabase.table("incidents")
        .select("id, project_id")
        .eq("id", incident_id)
        .maybe_single()
        .execute()
    )
    if not incident_result.data:
        raise HTTPException(status_code=404, detail="Incident not found")

    project_id = incident_result.data["project_id"]

    project_result = (
        supabase.table("projects")
        .select("url")
        .eq("id", project_id)
        .maybe_single()
        .execute()
    )
    if not project_result.data:
        raise HTTPException(status_code=404, detail="Project not found")

    url = project_result.data["url"]

    supabase.table("incidents").update(
        {"closed_at": datetime.utcnow().isoformat()}
    ).eq("id", incident_id).execute()

    schedule_project(project_id, url, interval_minutes=5)

    return {"status": "restarted"}
