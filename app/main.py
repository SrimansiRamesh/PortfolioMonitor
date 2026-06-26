"""FastAPI application entry point."""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(name)s %(levelname)s %(message)s",
)

from app.routers import incidents, pings, projects
from app.scheduler.jobs import start_scheduler

app = FastAPI(title="portfolio-monitor")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(projects.router)
app.include_router(pings.router)
app.include_router(incidents.router)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.on_event("startup")
async def on_startup():
    await start_scheduler()
