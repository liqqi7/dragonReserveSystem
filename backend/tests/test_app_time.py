from datetime import date, datetime, timedelta, timezone
from types import SimpleNamespace

import pytest

from app.services import activity_service, activity_share_preview_service as preview
from app.services import activity_weather_service, stats_service
from app.utils import app_time


@pytest.mark.parametrize("value, expected", [
    (None, None),
    (datetime(2026, 10, 10, 8), datetime(2026, 10, 10, 8)),
    (datetime(2026, 10, 9, 23, 30, tzinfo=timezone.utc), datetime(2026, 10, 10, 7, 30)),
    (datetime(2026, 10, 10, 1, tzinfo=timezone(timedelta(hours=9))), datetime(2026, 10, 10)),
    (datetime(2026, 10, 9, 12, tzinfo=timezone(timedelta(hours=-4))), datetime(2026, 10, 10)),
])
def test_normalization_preserves_application_local_time(value, expected):
    assert app_time.to_app_naive(value) == expected
    if value is None or value.tzinfo is None:
        assert app_time.to_app_naive(value) is value


def test_shared_clock_is_explicitly_shanghai_and_used_by_business_modules(monkeypatch):
    instant = datetime(2026, 12, 31, 23, 30, 15, 123456, tzinfo=timezone.utc)

    class FixedDatetime(datetime):
        @classmethod
        def now(cls, tz=None):
            assert tz is app_time.APP_TIME_ZONE
            return instant.astimezone(tz)

    monkeypatch.setattr(app_time, "datetime", FixedDatetime)
    expected = datetime(2027, 1, 1, 7, 30, 15, 123456)
    for clock in (app_time.app_now, activity_service._app_now, activity_weather_service.app_now, stats_service.app_now):
        assert clock is app_time.app_now
        assert clock() == expected
        assert clock().tzinfo is None
    assert preview.to_app_naive is app_time.to_app_naive
    assert stats_service.to_app_naive is app_time.to_app_naive


@pytest.mark.parametrize("now, expected", [
    (datetime(2026, 10, 10, 7, 59, 59, 999999), "\u672a\u5f00\u59cb"),
    (datetime(2026, 10, 10, 8), "\u8fdb\u884c\u4e2d"),
    (datetime(2026, 10, 10, 9), "\u5df2\u7ed3\u675f"),
])
def test_activity_start_and_end_boundaries_use_application_time(now, expected):
    activity = SimpleNamespace(
        status="\u672a\u5f00\u59cb",
        start_time=datetime(2026, 10, 10, tzinfo=timezone.utc),
        end_time=datetime(2026, 10, 10, 1, tzinfo=timezone.utc),
        participants=[object(), object(), object()],
    )
    assert activity_service._calculate_activity_status(activity, now) == expected


def test_ranking_splits_utc_interval_at_shanghai_midnight():
    assert stats_service._split_activity_hours_by_day(
        datetime(2026, 10, 9, 15, tzinfo=timezone.utc),
        datetime(2026, 10, 9, 17, tzinfo=timezone.utc),
        date(2026, 10, 9), date(2026, 10, 11),
    ) == {date(2026, 10, 9): 1.0, date(2026, 10, 10): 1.0}


def test_share_card_name_and_label_do_not_change_for_equivalent_times(monkeypatch, tmp_path):
    source = tmp_path / "source.jpg"
    source.write_bytes(b"source identity only; no rendering")
    monkeypatch.setattr(preview, "get_activity_cover_source_path", lambda cover: source)
    local = SimpleNamespace(
        id=1, activity_cover_id="cover", location_name="venue", location_address="address",
        start_time=datetime(2026, 12, 31, 23), end_time=datetime(2027, 1, 1, 1),
    )
    aware = SimpleNamespace(**vars(local))
    aware.start_time = datetime(2026, 12, 31, 15, tzinfo=timezone.utc)
    aware.end_time = datetime(2026, 12, 31, 17, tzinfo=timezone.utc)
    assert preview._source_and_name(local) == preview._source_and_name(aware)
    assert preview._time_text(local) == preview._time_text(aware)
