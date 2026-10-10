"""Validate the new migration against a main-head schema in a disposable database."""
from pathlib import Path
from datetime import datetime
from alembic import command
from alembic.config import Config
from alembic.script import ScriptDirectory
from sqlalchemy import MetaData, create_engine, inspect, text
from sqlalchemy.schema import CreateTable
from sqlalchemy.dialects import mysql
from app.core.config import get_settings
from app.core.database import Base
from app.models.boardgame import TABLES


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
        conn.execute(text("INSERT INTO activities(id,name,status,remark,max_participants,start_time,end_time,signup_enabled,activity_type,activity_style_key,location_name,location_address,location_latitude,location_longitude,created_by,activity_cover_id,share_preview_file) VALUES(1,'existing activity','未开始','',10,'2027-01-01','2027-01-02',1,'羽毛球','badminton','Venue','Address',0,0,1,'aleksey-rico-001','existing.png')"))
    monkeypatch.setattr(get_settings(), 'database_url', url)
    root = Path(__file__).resolve().parents[2]
    config = Config()
    config.set_main_option('sqlalchemy.url', url)
    config.set_main_option('script_location', str(root / 'alembic'))
    assert ScriptDirectory.from_config(config).get_heads() == ['20261007_0021']
    command.stamp(config, '20260924_0020')
    command.upgrade(config, 'head')
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
