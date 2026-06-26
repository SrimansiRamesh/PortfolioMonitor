"""Ping endpoints."""

from typing import List

from fastapi import APIRouter

from app.database import supabase
from app.models import PingResponse

router = APIRouter(prefix="/projects", tags=["pings"])


@router.get("/{project_id}/pings", response_model=List[PingResponse])
def list_pings(project_id: str):
    """Return the last 50 pings for a project, newest first."""
    result = (
        supabase.table("pings")
        .select("*")
        .eq("project_id", project_id)
        .order("pinged_at", desc=True)
        .limit(50)
        .execute()
    )
    return result.data
