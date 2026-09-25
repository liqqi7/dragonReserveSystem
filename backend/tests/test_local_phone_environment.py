"""The local phone test database is independent and never silently rewritten."""

from __future__ import annotations

import sqlite3

import pytest

from scripts.init_local_phone_db import initialize


def test_local_phone_schema_created_and_reused(tmp_path):
    db_file = tmp_path / "local" / "local-phone.sqlite3"
    assert initialize(db_file) == "new schema created"
    with sqlite3.connect(db_file) as connection:
        assert "share_preview_file" in {column[1] for column in connection.execute("PRAGMA table_info(activities)")}
        connection.execute("INSERT INTO users (nickname, avatar_url, role) VALUES ('local', '', 'guest')")
    assert initialize(db_file) == "existing schema verified"
    with sqlite3.connect(db_file) as connection:
        assert connection.execute("SELECT count(*) FROM users").fetchone()[0] == 1


def test_local_phone_schema_refuses_to_overwrite_stale_db(tmp_path):
    db_file = tmp_path / "old.sqlite3"
    with sqlite3.connect(db_file) as connection:
        connection.execute("CREATE TABLE activities (id INTEGER PRIMARY KEY)")
    with pytest.raises(RuntimeError, match="outdated/incomplete"):
        initialize(db_file)
    with sqlite3.connect(db_file) as connection:
        assert {row[0] for row in connection.execute("SELECT name FROM sqlite_master WHERE type='table'")} == {"activities"}
