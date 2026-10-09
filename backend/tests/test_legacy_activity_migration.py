"""Exercise the destructive migration only on a disposable in-memory database."""

import importlib.util
from datetime import datetime
from io import StringIO
from pathlib import Path

import pytest
from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import create_engine, inspect, select, text

from app.core.database import Base
from app.models import Activity, ActivityParticipant, User
from app.models.activity import ActivitySubItem, ActivityParticipantSubItem


def migration():
    path = Path(__file__).resolve().parents[1] / "alembic/versions/20261010_0022_remove_legacy_activity_fields.py"
    spec = importlib.util.spec_from_file_location("remove_legacy_activity_fields", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_drop_legacy_columns_preserves_other_data_indexes_and_foreign_keys():
    engine = create_engine("sqlite://")
    try:
        with engine.begin() as connection:
            connection.exec_driver_sql("PRAGMA foreign_keys=ON")
            Base.metadata.create_all(connection)
            for name, column_type in (("signup_deadline", "DATETIME"), ("activity_type", "VARCHAR(32)"),
                                      ("activity_style_key", "VARCHAR(64)")):
                connection.exec_driver_sql(f"ALTER TABLE activities ADD COLUMN {name} {column_type}")
            connection.execute(User.__table__.insert().values(id=1, nickname="Member"))
            connection.execute(Activity.__table__.insert().values(
                id=1, name="Keep activity", start_time=datetime(2026, 10, 11),
                end_time=datetime(2026, 10, 12), created_by=1, share_preview_file="kept.jpg",
            ))
            connection.execute(ActivityParticipant.__table__.insert().values(
                id=1, activity_id=1, user_id=1, display_nickname="Keep nickname",
                checked_in_at=datetime(2026, 10, 11), checkin_method="admin",
            ))
            connection.execute(ActivitySubItem.__table__.insert().values(
                id=1, activity_id=1, name="Keep project", max_participants=3,
            ))
            connection.execute(ActivityParticipantSubItem.__table__.insert().values(
                activity_id=1, participant_id=1, sub_item_id=1, user_id=1,
            ))
            connection.execute(text("UPDATE activities SET signup_deadline='2026-10-10', "
                                    "activity_type='boardgame', activity_style_key='old-style'"))
            before = {table.name: connection.execute(select(table)).all() for table in Base.metadata.sorted_tables}
            indexes = inspect(connection).get_indexes("activities")
            foreign_keys = {table: inspect(connection).get_foreign_keys(table) for table in before}
            with Operations.context(MigrationContext.configure(connection)):
                migration().upgrade()
            assert {"signup_deadline", "activity_type", "activity_style_key"}.isdisjoint(
                column["name"] for column in inspect(connection).get_columns("activities")
            )
            assert inspect(connection).get_indexes("activities") == indexes
            for table in Base.metadata.sorted_tables:
                assert connection.execute(select(table)).all() == before[table.name]
                assert inspect(connection).get_foreign_keys(table.name) == foreign_keys[table.name]
            assert connection.exec_driver_sql("PRAGMA foreign_key_check").all() == []
    finally:
        engine.dispose()


def test_mysql_upgrade_emits_only_three_column_drops():
    output = StringIO()
    context = MigrationContext.configure(dialect_name="mysql", opts={"as_sql": True, "output_buffer": output})
    with Operations.context(context):
        migration().upgrade()
    assert output.getvalue().strip().split("\n\n") == [
        f"ALTER TABLE activities DROP COLUMN {column};"
        for column in ("signup_deadline", "activity_type", "activity_style_key")
    ]


def test_removed_data_cannot_be_restored_by_fake_downgrade():
    module = migration()
    assert module.down_revision == "20261009_0021"
    with pytest.raises(RuntimeError, match="restore the pre-migration database backup"):
        module.downgrade()
