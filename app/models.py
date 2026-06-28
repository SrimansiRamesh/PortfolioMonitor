"""Pydantic models for request and response payloads."""

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel


class Platform(str, Enum):
    render = "render"
    railway = "railway"
    fly = "fly"
    other = "other"


class ProjectCreate(BaseModel):
    name: str
    url: str
    platform: Platform


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    url: Optional[str] = None
    platform: Optional[Platform] = None


class ProjectResponse(BaseModel):
    id: str
    name: str
    url: str
    platform: Platform
    baseline_response_ms: Optional[int] = None
    is_active: bool
    created_at: datetime


class PingResponse(BaseModel):
    id: str
    project_id: str
    status_code: Optional[int] = None
    response_time_ms: Optional[int] = None
    classification: Optional[str] = None
    diagnosis: Optional[str] = None
    pinged_at: datetime


class IncidentResponse(BaseModel):
    id: str
    project_id: int
    opened_at: datetime
    closed_at: Optional[datetime] = None
    alerted: bool
