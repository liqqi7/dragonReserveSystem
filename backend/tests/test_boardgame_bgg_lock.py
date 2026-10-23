from types import SimpleNamespace

import pytest

from app.core.config import get_settings
from app.services import boardgame_worker


def test_bgg_lock_waits_before_next_request_not_after_current(monkeypatch):
    interval = 0.08
    clock = [100.0]
    sleeps = []

    def sleep(seconds):
        sleeps.append(seconds)
        clock[0] += seconds

    monkeypatch.setattr(get_settings(), 'bgg_min_interval_seconds', interval)
    monkeypatch.setattr(boardgame_worker, '_last_bgg_request_at', None)
    monkeypatch.setattr(boardgame_worker, 'time', SimpleNamespace(monotonic=lambda: clock[0], sleep=sleep))
    engine = SimpleNamespace(dialect=SimpleNamespace(name='sqlite'))

    with boardgame_worker.bgg_lock(engine) as acquired:
        assert acquired
    assert sleeps == []
    assert clock[0] == 100.0

    clock[0] += interval / 2
    with boardgame_worker.bgg_lock(engine) as acquired:
        assert acquired
        assert clock[0] == 100.0 + interval
    assert sleeps == pytest.approx([interval / 2])
