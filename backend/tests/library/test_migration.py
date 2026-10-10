"""Validate the new migration against a main-head schema in a disposable database."""
from pathlib import Path
from datetime import datetime
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


def test_upgrade_preserves_main_data_and_downgrade_is_scoped(tmp_path, monkeypatch):
    path = tmp_path / 'migration.db'
    url = f'sqlite:///{path}'
    engine = create_engine(url)
    metadata = MetaData()
    for table in Base.metadata.sorted_tables:
        if table.name not in TABLES:
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
    assert ScriptDirectory.from_config(config).get_heads() == ['20261010_0023']
    command.stamp(config, '20260924_0020')
    command.upgrade(config, '20261007_0021')
    assert set(inspect(engine).get_table_names()) == main_names | set(TABLES) | {'alembic_version'}
    for name, table in TABLES.items():
        assert {c['name'] for c in inspect(engine).get_columns(name)} == set(table.c.keys())
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


@pytest.mark.parametrize('starting_revision', ['20260924_0020', '20261007_0021', '20261010_0022'])
def test_upgrade_both_branches_to_single_head_preserves_data(tmp_path, monkeypatch, starting_revision):
    url = f"sqlite:///{tmp_path / 'merged-history.db'}"
    engine = create_engine(url)
    metadata = MetaData()
    for table in Base.metadata.sorted_tables:
        if table.name not in TABLES:
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
        if starting_revision == '20261007_0021':
            with engine.begin() as conn:
                conn.execute(TABLES['boardgames'].insert().values(
                    id=1, name='existing game', aliases=[], game_type='base', local_overrides={},
                    search_text='existing game', created_by=1, updated_by=1, created_at=datetime(2026, 1, 1), updated_at=datetime(2026, 1, 1),
                ))
        command.upgrade(config, 'head')
        inspector = inspect(engine)
        assert set(TABLES).issubset(inspector.get_table_names())
        assert {'signup_deadline', 'activity_type', 'activity_style_key'}.isdisjoint(
            column['name'] for column in inspector.get_columns('activities')
        )
        assert 'ix_activities_end_time' in {index['name'] for index in inspector.get_indexes('activities')}
        assert 'ix_users_wechat_openid' not in {index['name'] for index in inspector.get_indexes('users')}
        with engine.connect() as conn:
            assert conn.execute(text('SELECT version_num FROM alembic_version')).scalars().all() == ['20261010_0023']
            assert conn.execute(text('SELECT share_preview_file FROM activities WHERE id=1')).scalar_one() == 'existing.png'
            assert conn.execute(text('SELECT nickname FROM users WHERE id=1')).scalar_one() == 'existing member'
            assert conn.execute(text('SELECT name FROM activity_sub_items WHERE id=1')).scalar_one() == 'existing sub-item'
            if starting_revision == '20261007_0021':
                assert conn.execute(text('SELECT name FROM boardgames WHERE id=1')).scalar_one() == 'existing game'
            assert conn.exec_driver_sql('PRAGMA foreign_key_check').all() == []
    finally:
        engine.dispose()
