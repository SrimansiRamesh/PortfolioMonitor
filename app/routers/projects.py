"""Project endpoints — scoped to the authenticated user."""

from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException

from app.auth import get_current_user
from app.database import supabase
from app.models import ProjectCreate, ProjectResponse, ProjectUpdate
from app.scheduler.jobs import schedule_project

router = APIRouter(prefix="/projects", tags=["projects"])


@router.post("", response_model=ProjectResponse, status_code=201)
async def create_project(
    project: ProjectCreate,
    current_user: dict = Depends(get_current_user),
):
    payload = {
        "name": project.name,
        "url": project.url,
        "platform": project.platform.value,
        "ping_interval_minutes": project.ping_interval_minutes,
        "user_id": current_user["id"],
    }
    result = supabase.table("projects").insert(payload).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create project")
    created = result.data[0]
    schedule_project(created["id"], created["url"], interval_minutes=created["ping_interval_minutes"])
    return created


@router.get("", response_model=List[ProjectResponse])
def list_projects(current_user: dict = Depends(get_current_user)):
    result = (
        supabase.table("projects")
        .select("*")
        .eq("is_active", True)
        .eq("user_id", current_user["id"])
        .execute()
    )
    return result.data


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(project_id: str, current_user: dict = Depends(get_current_user)):
    result = (
        supabase.table("projects")
        .select("*")
        .eq("id", project_id)
        .eq("user_id", current_user["id"])
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Project not found")
    return result.data[0]


@router.patch("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: str,
    body: ProjectUpdate,
    current_user: dict = Depends(get_current_user),
):
    payload = body.model_dump(exclude_none=True)
    if not payload:
        raise HTTPException(status_code=400, detail="No fields to update")
    if "platform" in payload:
        payload["platform"] = payload["platform"].value
    result = (
        supabase.table("projects")
        .update(payload)
        .eq("id", project_id)
        .eq("user_id", current_user["id"])
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Project not found")
    updated = result.data[0]
    if "url" in payload or "ping_interval_minutes" in payload:
        schedule_project(project_id, updated["url"], interval_minutes=updated["ping_interval_minutes"])
    return updated


@router.delete("/{project_id}", response_model=ProjectResponse)
def delete_project(project_id: str, current_user: dict = Depends(get_current_user)):
    result = (
        supabase.table("projects")
        .update({"is_active": False})
        .eq("id", project_id)
        .eq("user_id", current_user["id"])
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Project not found")
    return result.data[0]


@router.post("/{project_id}/restart")
def restart_project(project_id: str, current_user: dict = Depends(get_current_user)):
    result = (
        supabase.table("projects")
        .select("url, ping_interval_minutes")
        .eq("id", project_id)
        .eq("user_id", current_user["id"])
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Project not found")

    project = result.data[0]
    schedule_project(project_id, project["url"], interval_minutes=project.get("ping_interval_minutes", 5))

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
