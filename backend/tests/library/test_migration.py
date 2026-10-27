"""Validate the new migration against a main-head schema in a disposable database."""
from pathlib import Path
from datetime import date, datetime
import pytest
from alembic import command
from alembic.config import Config
from alembic.script import ScriptDirectory
from sqlalchemy import MetaData, create_engine, inspect, text
from sqlalchemy.schema import CreateTable
from sqlalchemy.dialects import mysql
from app.core.config import get_settings
from app.core.database import Base
from app.models.boardgame import TABLES
from app.models.activity import ActivitySubItem
from app.models.memory import Memory, MemoryMedia
from app.models.boardgame import Play, PlayPlayer

MEMORY_TABLES = {'memories', 'memory_media', 'memory_audit_logs', 'memory_capacity'}


def test_upgrade_preserves_main_data_and_downgrade_is_scoped(tmp_path, monkeypatch):
    path = tmp_path / 'migration.db'
    url = f'sqlite:///{path}'
    engine = create_engine(url)
    metadata = MetaData()
    for table in Base.metadata.sorted_tables:
        if table.name not in TABLES and table.name not in MEMORY_TABLES:
            table.to_metadata(metadata)
    metadata.create_all(engine)
    main_names = set(inspect(engine).get_table_names())
    with engine.begin() as conn:
        conn.execute(text("INSERT INTO users(id,nickname,avatar_url,role) VALUES(1,'existing member','','user')"))
        # Existing activity fields and sub-items must survive the library migration.
        conn.execute(text("INSERT INTO activities(id,name,status,remark,max_participants,start_time,end_time,signup_enabled,location_name,location_address,location_latitude,location_longitude,created_by,activity_cover_id,share_preview_file) VALUES(1,'existing activity','未开始','',10,'2027-01-01','2027-01-02',1,'Venue','Address',0,0,1,'aleksey-rico-001','existing.png')"))
    monkeypatch.setattr(get_settings(), 'database_url', url)
    root = Path(__file__).resolve().parents[2]
    config = Config()
    config.set_main_option('sqlalchemy.url', url)
    config.set_main_option('script_location', str(root / 'alembic'))
    assert set(ScriptDirectory.from_config(config).get_heads()) == {'20261027_0026'}
    command.stamp(config, '20260924_0020')
    command.upgrade(config, '20261007_0021')
    # The 0021 step creates only the six library tables; plays arrive at head.
    library_tables = set(TABLES) - {'boardgame_plays', 'boardgame_play_players', 'boardgame_expansion_links', 'boardgame_play_expansions'}
    assert set(inspect(engine).get_table_names()) == main_names | library_tables | {'alembic_version'}
    for name, table in TABLES.items():
        if name not in library_tables:
            continue
        expected_columns = set(table.c.keys()) - ({'default_rules', 'projection_warnings'} if name == 'boardgames' else set())
        assert {c['name'] for c in inspect(engine).get_columns(name)} == expected_columns
        # Both target MySQL and local SQLite schemas must compile.
        assert str(CreateTable(table).compile(dialect=mysql.dialect()))
    with engine.connect() as conn:
        assert conn.execute(text('SELECT share_preview_file FROM activities WHERE id=1')).scalar() == 'existing.png'
        assert conn.execute(text('SELECT nickname FROM users WHERE id=1')).scalar() == 'existing member'
    command.downgrade(config, '20260924_0020')
    assert set(inspect(engine).get_table_names()) == main_names | {'alembic_version'}
    with engine.connect() as conn:
        assert conn.execute(text('SELECT COUNT(*) FROM activities')).scalar() == 1
    engine.dispose()


