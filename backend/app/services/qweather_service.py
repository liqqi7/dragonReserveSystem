"""QWeather client used by public activity-detail weather cards."""

from __future__ import annotations

import base64
import json
import threading
import time
from dataclasses import dataclass
from datetime import date
from functools import lru_cache
from pathlib import Path
from typing import Any

import httpx
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

from app.core.config import get_settings

_BACKEND_DIR = Path(__file__).resolve().parents[2]
_DEFAULT_UNAVAILABLE_MESSAGE = "距离活动时间较远，暂不展示天气信息"
_ATTRIBUTION = "天气服务驱动 by QWeather"


def _base64url(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


def _as_number(value: Any) -> int | float | None:
    if value is None or value == "":
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return int(number) if number.is_integer() else number


@dataclass
class _CacheEntry:
    expires_at: float
    payload: dict[str, Any]


class QWeatherService:
    def __init__(self) -> None:
        self.settings = get_settings()
        self._cache: dict[str, _CacheEntry] = {}
        self._cache_lock = threading.Lock()
        self._private_key: Ed25519PrivateKey | None = None

    def _is_configured(self) -> bool:
        return all(
            [
                self.settings.qweather_developer_id,
                self.settings.qweather_project_id,
                self.settings.qweather_credential_id,
                self.settings.qweather_api_host,
                self.settings.qweather_private_key_path,
            ]
        )

    def _resolve_private_key_path(self) -> Path:
        configured = Path(self.settings.qweather_private_key_path)
        return configured if configured.is_absolute() else _BACKEND_DIR / configured

    def _load_private_key(self) -> Ed25519PrivateKey:
        if self._private_key is not None:
            return self._private_key
        raw = self._resolve_private_key_path().read_bytes()
        key = serialization.load_pem_private_key(raw, password=None)
        if not isinstance(key, Ed25519PrivateKey):
            raise ValueError("QWeather private key must be Ed25519")
        self._private_key = key
        return key

    def _build_token(self) -> str:
        now = int(time.time())
        header = {"alg": "EdDSA", "kid": self.settings.qweather_credential_id}
        payload = {
            "sub": self.settings.qweather_project_id,
            "iss": self.settings.qweather_developer_id,
            "iat": now - 30,
            "exp": now + 900,
        }
        encoded_header = _base64url(json.dumps(header, separators=(",", ":")).encode("utf-8"))
        encoded_payload = _base64url(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
        signing_input = f"{encoded_header}.{encoded_payload}".encode("ascii")
        signature = self._load_private_key().sign(signing_input)
        return f"{encoded_header}.{encoded_payload}.{_base64url(signature)}"

    def _request_json(self, path: str, *, params: dict[str, Any] | None = None) -> dict[str, Any]:
        host = self.settings.qweather_api_host.strip().replace("https://", "").replace("http://", "").rstrip("/")
        response = httpx.get(
            f"https://{host}{path}",
            params=params,
            headers={"Authorization": f"Bearer {self._build_token()}"},
            timeout=self.settings.qweather_timeout_seconds,
        )
        response.raise_for_status()
        payload = response.json()
        if isinstance(payload, dict) and str(payload.get("code", "200")) not in {"200", "0"}:
            raise RuntimeError(f"QWeather returned code {payload.get('code')}")
        return payload

    @staticmethod
    def _find_daily_weather(payload: dict[str, Any], target_date: str) -> dict[str, Any] | None:
        for item in payload.get("daily") or []:
            if str(item.get("fxDate") or item.get("date") or "") == target_date:
                return item
        return None

    @staticmethod
    def _find_air_quality(payload: dict[str, Any], target_date: str) -> str | None:
        def format_index(index: dict[str, Any]) -> str | None:
            category = str(index.get("category") or index.get("name") or "").strip()
            aqi = str(index.get("aqiDisplay") or index.get("aqi") or "").strip()
            if category and aqi and category != aqi:
                return f"{category} {aqi}"
            return category or aqi or None

        for item in payload.get("days") or payload.get("daily") or []:
            item_date = str(item.get("forecastStartTime") or item.get("fxDate") or item.get("date") or "")[:10]
            if item_date != target_date:
                continue
            indexes = item.get("indexes") or item.get("indices") or []
            if indexes:
                preferred = next(
                    (
                        index for index in indexes
                        if isinstance(index, dict) and str(index.get("code") or "").lower() in {"cn-mee-1h", "cn-mee"}
                    ),
                    None,
                )
                value = format_index(preferred or indexes[0] or {})
                if value:
                    return value
            return format_index(item)
        return None

    def get_activity_weather(self, *, longitude: float, latitude: float, target_date: date) -> dict[str, Any]:
        target_date_text = target_date.isoformat()
        if not self._is_configured():
            return {
                "available": False,
                "reason": "service_unconfigured",
                "message": _DEFAULT_UNAVAILABLE_MESSAGE,
                "attribution": _ATTRIBUTION,
            }

        cache_key = f"{longitude:.4f}:{latitude:.4f}:{target_date_text}"
        now = time.monotonic()
        with self._cache_lock:
            cached = self._cache.get(cache_key)
            if cached and cached.expires_at > now:
                return dict(cached.payload)

        try:
            weather_payload = self._request_json(
                "/v7/weather/30d",
                params={"location": f"{longitude:.6f},{latitude:.6f}", "lang": "zh"},
            )
            daily = self._find_daily_weather(weather_payload, target_date_text)
            if daily is None:
                result = {
                    "available": False,
                    "reason": "forecast_out_of_range",
                    "message": _DEFAULT_UNAVAILABLE_MESSAGE,
                    "attribution": _ATTRIBUTION,
                }
            else:
                air_quality = None
                try:
                    air_payload = self._request_json(f"/airquality/v1/daily/{latitude:.6f}/{longitude:.6f}")
                    air_quality = self._find_air_quality(air_payload, target_date_text)
                except Exception:
                    air_quality = None
                result = {
                    "available": True,
                    "date": target_date_text,
                    "temperature": _as_number(daily.get("tempMax") if daily.get("tempMax") not in {None, ""} else daily.get("tempMin")),
                    "temperature_min": _as_number(daily.get("tempMin")),
                    "temperature_max": _as_number(daily.get("tempMax")),
                    "condition": daily.get("textDay") or daily.get("textNight") or "",
                    "icon_code": daily.get("iconDay") or daily.get("iconNight") or "",
                    "humidity": _as_number(daily.get("humidity")),
                    "wind_direction": daily.get("windDirDay") or daily.get("windDirNight") or "",
                    "wind_scale": daily.get("windScaleDay") or daily.get("windScaleNight") or "",
                    "air_quality": air_quality,
                    "attribution": _ATTRIBUTION,
                }
        except Exception:
            result = {
                "available": False,
                "reason": "upstream_unavailable",
                "message": _DEFAULT_UNAVAILABLE_MESSAGE,
                "attribution": _ATTRIBUTION,
            }

        with self._cache_lock:
            self._cache[cache_key] = _CacheEntry(
                expires_at=now + max(30, self.settings.qweather_cache_seconds),
                payload=dict(result),
            )
        return result


@lru_cache
def get_qweather_service() -> QWeatherService:
    return QWeatherService()
