"""Public weather endpoint for activity detail pages."""

from datetime import date

from fastapi import APIRouter, Query

from app.services.qweather_service import get_qweather_service

router = APIRouter(prefix="/weather", tags=["weather"])


@router.get("/activity")
def get_activity_weather(
    longitude: float = Query(ge=-180, le=180),
    latitude: float = Query(ge=-90, le=90),
    target_date: date = Query(alias="date"),
) -> dict:
    return get_qweather_service().get_activity_weather(
        longitude=longitude,
        latitude=latitude,
        target_date=target_date,
    )
