"""Email alert helpers using Resend."""

import resend

from app.config import settings


def send_incident_alert(project_name: str, incident_id: str, diagnosis: str):
    """Send the opening alert email with two action links."""
    pause_url = f"{settings.API_BASE_URL}/incidents/{incident_id}/pause"
    restart_url = f"{settings.API_BASE_URL}/projects/restart-by-incident/{incident_id}"

    resend.api_key = settings.RESEND_API_KEY
    resend.Emails.send({
        "from": "Portfolio Monitor <onboarding@resend.dev>",
        "to": settings.ALERT_EMAIL,
        "subject": f"🔴 {project_name} is down",
        "html": f"""
            <h2>{project_name} is down</h2>
            <p>{diagnosis}</p>
            <p>
                <a href="{pause_url}">Pause alerts for this incident</a> &nbsp;|&nbsp;
                <a href="{restart_url}">I fixed it — restart monitoring</a>
            </p>
        """
    })


def send_recovery_alert(project_name: str, duration_minutes: int):
    """Send the recovery email when a site comes back up."""
    resend.api_key = settings.RESEND_API_KEY
    resend.Emails.send({
        "from": "Portfolio Monitor <onboarding@resend.dev>",
        "to": settings.ALERT_EMAIL,
        "subject": f"✅ {project_name} is back up",
        "html": f"""
            <h2>{project_name} is back up</h2>
            <p>The site recovered after {duration_minutes} minutes.</p>
        """
    })
