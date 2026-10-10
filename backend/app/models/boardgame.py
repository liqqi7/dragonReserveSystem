from sqlalchemy import (Table, Column, Integer, String, Text, JSON, Boolean, DateTime, Numeric, ForeignKeyConstraint, UniqueConstraint, CheckConstraint, Index, text)
from sqlalchemy.dialects import mysql
from app.core.database import Base

def define_tables(metadata):
    tables = {}
    tables['boardgames'] = Table('boardgames', metadata,
        Column('id', Integer, primary_key=True, nullable=False, autoincrement=True),
        Column('bgg_id', Integer, primary_key=False, nullable=True),
        Column('name', String(255), primary_key=False, nullable=False),
        Column('aliases', JSON, primary_key=False, nullable=False),
        Column('game_type', String(16), primary_key=False, nullable=False),
        Column('is_standalone', Boolean, primary_key=False, nullable=False, server_default=text('false')),
        Column('cover_url', String(1024), primary_key=False, nullable=True),
        Column('description', Text, primary_key=False, nullable=True),
        Column('min_players', Integer, primary_key=False, nullable=True),
        Column('max_players', Integer, primary_key=False, nullable=True),
        Column('min_playtime_minutes', Integer, primary_key=False, nullable=True),
        Column('max_playtime_minutes', Integer, primary_key=False, nullable=True),
        Column('min_age', Integer, primary_key=False, nullable=True),
        Column('complexity', Numeric(4, 2), nullable=True),
        Column('year_published', Integer, primary_key=False, nullable=True),
        Column('local_overrides', JSON, primary_key=False, nullable=False),
        Column('search_text', Text, primary_key=False, nullable=False),
        Column('is_visible', Boolean, primary_key=False, nullable=False, server_default=text('true')),
        Column('sort_order', Integer, primary_key=False, nullable=False, server_default=text('0')),
        Column('archived_at', DateTime().with_variant(mysql.DATETIME(fsp=6), "mysql"), primary_key=False, nullable=True),
        Column('merged_into_id', Integer, primary_key=False, nullable=True),
        Column('bgg_payload', JSON, primary_key=False, nullable=True),
        Column('bgg_raw_xml', Text().with_variant(mysql.LONGTEXT(), "mysql"), primary_key=False, nullable=True),
        Column('bgg_request_params', JSON, primary_key=False, nullable=True),
        Column('bgg_synced_at', DateTime().with_variant(mysql.DATETIME(fsp=6), "mysql"), primary_key=False, nullable=True),
        Column('bgg_parser_version', String(32), primary_key=False, nullable=True),
        Column('bgg_content_hash', String(64).with_variant(mysql.VARCHAR(64, collation="utf8mb4_bin"), "mysql"), primary_key=False, nullable=True),
        Column('created_by', Integer, primary_key=False, nullable=False),
        Column('updated_by', Integer, primary_key=False, nullable=False),
        Column('created_at', DateTime().with_variant(mysql.DATETIME(fsp=6), "mysql"), primary_key=False, nullable=False),
        Column('updated_at', DateTime().with_variant(mysql.DATETIME(fsp=6), "mysql"), primary_key=False, nullable=False),
        Column('revision', Integer, primary_key=False, nullable=False, server_default=text('1')),
        UniqueConstraint('bgg_id', name='uq_bg_bgg'),
        ForeignKeyConstraint(['merged_into_id'], ['boardgames.id'], name='fk_bg_merged'),
        CheckConstraint("game_type IN ('base','expansion')", name='ck_bg_type'),
        CheckConstraint('bgg_id IS NULL OR bgg_id > 0', name='ck_bg_bgg'),
        CheckConstraint('(min_players IS NULL OR min_players > 0) AND (max_players IS NULL OR max_players > 0) AND (min_players IS NULL OR max_players IS NULL OR min_players <= max_players)', name='ck_bg_players'),
        CheckConstraint('(min_playtime_minutes IS NULL OR min_playtime_minutes > 0) AND (max_playtime_minutes IS NULL OR max_playtime_minutes > 0) AND (min_playtime_minutes IS NULL OR max_playtime_minutes IS NULL OR min_playtime_minutes <= max_playtime_minutes)', name='ck_bg_time'),
        CheckConstraint('min_age IS NULL OR min_age >= 0', name='ck_bg_age'),
        ForeignKeyConstraint(['created_by'], ['users.id'], name='bg1_creator'),
        ForeignKeyConstraint(['updated_by'], ['users.id'], name='bg1_updater'),
        CheckConstraint('revision >= 1', name='bg1_revision'),
        mysql_engine="InnoDB", mysql_charset="utf8mb4", mysql_collate="utf8mb4_unicode_ci")
    tables['boardgame_inventory'] = Table('boardgame_inventory', metadata,
        Column('id', Integer, primary_key=True, nullable=False, autoincrement=True),
        Column('game_id', Integer, primary_key=False, nullable=False),
        Column('owner_type', String(16), primary_key=False, nullable=False),
        Column('owner_user_id', Integer, primary_key=False, nullable=True),
        Column('owner_label', String(64), primary_key=False, nullable=True),
        Column('status', String(16), primary_key=False, nullable=False, server_default=text("'unverified'")),
        Column('edition_name', String(255), primary_key=False, nullable=True),
        Column('language', String(64), primary_key=False, nullable=True),
        Column('bgg_version_id', Integer, primary_key=False, nullable=True),
        Column('remark', Text, primary_key=False, nullable=True),
        Column('sort_order', Integer, primary_key=False, nullable=False, server_default=text('0')),
        Column('archived_at', DateTime().with_variant(mysql.DATETIME(fsp=6), "mysql"), primary_key=False, nullable=True),
        Column('created_by', Integer, primary_key=False, nullable=False),
        Column('updated_by', Integer, primary_key=False, nullable=False),
        Column('created_at', DateTime().with_variant(mysql.DATETIME(fsp=6), "mysql"), primary_key=False, nullable=False),
        Column('updated_at', DateTime().with_variant(mysql.DATETIME(fsp=6), "mysql"), primary_key=False, nullable=False),
        Column('revision', Integer, primary_key=False, nullable=False, server_default=text('1')),
        ForeignKeyConstraint(['game_id'], ['boardgames.id'], name='fk_inventory_game'),
        ForeignKeyConstraint(['owner_user_id'], ['users.id'], name='fk_inventory_owner'),
        CheckConstraint("owner_type='member' AND owner_user_id IS NOT NULL AND owner_label IS NULL", name='ck_inventory_owner'),
        CheckConstraint("status IN ('unverified','available','borrowed','unavailable','retired')", name='ck_inventory_status'),
        ForeignKeyConstraint(['created_by'], ['users.id'], name='bg2_creator'),
        ForeignKeyConstraint(['updated_by'], ['users.id'], name='bg2_updater'),
        CheckConstraint('revision >= 1', name='bg2_revision'),
        Column('bgg_version_snapshot', JSON, nullable=True),
        UniqueConstraint('game_id', 'owner_user_id', name='uq_library_owner_game'),
        mysql_engine="InnoDB", mysql_charset="utf8mb4", mysql_collate="utf8mb4_unicode_ci")
    tables['boardgame_audit_events'] = Table('boardgame_audit_events', metadata,
        Column('id', Integer, primary_key=True, nullable=False, autoincrement=True),
        Column('entity_type', String(32), primary_key=False, nullable=False),
        Column('entity_id', String(64).with_variant(mysql.VARCHAR(64, collation="utf8mb4_bin"), "mysql"), primary_key=False, nullable=False),
        Column('entity_revision', Integer, primary_key=False, nullable=False),
        Column('action', String(32), primary_key=False, nullable=False),
        Column('actor_user_id', Integer, primary_key=False, nullable=True),
        Column('before_data', JSON, primary_key=False, nullable=True),
        Column('after_data', JSON, primary_key=False, nullable=True),
        Column('reason', String(1000), primary_key=False, nullable=True),
        Column('request_id', String(64), primary_key=False, nullable=True),
        Column('created_at', DateTime().with_variant(mysql.DATETIME(fsp=6), "mysql"), primary_key=False, nullable=False),
        ForeignKeyConstraint(['actor_user_id'], ['users.id'], name='fk_audit_actor'),
        mysql_engine="InnoDB", mysql_charset="utf8mb4", mysql_collate="utf8mb4_unicode_ci")
    tables['boardgame_preview_jobs'] = Table('boardgame_preview_jobs', metadata,
        Column('id', String(36).with_variant(mysql.VARCHAR(36, collation="utf8mb4_bin"), "mysql"), primary_key=True, nullable=False),
        Column('kind', String(32), primary_key=False, nullable=False),
        Column('requested_by', Integer, primary_key=False, nullable=False),
        Column('params', JSON, primary_key=False, nullable=False),
        Column('state', String(32), primary_key=False, nullable=False, server_default=text("'queued'")),
        Column('progress', JSON, primary_key=False, nullable=False),
        Column('error_code', String(255), primary_key=False, nullable=True),
        Column('error_message', String(255), primary_key=False, nullable=True),
        Column('attempt_count', Integer, primary_key=False, nullable=False, server_default=text('0')),
        Column('next_attempt_at', DateTime().with_variant(mysql.DATETIME(fsp=6), "mysql"), primary_key=False, nullable=True),
        Column('lease_owner', String(64), primary_key=False, nullable=True),
        Column('lease_expires_at', DateTime().with_variant(mysql.DATETIME(fsp=6), "mysql"), primary_key=False, nullable=True),
        Column('created_at', DateTime().with_variant(mysql.DATETIME(fsp=6), "mysql"), primary_key=False, nullable=False),
        Column('updated_at', DateTime().with_variant(mysql.DATETIME(fsp=6), "mysql"), primary_key=False, nullable=False),
        Column('revision', Integer, primary_key=False, nullable=False, server_default=text('1')),
        ForeignKeyConstraint(['requested_by'], ['users.id'], name='fk_preview_job_actor'),
        CheckConstraint("kind = 'bgg_thing'", name='ck_preview_job_kind'),
        CheckConstraint("state IN ('queued','fetching','retry_wait','ready','applied','failed')", name='ck_preview_job_state'),
        CheckConstraint('revision >= 1', name='ck_preview_job_revision'),
        CheckConstraint('attempt_count >= 0', name='ck_preview_job_attempt'),
        mysql_engine="InnoDB", mysql_charset="utf8mb4", mysql_collate="utf8mb4_unicode_ci")
    tables['boardgame_preview_items'] = Table('boardgame_preview_items', metadata,
        Column('id', Integer, primary_key=True, nullable=False, autoincrement=True),
        Column('job_id', String(36).with_variant(mysql.VARCHAR(36, collation="utf8mb4_bin"), "mysql"), primary_key=False, nullable=False),
        Column('source_kind', String(32), primary_key=False, nullable=False),
        Column('source_key', String(128).with_variant(mysql.VARCHAR(128, collation="utf8mb4_bin"), "mysql"), primary_key=False, nullable=False),
        Column('bgg_id', Integer, primary_key=False, nullable=True),
        Column('raw_xml', Text().with_variant(mysql.LONGTEXT(), "mysql"), primary_key=False, nullable=True),
        Column('payload', JSON, primary_key=False, nullable=False),
        Column('content_hash', String(64).with_variant(mysql.VARCHAR(64, collation="utf8mb4_bin"), "mysql"), primary_key=False, nullable=False),
        Column('state', String(32), primary_key=False, nullable=False, server_default=text("'ready'")),
        Column('error_code', String(64), primary_key=False, nullable=True),
        Column('created_at', DateTime().with_variant(mysql.DATETIME(fsp=6), "mysql"), primary_key=False, nullable=False),
        Column('updated_at', DateTime().with_variant(mysql.DATETIME(fsp=6), "mysql"), primary_key=False, nullable=False),
        Column('revision', Integer, primary_key=False, nullable=False, server_default=text('1')),
        ForeignKeyConstraint(['job_id'], ['boardgame_preview_jobs.id'], name='fk_preview_item_job', ondelete='CASCADE'),
        UniqueConstraint('job_id', 'source_kind', 'source_key', name='uq_preview_item_source'),
        CheckConstraint("state IN ('ready','failed')", name='ck_preview_item_state'),
        CheckConstraint('revision >= 1', name='ck_preview_item_revision'),
        mysql_engine="InnoDB", mysql_charset="utf8mb4", mysql_collate="utf8mb4_unicode_ci")
    tables['boardgame_request_keys'] = Table('boardgame_request_keys', metadata,
        Column('id', Integer, primary_key=True, nullable=False, autoincrement=True),
        Column('actor_user_id', Integer, primary_key=False, nullable=False),
        Column('operation', String(64).with_variant(mysql.VARCHAR(64, collation="utf8mb4_bin"), "mysql"), primary_key=False, nullable=False),
        Column('key', String(36).with_variant(mysql.VARCHAR(36, collation="utf8mb4_bin"), "mysql"), primary_key=False, nullable=False),
        Column('request_hash', String(64).with_variant(mysql.VARCHAR(64, collation="utf8mb4_bin"), "mysql"), primary_key=False, nullable=False),
        Column('resource_type', String(32), primary_key=False, nullable=False),
        Column('resource_ids', JSON, primary_key=False, nullable=False),
        Column('created_at', DateTime().with_variant(mysql.DATETIME(fsp=6), "mysql"), primary_key=False, nullable=False),
        ForeignKeyConstraint(['actor_user_id'], ['users.id'], name='fk_request_actor'),
        UniqueConstraint('actor_user_id', 'operation', 'key', name='uq_request_key'),
        mysql_engine="InnoDB", mysql_charset="utf8mb4", mysql_collate="utf8mb4_unicode_ci")
    Index('ix_library_preview_due', tables['boardgame_preview_jobs'].c.state, tables['boardgame_preview_jobs'].c.next_attempt_at)
    Index('ix_library_inventory_owner', tables['boardgame_inventory'].c.owner_user_id, tables['boardgame_inventory'].c.created_at)
    return tables

TABLES = define_tables(Base.metadata)

class BoardGame(Base):
    __table__ = TABLES['boardgames']

    @property
    def original_name(self):
        return (self.bgg_payload or {}).get("projection", {}).get("name")

class Inventory(Base):
    __table__ = TABLES['boardgame_inventory']

class PreviewJob(Base):
    __table__ = TABLES['boardgame_preview_jobs']

class PreviewItem(Base):
    __table__ = TABLES['boardgame_preview_items']

class AuditEvent(Base):
    __table__ = TABLES['boardgame_audit_events']

class RequestKey(Base):
    __table__ = TABLES['boardgame_request_keys']
