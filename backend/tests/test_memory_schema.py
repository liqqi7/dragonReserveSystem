"""Memory-only shared-database provisioning must preserve collaborating schemas."""
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path

import pytest
from sqlalchemy import create_engine, event, inspect, text

REVISION = Path(__file__).resolve().parents[1] / "alembic/versions/20261011_0024_memories.py"
spec = spec_from_file_location("test_memory_revision", REVISION)
schema = module_from_spec(spec)
spec.loader.exec_module(schema)


@pytest.fixture
def shared_db():
    engine = create_engine("sqlite://")
    with engine.begin() as connection:
        connection.exec_driver_sql("CREATE TABLE users (id INTEGER PRIMARY KEY)")
        connection.exec_driver_sql("CREATE TABLE activities (id INTEGER PRIMARY KEY, legacy_field TEXT)")
        connection.exec_driver_sql("CREATE TABLE boardgames (id INTEGER PRIMARY KEY, future_column TEXT)")
        connection.exec_driver_sql("INSERT INTO boardgames VALUES (1, 'other developers data')")
        connection.exec_driver_sql("CREATE TABLE alembic_version (version_num VARCHAR(32) PRIMARY KEY)")
        connection.exec_driver_sql("INSERT INTO alembic_version VALUES ('20260924_0020')")
        connection.exec_driver_sql("INSERT INTO users VALUES (1)")
    try:
        yield engine
    finally:
        engine.dispose()


def test_additive_schema_dry_run_and_rerun_preserve_shared_tables(shared_db):
    with shared_db.begin() as connection:
        before = set(inspect(connection).get_table_names())
        ddl = []
        event.listen(shared_db, "before_cursor_execute", lambda conn, cursor, sql, *args: ddl.append(sql))
        assert set(schema.ensure_schema(connection, apply=False)) == set(schema.MEMORY_TABLES)
        assert set(inspect(connection).get_table_names()) == before
        assert not any(sql.startswith(("CREATE ", "ALTER ", "DROP ")) for sql in ddl)
        assert set(schema.ensure_schema(connection)) == set(schema.MEMORY_TABLES)
        assert set(inspect(connection).get_table_names()) == before | set(schema.MEMORY_TABLES)
        connection.execute(text("UPDATE memory_capacity SET reserved_bytes=123 WHERE id=1"))
        assert schema.ensure_schema(connection) == []
        assert connection.scalar(text("SELECT reserved_bytes FROM memory_capacity WHERE id=1")) == 123
        assert connection.execute(text("SELECT * FROM boardgames")).one() == (1, 'other developers data')
        assert "legacy_field" in {c["name"] for c in inspect(connection).get_columns("activities")}
        assert connection.scalar(text("SELECT version_num FROM alembic_version")) == "20260924_0020"
        assert not any(sql.startswith(("ALTER ", "DROP ")) for sql in ddl)


def test_incompatible_existing_memory_table_stops_before_any_creation(shared_db):
    with shared_db.begin() as connection:
        connection.exec_driver_sql("CREATE TABLE memories (id INTEGER PRIMARY KEY)")
        before = set(inspect(connection).get_table_names())
        with pytest.raises(RuntimeError, match="column set differs"):
            schema.ensure_schema(connection)
        assert set(inspect(connection).get_table_names()) == before


def test_existing_missing_index_is_not_silently_adopted(shared_db):
    with shared_db.begin() as connection:
        schema.ensure_schema(connection)
        connection.exec_driver_sql("DROP INDEX ix_memories_public")
        with pytest.raises(RuntimeError, match="Missing memory index"):
            schema.ensure_schema(connection)


def test_existing_wrong_column_type_is_not_silently_adopted(shared_db):
    with shared_db.begin() as connection:
        schema.ensure_schema(connection)
        connection.exec_driver_sql("ALTER TABLE memories RENAME COLUMN caption TO old_caption")
        connection.exec_driver_sql("ALTER TABLE memories ADD COLUMN caption INTEGER NOT NULL DEFAULT 0")
        connection.exec_driver_sql("ALTER TABLE memories DROP COLUMN old_caption")
        with pytest.raises(RuntimeError, match="Incompatible memory column memories.caption"):
            schema.ensure_schema(connection)


def test_normal_alembic_revision_adopts_provisioned_schema(shared_db, monkeypatch):
    with shared_db.begin() as connection:
        schema.ensure_schema(connection)
        connection.exec_driver_sql("UPDATE memory_capacity SET reserved_bytes=123 WHERE id=1")
        monkeypatch.setattr(schema.op, "get_bind", lambda: connection)
        schema.upgrade()
        assert connection.scalar(text("SELECT reserved_bytes FROM memory_capacity WHERE id=1")) == 123


def test_missing_capacity_ledger_cannot_reset_existing_media(shared_db):
    with shared_db.begin() as connection:
        schema.ensure_schema(connection)
        connection.exec_driver_sql("DELETE FROM memory_capacity")
        # Deliberately malformed legacy media still must not get a zero ledger.
        connection.exec_driver_sql("INSERT INTO memory_media (id,memory_id,sort,kind,declared_bytes,original_bytes,reserved_bytes,original_key,display_key,thumbnail_key,digest,width,height,duration,state,publication_status,attempts) VALUES (1,1,0,'image',1,1,1,'a','','','',1,1,0,'uploaded','unreviewed',0)")
        with pytest.raises(RuntimeError, match="intact capacity ledger"):
            schema.ensure_schema(connection)
        assert connection.scalar(text("SELECT COUNT(*) FROM memory_capacity")) == 0


@pytest.mark.parametrize("environment,url,expected", [
    ("production", "mysql+pymysql://root@localhost/dragon_reserve_test", "dragon_reserve_test"),
    ("test", "mysql+pymysql://root@localhost/dragon_reserve", "dragon_reserve"),
    ("test", "mysql+pymysql://root@localhost/dragon_reserve_test", "different_test"),
    ("test", "sqlite:///dragon_reserve_test", "dragon_reserve_test"),
])
def test_test_schema_command_refuses_unsafe_target_before_connecting(monkeypatch, environment, url, expected):
    from types import SimpleNamespace
    from scripts import migrate_memory_schema as command

    monkeypatch.setattr(command, "get_settings", lambda: SimpleNamespace(environment=environment, database_url=url))
    monkeypatch.setattr(command, "create_engine", lambda *args, **kwargs: pytest.fail("Must not connect to unsafe target"))
    with pytest.raises(RuntimeError, match="Refusing migration"):
        command.migrate(expected, apply=True)
