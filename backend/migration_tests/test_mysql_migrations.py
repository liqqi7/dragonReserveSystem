"""Real MySQL migration checks; only run against a disposable test server."""
import os
import subprocess
import sys
import uuid
from pathlib import Path

import pytest
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import make_url
from sqlalchemy.exc import IntegrityError

BACKEND = Path(__file__).resolve().parents[1]


@pytest.fixture
def migration_db():
    raw = os.environ.get("MIGRATION_TEST_SERVER_URL")
    if not raw:
        pytest.skip("MIGRATION_TEST_SERVER_URL must point to a disposable MySQL server")
    server_url = make_url(raw)
    assert server_url.get_backend_name() == "mysql"
    name = "migration_test_" + uuid.uuid4().hex
    server = create_engine(server_url)
    with server.begin() as connection:
        connection.exec_driver_sql(f"CREATE DATABASE `{name}` CHARACTER SET utf8mb4")
    url = server_url.set(database=name)
    engine = create_engine(url)

    def migrate(action, revision):
        env = {**os.environ, "APP_ENV": "test", "DATABASE_URL": url.render_as_string(hide_password=False)}
        result = subprocess.run(
            [sys.executable, "-m", "alembic", action, revision],
            cwd=BACKEND, env=env, capture_output=True, text=True,
        )
        # Do not include credentials in failure diagnostics.
        return result

    try:
        yield engine, migrate
    finally:
        engine.dispose()
        with server.begin() as connection:
            connection.exec_driver_sql(f"DROP DATABASE `{name}`")
        server.dispose()


def assert_success(result):
    assert result.returncode == 0, result.stderr[-4000:]


def test_full_chain_and_index_rollback(migration_db):
    engine, migrate = migration_db
    assert_success(migrate("upgrade", "20261009_0021"))
    inspector = inspect(engine)
    assert "ix_activities_end_time" in {i["name"] for i in inspector.get_indexes("activities")}
    assert "ix_users_wechat_openid" not in {i["name"] for i in inspector.get_indexes("users")}
    assert any(c["column_names"] == ["wechat_openid"] for c in inspector.get_unique_constraints("users"))
    with engine.begin() as connection:
        connection.execute(text("INSERT INTO users (nickname, role, wechat_openid) VALUES ('first','user','unique-openid')"))
    with pytest.raises(IntegrityError):
        with engine.begin() as connection:
            connection.execute(text("INSERT INTO users (nickname, role, wechat_openid) VALUES ('second','user','unique-openid')"))
    assert_success(migrate("downgrade", "20260924_0020"))
    assert "ix_users_wechat_openid" in {i["name"] for i in inspect(engine).get_indexes("users")}
    assert_success(migrate("upgrade", "head"))
    assert {"signup_deadline", "activity_type", "activity_style_key"}.isdisjoint(
        c["name"] for c in inspect(engine).get_columns("activities")
    )
    result = migrate("downgrade", "20261009_0021")
    assert result.returncode != 0 and "restore the pre-migration database backup" in result.stderr


def test_status_backfill_and_dynamic_foreign_key_rollback(migration_db):
    engine, migrate = migration_db
    assert_success(migrate("upgrade", "20260809_0009"))
    with engine.begin() as connection:
        connection.execute(text("INSERT INTO users (id, nickname, role) VALUES (1, 'test', 'user')"))
        connection.execute(text("""INSERT INTO activities
            (id,name,status,max_participants,start_time,end_time,created_by,signup_enabled)
            VALUES (1,'expired','进行中',3,'2000-01-01','2000-01-02',1,1)"""))
        connection.execute(text("""INSERT INTO activity_participants
            (activity_id,user_id,display_nickname,checked_in_at)
            VALUES (1,1,'test','2000-01-01')"""))
    with engine.begin() as connection:
        # Expired in Shanghai, but still future in UTC: catches session-zone bugs.
        connection.exec_driver_sql("UPDATE activities SET end_time = UTC_TIMESTAMP() + INTERVAL 7 HOUR WHERE id=1")
    assert_success(migrate("upgrade", "20260810_0010"))
    with engine.connect() as connection:
        assert connection.execute(text("SELECT status FROM activities WHERE id=1")).scalar_one() == "已结束"
        assert connection.execute(text("SELECT checkin_method FROM activity_participants")).scalar_one() == "admin"
    fk = next(f for f in inspect(engine).get_foreign_keys("activity_participants") if f["constrained_columns"] == ["user_id"])
    with engine.begin() as connection:
        connection.exec_driver_sql(f"ALTER TABLE activity_participants DROP FOREIGN KEY `{fk['name']}`")
        connection.exec_driver_sql("ALTER TABLE activity_participants ADD CONSTRAINT custom_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE")
    assert_success(migrate("downgrade", "20260809_0009"))
    assert "checkin_method" not in {c["name"] for c in inspect(engine).get_columns("activity_participants")}


def test_nullable_capacity_rollback_rejects_data_loss(migration_db):
    engine, migrate = migration_db
    assert_success(migrate("upgrade", "20260317_0006"))
    with engine.begin() as connection:
        connection.execute(text("INSERT INTO users (id,nickname,role) VALUES (1,'test','user')"))
        connection.execute(text("""INSERT INTO activities
            (name,max_participants,start_time,end_time,created_by,signup_enabled)
            VALUES ('unlimited',NULL,'2000-01-01','2000-01-02',1,1)"""))
    result = migrate("downgrade", "20260316_0005")
    assert result.returncode != 0 and "choose explicit capacities" in result.stderr
    with engine.begin() as connection:
        assert connection.execute(text("SELECT max_participants FROM activities")).scalar_one() is None
        connection.execute(text("UPDATE activities SET max_participants=3"))
    assert_success(migrate("downgrade", "20260316_0005"))


def test_physical_deletion_refuses_fake_rollback(migration_db):
    _, migrate = migration_db
    assert_success(migrate("upgrade", "20260906_0015"))
    result = migrate("downgrade", "20260904_0014")
    assert result.returncode != 0 and "restore the pre-migration database backup" in result.stderr


def test_legacy_display_columns_preserve_data(migration_db):
    engine, migrate = migration_db
    assert_success(migrate("upgrade", "20260810_0010"))
    with engine.begin() as connection:
        connection.execute(text("INSERT INTO users (id,nickname,role) VALUES (1,'test','user')"))
        connection.execute(text("""INSERT INTO activities
            (id,name,max_participants,start_time,end_time,created_by,signup_enabled)
            VALUES (1,'test',3,'2000-01-01','2000-01-02',1,1)"""))
        connection.execute(text("""INSERT INTO activity_participants
            (activity_id,user_id,display_nickname,display_avatar_url)
            VALUES (1,1,'original nickname','original avatar')"""))
        connection.exec_driver_sql("ALTER TABLE activity_participants CHANGE display_nickname nickname_snapshot VARCHAR(64) NOT NULL")
        connection.exec_driver_sql("ALTER TABLE activity_participants CHANGE display_avatar_url avatar_url_snapshot VARCHAR(512) NOT NULL DEFAULT ''")
    assert_success(migrate("upgrade", "20260810_0011"))
    with engine.connect() as connection:
        assert tuple(connection.execute(text("SELECT display_nickname, display_avatar_url FROM activity_participants")).one()) == ("original nickname", "original avatar")
    assert_success(migrate("downgrade", "20260810_0010"))
    assert_success(migrate("upgrade", "20260810_0011"))
