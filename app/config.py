"""Application configuration — loads environment variables via python-dotenv."""

import os

from dotenv import load_dotenv

load_dotenv()


class _Settings:
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    SLACK_WEBHOOK_URL: str = os.getenv("SLACK_WEBHOOK_URL", "")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    RESEND_API_KEY: str = os.getenv("RESEND_API_KEY", "")
    ALERT_EMAIL: str = os.getenv("ALERT_EMAIL", "")
    API_BASE_URL: str = os.getenv("API_BASE_URL", "http://localhost:8000")


settings = _Settings()

# Backward compatibility for existing imports
SUPABASE_URL = settings.SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY = settings.SUPABASE_SERVICE_ROLE_KEY
SLACK_WEBHOOK_URL = settings.SLACK_WEBHOOK_URL
DATABASE_URL = settings.DATABASE_URL
