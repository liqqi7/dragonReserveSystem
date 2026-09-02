from __future__ import annotations

from datetime import date
from types import SimpleNamespace

from app.api.v1 import weather as weather_api
from app.services.qweather_service import QWeatherService


def configured_settings() -> SimpleNamespace:
    return SimpleNamespace(
        qweather_developer_id="developer",
        qweather_project_id="project",
        qweather_credential_id="credential",
        qweather_api_host="example.qweatherapi.com",
        qweather_private_key_path="secrets/qweather-ed25519-private.pem",
        qweather_timeout_seconds=8.0,
        qweather_cache_seconds=1800,
    )


def test_weather_route_passes_validated_parameters(client, monkeypatch) -> None:
    calls = []

    class FakeService:
        def get_activity_weather(self, **kwargs):
            calls.append(kwargs)
            return {"available": False, "reason": "test"}

    monkeypatch.setattr(weather_api, "get_qweather_service", lambda: FakeService())
    response = client.get(
        "/api/v1/weather/activity",
        params={"longitude": 116.4074, "latitude": 39.9042, "date": "2026-09-05"},
    )

    assert response.status_code == 200
    assert calls == [{
        "longitude": 116.4074,
        "latitude": 39.9042,
        "target_date": date(2026, 9, 5),
    }]


def test_unconfigured_weather_service_degrades_without_error() -> None:
    service = QWeatherService()
    service.settings = configured_settings()
    service.settings.qweather_developer_id = ""

    result = service.get_activity_weather(
        longitude=116.4074,
        latitude=39.9042,
        target_date=date(2026, 9, 5),
    )

    assert result["available"] is False
    assert result["reason"] == "service_unconfigured"


def test_weather_service_normalizes_weather_and_air_quality(monkeypatch) -> None:
    service = QWeatherService()
    service.settings = configured_settings()

    def fake_request(path, *, params=None):
        if path == "/v7/weather/30d":
            assert params == {"location": "116.407400,39.904200", "lang": "zh"}
            return {
                "daily": [{
                    "fxDate": "2026-09-05",
                    "tempMin": "18",
                    "tempMax": "24",
                    "textDay": "晴间多云",
                    "iconDay": "103",
                    "humidity": "58",
                    "windDirDay": "东南风",
                    "windScaleDay": "2",
                }]
            }
        return {
            "days": [{
                "forecastStartTime": "2026-09-05T00:00+08:00",
                "indexes": [{"code": "cn-mee-1h", "category": "优", "aqi": "32"}],
            }]
        }

    monkeypatch.setattr(service, "_request_json", fake_request)
    result = service.get_activity_weather(
        longitude=116.4074,
        latitude=39.9042,
        target_date=date(2026, 9, 5),
    )

    assert result["available"] is True
    assert result["temperature"] == 24
    assert result["temperature_min"] == 18
    assert result["temperature_max"] == 24
    assert result["air_quality"] == "优 32"


def test_air_quality_failure_does_not_hide_weather(monkeypatch) -> None:
    service = QWeatherService()
    service.settings = configured_settings()

    def fake_request(path, *, params=None):
        if path == "/v7/weather/30d":
            return {"daily": [{"fxDate": "2026-09-05", "tempMax": "24", "textDay": "晴"}]}
        raise RuntimeError("air quality unavailable")

    monkeypatch.setattr(service, "_request_json", fake_request)
    result = service.get_activity_weather(
        longitude=116.4074,
        latitude=39.9042,
        target_date=date(2026, 9, 5),
    )

    assert result["available"] is True
    assert result["temperature"] == 24
    assert result["air_quality"] is None


def test_out_of_forecast_range_returns_unavailable(monkeypatch) -> None:
    service = QWeatherService()
    service.settings = configured_settings()
    monkeypatch.setattr(service, "_request_json", lambda *args, **kwargs: {"daily": []})

    result = service.get_activity_weather(
        longitude=116.4074,
        latitude=39.9042,
        target_date=date(2026, 12, 31),
    )

    assert result["available"] is False
    assert result["reason"] == "forecast_out_of_range"
