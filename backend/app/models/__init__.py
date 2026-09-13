"""Database models package."""

from app.models.activity import Activity, ActivityParticipant
from app.models.activity_weather import ActivityWeatherSnapshot
from app.models.user import User
from app.models import boardgame  # Register board game tables with Alembic and tests.

__all__ = ["User", "Activity", "ActivityParticipant", "ActivityWeatherSnapshot"]
