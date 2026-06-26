"""Project endpoints — all access goes through the Supabase service-role client."""

from datetime import datetime
from typing import List

from fastapi import APIRouter, HTTPException

from app.database import supabase
from app.models import ProjectCreate, ProjectResponse
from app.scheduler.jobs import schedule_project

router = APIRouter(prefix="/projects", tags=["projects"])


@router.post("", response_model=ProjectResponse, status_code=201)
async def create_project(project: ProjectCreate):
    payload = {
        "name": project.name,
        "url": project.url,
        "platform": project.platform.value,
    }
    result = supabase.table("projects").insert(payload).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create project")
    created = result.data[0]
    schedule_project(created["id"], created["url"])
    return created


@router.get("", response_model=List[ProjectResponse])
def list_projects():
    result = (
        supabase.table("projects")
        .select("*")
        .eq("is_active", True)
        .execute()
    )
    return result.data


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(project_id: str):
    result = (
        supabase.table("projects")
        .select("*")
        .eq("id", project_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Project not found")
    return result.data[0]


@router.delete("/{project_id}", response_model=ProjectResponse)
def delete_project(project_id: str):
    """Soft delete — set is_active to false."""
    result = (
        supabase.table("projects")
        .update({"is_active": False})
        .eq("id", project_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Project not found")
    return result.data[0]


@router.post("/{project_id}/restart")
def restart_project(project_id: str):
    """Reset ping interval to 5 minutes and close any open incident."""
    result = (
        supabase.table("projects")
        .select("url")
        .eq("id", project_id)
        .maybe_single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Project not found")

    url = result.data["url"]
    schedule_project(project_id, url, interval_minutes=5)

    open_incident = (
        supabase.table("incidents")
        .select("id")
        .eq("project_id", project_id)
        .is_("closed_at", "null")
        .execute()
    )
    if open_incident.data:
        supabase.table("incidents").update(
            {"closed_at": datetime.utcnow().isoformat()}
        ).eq("id", open_incident.data[0]["id"]).execute()

    return {"status": "restarted"}
