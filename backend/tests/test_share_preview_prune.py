from datetime import datetime, timedelta, timezone
import os

import pytest
from sqlalchemy.orm import sessionmaker

from app.services import activity_share_preview_service as preview
from scripts import prune_activity_share_previews as cleanup


NOW = datetime(2026, 10, 10, 12, tzinfo=timezone.utc)


@pytest.fixture
def prune_context(db_session, monkeypatch, tmp_path):
    maker = sessionmaker(bind=db_session.get_bind(), expire_on_commit=False)
    monkeypatch.setattr(cleanup, "SessionLocal", maker)
    monkeypatch.setattr(cleanup, "SHARE_PREVIEW_DIR", tmp_path)
    monkeypatch.setattr(preview, "SHARE_PREVIEW_DIR", tmp_path)

    class FixedDatetime(datetime):
        @classmethod
        def now(cls, tz=None):
            return NOW.astimezone(tz)

    monkeypatch.setattr(cleanup, "datetime", FixedDatetime)
    return tmp_path, maker


def make_file(root, name, *, age=timedelta(days=15)):
    path = root / name
    path.write_bytes(b"file identity only; no rendering")
    stamp = (NOW - age).timestamp()
    os.utime(path, (stamp, stamp))
    return path


@pytest.mark.parametrize("length", [23, 24, 25, 31, 32, 33])
def test_serving_and_cleanup_deliberately_accept_different_lengths(prune_context, length):
    root, _ = prune_context
    name = f"activity-1-{'a' * length}.png"
    if length == 24:
        assert preview.share_preview_path(name) == root / name
    else:
        with pytest.raises(ValueError, match="Invalid"):
            preview.share_preview_path(name)
    assert bool(cleanup.PRUNABLE_FILE_NAME.fullmatch(name)) == (24 <= length <= 32)


@pytest.mark.parametrize("name", [
    "../activity-1-" + "a" * 24 + ".png",
    "activity-1-" + "a" * 24 + ".png\n",
    "activity-1-" + "a" * 24 + ".jpg",
    "activity-1-" + "A" * 24 + ".png",
    "activity-x-" + "a" * 24 + ".png",
])
def test_invalid_names_are_not_served_or_pruned(name):
    with pytest.raises(ValueError, match="Invalid"):
        preview.share_preview_path(name)
    assert not cleanup.PRUNABLE_FILE_NAME.fullmatch(name)


def test_default_dry_run_preserves_old_unreferenced_files(prune_context, capsys):
    root, _ = prune_context
    files = [make_file(root, f"activity-{length}-{'b' * length}.png") for length in (24, 32)]
    cleanup.prune()
    assert all(path.is_file() for path in files)
    assert capsys.readouterr().out.count("DRY-RUN") == 2


def test_apply_only_removes_old_valid_unreferenced_files(prune_context, db_session, sample_activity):
    root, _ = prune_context
    removable = [make_file(root, f"activity-{length}-{'c' * length}.png") for length in (24, 25, 31, 32)]
    referenced = make_file(root, "activity-1-" + "d" * 32 + ".png")
    recent = make_file(root, "activity-2-" + "e" * 24 + ".png", age=timedelta(days=13))
    invalid = make_file(root, "activity-3-" + "f" * 33 + ".png")
    sample_activity.share_preview_file = referenced.name
    db_session.commit()
    cleanup.prune(apply=True)
    assert all(not path.exists() for path in removable)
    assert all(path.is_file() for path in (referenced, recent, invalid))


def test_reference_is_rechecked_immediately_before_deletion(prune_context, db_session, sample_activity, monkeypatch):
    root, maker = prune_context
    path = make_file(root, "activity-1-" + "a" * 24 + ".png")
    calls = 0

    def acquire_session():
        nonlocal calls
        calls += 1
        if calls == 2:
            sample_activity.share_preview_file = path.name
            db_session.commit()
        return maker()

    monkeypatch.setattr(cleanup, "SessionLocal", acquire_session)
    cleanup.prune(apply=True)
    assert calls == 2
    assert path.is_file()


@pytest.mark.parametrize("age, removed", [
    (timedelta(days=14), True),
    (timedelta(days=14) - timedelta(seconds=1), False),
])
def test_default_retention_boundary(prune_context, age, removed):
    root, _ = prune_context
    path = make_file(root, "activity-1-" + "a" * 24 + ".png", age=age)
    cleanup.prune(apply=True)
    assert path.exists() is not removed


def test_minimum_retention_is_enforced_before_database_access(monkeypatch):
    def unexpected_session():
        pytest.fail("Invalid retention must not access the database")

    monkeypatch.setattr(cleanup, "SessionLocal", unexpected_session)
    with pytest.raises(ValueError, match="At least 7"):
        cleanup.prune(apply=True, min_age_days=6)


@pytest.mark.parametrize("arguments, expected", [
    ([], {"apply": False, "min_age_days": 14}),
    (["--apply", "--min-age-days", "7"], {"apply": True, "min_age_days": 7}),
])
def test_cli_options_preserve_defaults_and_explicit_apply(monkeypatch, arguments, expected):
    calls = []
    monkeypatch.setattr("sys.argv", ["prune_activity_share_previews.py", *arguments])
    monkeypatch.setattr(cleanup, "prune", lambda **kwargs: calls.append(kwargs))
    cleanup.main()
    assert calls == [expected]


def test_cli_rejects_unsafe_retention_without_running_cleanup(monkeypatch):
    monkeypatch.setattr("sys.argv", ["prune_activity_share_previews.py", "--min-age-days", "6"])
    monkeypatch.setattr(cleanup, "prune", lambda **kwargs: pytest.fail("Cleanup must not run"))
    with pytest.raises(SystemExit) as error:
        cleanup.main()
    assert error.value.code == 2