@pytest.mark.parametrize('starting_revision', ['20260924_0020', '20261007_0021', '20261010_0022', '20261011_0024', '20261025_0025'])
def test_upgrade_both_branches_to_single_head_preserves_data(tmp_path, monkeypatch, starting_revision):
    url = f"sqlite:///{tmp_path / 'merged-history.db'}"
    engine = create_engine(url)
    metadata = MetaData()
    for table in Base.metadata.sorted_tables:
        if table.name not in TABLES and table.name not in MEMORY_TABLES:
            table.to_metadata(metadata)
    metadata.create_all(engine)
    try:
        # Reconstruct the shared 0020 schema before either branch was applied.
        with engine.begin() as conn:
            conn.exec_driver_sql('DROP INDEX ix_activities_end_time')
            conn.exec_driver_sql('CREATE INDEX ix_users_wechat_openid ON users (wechat_openid)')
            for name, column_type in [('signup_deadline', 'DATETIME'), ('activity_type', 'VARCHAR(32)'),
                                      ('activity_style_key', 'VARCHAR(64)')]:
                conn.exec_driver_sql(f'ALTER TABLE activities ADD COLUMN {name} {column_type}')
            conn.execute(text("INSERT INTO users(id,nickname,avatar_url,role) VALUES(1,'existing member','','user')"))
            conn.execute(text("INSERT INTO activities(id,name,status,remark,max_participants,start_time,end_time,signup_enabled,location_name,location_address,location_latitude,location_longitude,created_by,activity_cover_id,share_preview_file) VALUES(1,'existing activity','未开始','',10,'2027-01-01','2027-01-02',1,'Venue','Address',0,0,1,'aleksey-rico-001','existing.png')"))
            conn.execute(ActivitySubItem.__table__.insert().values(id=1, activity_id=1, name='existing sub-item', max_participants=3))
        monkeypatch.setattr(get_settings(), 'database_url', url)
        config = Config()
        config.set_main_option('script_location', str(Path(__file__).resolve().parents[2] / 'alembic'))
        command.stamp(config, '20260924_0020')
        command.upgrade(config, starting_revision)
        if starting_revision in {'20261007_0021', '20261011_0024', '20261025_0025'}:
            with engine.begin() as conn:
                conn.execute(text(
                    "INSERT INTO boardgames (id,name,aliases,game_type,local_overrides,search_text,created_by,updated_by,created_at,updated_at) "
                    "VALUES (1,'existing game','[]','base','{}','existing game',1,1,'2026-01-01','2026-01-01')"))
        if starting_revision == '20261011_0024':
            with engine.begin() as conn:
                conn.execute(Memory.__table__.insert().values(
                    id=1, user_id=1, activity_id=1, caption='existing memory',
                    client_submission_id='existing-submission', expires_at=datetime(2027, 1, 1)))
                conn.execute(MemoryMedia.__table__.insert().values(
                    id=1, memory_id=1, sort=0, kind='image', declared_bytes=1234,
                    reserved_bytes=1234, original_key='existing/image.jpg'))
                conn.execute(text('UPDATE memory_capacity SET reserved_bytes=1234 WHERE id=1'))
        if starting_revision == '20261025_0025':
            with engine.begin() as conn:
                conn.execute(Play.__table__.insert().values(
                    id=1, game_id=1, played_on=date(2026, 10, 25), created_by=1,
                    updated_by=1, created_at=datetime(2026, 10, 25), updated_at=datetime(2026, 10, 25)))
                conn.execute(PlayPlayer.__table__.insert().values(
                    id=1, play_id=1, user_id=1, display_name='existing member', score=42))
        command.upgrade(config, 'head')
        inspector = inspect(engine)
        assert set(TABLES).issubset(inspector.get_table_names())
        assert {'signup_deadline', 'activity_type', 'activity_style_key'}.isdisjoint(
            column['name'] for column in inspector.get_columns('activities')
        )
        assert 'ix_activities_end_time' in {index['name'] for index in inspector.get_indexes('activities')}
        assert 'ix_users_wechat_openid' not in {index['name'] for index in inspector.get_indexes('users')}
        with engine.connect() as conn:
            assert set(conn.execute(text('SELECT version_num FROM alembic_version')).scalars().all()) == {'20261027_0026'}
            assert MEMORY_TABLES.issubset(inspector.get_table_names())
            expected_bytes = 1234 if starting_revision == '20261011_0024' else 0
            assert conn.execute(text('SELECT reserved_bytes FROM memory_capacity WHERE id=1')).scalar_one() == expected_bytes
            if starting_revision == '20261011_0024':
                assert conn.execute(text('SELECT caption FROM memories WHERE id=1')).scalar_one() == 'existing memory'
                assert conn.execute(text('SELECT original_key FROM memory_media WHERE id=1')).scalar_one() == 'existing/image.jpg'
                assert conn.execute(text('SELECT reserved_bytes FROM memory_media WHERE id=1')).scalar_one() == 1234
            if starting_revision == '20261025_0025':
                assert conn.execute(text('SELECT game_id FROM boardgame_plays WHERE id=1')).scalar_one() == 1
                assert conn.execute(text('SELECT score FROM boardgame_play_players WHERE id=1')).scalar_one() == 42
            assert conn.execute(text('SELECT share_preview_file FROM activities WHERE id=1')).scalar_one() == 'existing.png'
            assert conn.execute(text('SELECT nickname FROM users WHERE id=1')).scalar_one() == 'existing member'
            assert conn.execute(text('SELECT name FROM activity_sub_items WHERE id=1')).scalar_one() == 'existing sub-item'
            if starting_revision in {'20261007_0021', '20261011_0024', '20261025_0025'}:
                assert conn.execute(text('SELECT name FROM boardgames WHERE id=1')).scalar_one() == 'existing game'
                assert conn.execute(text('SELECT default_rules FROM boardgames WHERE id=1')).scalar_one()
                assert conn.execute(text('SELECT projection_warnings FROM boardgames WHERE id=1')).scalar_one() == '[]'
            assert conn.exec_driver_sql('PRAGMA foreign_key_check').all() == []
    finally:
        engine.dispose()
