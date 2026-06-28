"""Ping endpoints."""

from typing import List

from fastapi import APIRouter, Depends, HTTPException

from app.auth import get_current_user
from app.database import supabase
from app.models import PingResponse

router = APIRouter(prefix="/projects", tags=["pings"])


@router.get("/{project_id}/pings", response_model=List[PingResponse])
def list_pings(project_id: str, current_user: dict = Depends(get_current_user)):
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
        supabase.table("pings")
        .select("*")
        .eq("project_id", project_id)
        .order("pinged_at", desc=True)
        .limit(50)
        .execute()
    )
    return result.data
