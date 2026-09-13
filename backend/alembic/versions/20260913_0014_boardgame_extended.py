"""Board game 3.2: scoring, timer, collection and offline synchronization.

The schema definition below is frozen within this migration, independent of app models.
"""

from alembic import op
from sqlalchemy import MetaData, select, func

revision = '20260913_0014'
down_revision = '20260913_0013'
branch_labels = None
depends_on = None

# FROZEN_SCHEMA_START
from sqlalchemy import (BigInteger, Boolean, CheckConstraint, Column, DateTime, ForeignKeyConstraint,
                        Index, Integer, JSON, Numeric, String, Table, Text, UniqueConstraint, text)
from sqlalchemy.dialects import mysql


def extend_tables(metadata, tables):
    def date_time():
        return DateTime().with_variant(mysql.DATETIME(fsp=6), 'mysql')

    def audit_columns():
        return [Column('created_by', Integer, nullable=False), Column('updated_by', Integer, nullable=False),
                Column('created_at', date_time(), nullable=False), Column('updated_at', date_time(), nullable=False),
                Column('revision', Integer, nullable=False, server_default=text('1'))]

    def audited(name, *fields):
        return Table(name, metadata, *fields, *audit_columns(),
            ForeignKeyConstraint(['created_by'], ['users.id'], name=f'fk_{name[10:]}_creator'),
            ForeignKeyConstraint(['updated_by'], ['users.id'], name=f'fk_{name[10:]}_updater'),
            CheckConstraint('revision >= 1', name=f'ck_{name[10:]}_revision'),
            mysql_engine='InnoDB', mysql_charset='utf8mb4', mysql_collate='utf8mb4_unicode_ci')

    tables['boardgames'].append_column(Column('complexity', Numeric(4, 2)))
    tables['boardgames'].append_constraint(CheckConstraint('complexity IS NULL OR complexity BETWEEN 1 AND 5', name='ck_game_complexity'))
    play = tables['boardgame_plays']
    for column in [
        Column('round_count', Integer), Column('result_source', String(24), nullable=False, server_default=text("'unknown'")),
        Column('result_reason', String(500)), Column('tiebreak_applied', Boolean, nullable=False, server_default=text('false')),
        Column('exclusion_reason', String(500)),
        Column('timer_status', String(16), nullable=False, server_default=text("'idle'")),
        Column('timer_elapsed_seconds', BigInteger, nullable=False, server_default=text('0')),
        Column('timer_resumed_at', date_time()), Column('timer_stopped_at', date_time())
    ]:
        play.append_column(column)
    for constraint in [
        CheckConstraint('round_count IS NULL OR round_count BETWEEN 1 AND 10000', name='ck_play_round_count'),
        CheckConstraint("result_source IN ('unknown','score','manual_winner','manual_rank','tiebreak','source')", name='ck_play_result_source'),
        CheckConstraint("timer_status IN ('idle','running','paused','stopped')", name='ck_play_timer_status'),
        CheckConstraint('timer_elapsed_seconds BETWEEN 0 AND 6000000', name='ck_play_timer_elapsed'),
        CheckConstraint("(timer_status='running' AND timer_resumed_at IS NOT NULL) OR (timer_status<>'running' AND timer_resumed_at IS NULL)", name='ck_play_timer_clock'),
    ]:
        play.append_constraint(constraint)
    players = tables['boardgame_play_players']
    players.append_column(Column('participant_kind', String(16), nullable=False, server_default=text("'human'")))
    players.append_constraint(CheckConstraint("participant_kind IN ('human','automa')", name='ck_player_kind'))
    players.append_constraint(CheckConstraint("participant_kind='human' OR (person_id IS NULL AND guest_key IS NOT NULL)", name='ck_player_automa'))
    inventory = tables['boardgame_inventory']
    inventory.append_column(Column('purchase_price', Numeric(14, 2)))
    inventory.append_column(Column('purchase_currency', String(3)))
    inventory.append_constraint(CheckConstraint('purchase_price IS NULL OR purchase_price >= 0', name='ck_inventory_price'))
    inventory.append_constraint(CheckConstraint('(purchase_price IS NULL AND purchase_currency IS NULL) OR (purchase_price IS NOT NULL AND purchase_currency IS NOT NULL)', name='ck_inventory_currency'))
    templates = tables['boardgame_scoresheet_templates']
    for column in [Column('name', String(128)), Column('template_family', String(64)), Column('version_number', Integer),
                   Column('selection', JSON), Column('sheet_definition', JSON),
                   Column('is_active', Boolean, nullable=False, server_default=text('true'))]:
        templates.append_column(column)
    templates.append_constraint(UniqueConstraint('game_id', 'template_family', 'version_number', name='uq_template_version'))
    templates.append_constraint(CheckConstraint('version_number IS NULL OR version_number >= 1', name='ck_template_version'))

    additions = {}
    additions['boardgame_play_observers'] = Table('boardgame_play_observers', metadata,
        Column('id', Integer, primary_key=True, autoincrement=True), Column('play_id', Integer, nullable=False),
        Column('person_id', Integer), Column('guest_key', String(36)), Column('display_name_snapshot', String(64), nullable=False),
        Column('observer_role', String(16), nullable=False),
        ForeignKeyConstraint(['play_id'], ['boardgame_plays.id'], name='fk_observer_play', ondelete='CASCADE'),
        ForeignKeyConstraint(['person_id'], ['boardgame_people.id'], name='fk_observer_person'),
        UniqueConstraint('play_id', 'person_id', name='uq_observer_person'),
        UniqueConstraint('play_id', 'guest_key', name='uq_observer_guest'),
        CheckConstraint("observer_role IN ('teacher','moderator')", name='ck_observer_role'),
        CheckConstraint('(person_id IS NOT NULL AND guest_key IS NULL) OR (person_id IS NULL AND guest_key IS NOT NULL)', name='ck_observer_identity'),
        mysql_engine='InnoDB', mysql_charset='utf8mb4', mysql_collate='utf8mb4_unicode_ci')
    additions['boardgame_preferences'] = audited('boardgame_preferences',
        Column('id', Integer, primary_key=True, autoincrement=True), Column('user_id', Integer, nullable=False),
        Column('game_id', Integer, nullable=False), Column('rating', Numeric(3, 1)),
        Column('wishlist', Boolean, nullable=False, server_default=text('false')),
        Column('preordered', Boolean, nullable=False, server_default=text('false')),
        Column('want_to_play', Boolean, nullable=False, server_default=text('false')), Column('note', Text),
        ForeignKeyConstraint(['user_id'], ['users.id'], name='fk_preference_user'),
        ForeignKeyConstraint(['game_id'], ['boardgames.id'], name='fk_preference_game'),
        UniqueConstraint('user_id', 'game_id', name='uq_preference_user_game'),
        CheckConstraint('rating IS NULL OR rating BETWEEN 1 AND 10', name='ck_preference_rating'))
    additions['boardgame_prior_plays'] = audited('boardgame_prior_plays',
        Column('id', Integer, primary_key=True, autoincrement=True), Column('user_id', Integer, nullable=False),
        Column('game_id', Integer, nullable=False), Column('played_before', Boolean, nullable=False, server_default=text('true')),
        Column('approximate_count', Integer), Column('note', String(500)),
        ForeignKeyConstraint(['user_id'], ['users.id'], name='fk_prior_user'),
        ForeignKeyConstraint(['game_id'], ['boardgames.id'], name='fk_prior_game'),
        UniqueConstraint('user_id', 'game_id', name='uq_prior_user_game'),
        CheckConstraint('approximate_count IS NULL OR approximate_count BETWEEN 1 AND 1000000', name='ck_prior_count'))
    additions['boardgame_tags'] = audited('boardgame_tags',
        Column('id', Integer, primary_key=True, autoincrement=True), Column('user_id', Integer, nullable=False),
        Column('name', String(64), nullable=False), Column('is_active', Boolean, nullable=False, server_default=text('true')),
        ForeignKeyConstraint(['user_id'], ['users.id'], name='fk_tag_user'), UniqueConstraint('user_id', 'name', name='uq_tag_name'))
    additions['boardgame_game_tags'] = Table('boardgame_game_tags', metadata,
        Column('game_id', Integer, primary_key=True), Column('tag_id', Integer, primary_key=True),
        ForeignKeyConstraint(['game_id'], ['boardgames.id'], name='fk_game_tag_game'),
        ForeignKeyConstraint(['tag_id'], ['boardgame_tags.id'], name='fk_game_tag_tag', ondelete='CASCADE'),
        mysql_engine='InnoDB', mysql_charset='utf8mb4', mysql_collate='utf8mb4_unicode_ci')
    additions['boardgame_play_tags'] = Table('boardgame_play_tags', metadata,
        Column('play_id', Integer, primary_key=True), Column('tag_id', Integer, primary_key=True),
        ForeignKeyConstraint(['play_id'], ['boardgame_plays.id'], name='fk_play_tag_play'),
        ForeignKeyConstraint(['tag_id'], ['boardgame_tags.id'], name='fk_play_tag_tag', ondelete='CASCADE'),
        mysql_engine='InnoDB', mysql_charset='utf8mb4', mysql_collate='utf8mb4_unicode_ci')
    additions['boardgame_saved_filters'] = audited('boardgame_saved_filters',
        Column('id', Integer, primary_key=True, autoincrement=True), Column('user_id', Integer, nullable=False),
        Column('name', String(64), nullable=False), Column('target', String(16), nullable=False), Column('query', JSON, nullable=False),
        ForeignKeyConstraint(['user_id'], ['users.id'], name='fk_saved_filter_user'),
        UniqueConstraint('user_id', 'name', name='uq_saved_filter_name'),
        CheckConstraint("target IN ('games','plays','statistics')", name='ck_saved_filter_target'))
    additions['boardgame_sync_operations'] = Table('boardgame_sync_operations', metadata,
        Column('id', Integer, primary_key=True, autoincrement=True), Column('user_id', Integer, nullable=False),
        Column('client_id', String(36), nullable=False), Column('operation_id', String(36), nullable=False),
        Column('request_hash', String(64), nullable=False), Column('response', JSON, nullable=False),
        Column('created_at', date_time(), nullable=False),
        ForeignKeyConstraint(['user_id'], ['users.id'], name='fk_sync_user'),
        UniqueConstraint('user_id', 'client_id', 'operation_id', name='uq_sync_operation'),
        mysql_engine='InnoDB', mysql_charset='utf8mb4', mysql_collate='utf8mb4_unicode_ci')
    Index('ix_sync_user_id', additions['boardgame_sync_operations'].c.user_id, additions['boardgame_sync_operations'].c.id)
    return additions

# FROZEN_SCHEMA_END


def layout(connection):
    metadata = MetaData()
    metadata.reflect(bind=connection)
    existing = dict(metadata.tables)
    before = {name: (set(table.c.keys()), set(table.constraints)) for name, table in existing.items()}
    added = extend_tables(metadata, existing)
    return metadata, existing, before, added


def upgrade():
    connection = op.get_bind()
    metadata, existing, before, added = layout(connection)
    for name, table in existing.items():
        old_columns, old_constraints = before[name]
        for column in table.c:
            if column.name not in old_columns:
                op.add_column(name, Column(column.name, column.type, nullable=column.nullable,
                                          server_default=column.server_default))
        for constraint in table.constraints - old_constraints:
            if isinstance(constraint, CheckConstraint):
                op.create_check_constraint(constraint.name, name, constraint.sqltext)
            elif isinstance(constraint, UniqueConstraint):
                op.create_unique_constraint(constraint.name, name, [c.name for c in constraint.columns])
    for table in metadata.sorted_tables:
        if table.name in added:
            table.create(connection)


def downgrade():
    connection = op.get_bind()
    metadata = MetaData()
    metadata.reflect(bind=connection)
    names = ['boardgame_play_observers', 'boardgame_preferences', 'boardgame_prior_plays', 'boardgame_tags',
             'boardgame_game_tags', 'boardgame_play_tags', 'boardgame_saved_filters', 'boardgame_sync_operations']
    if any(connection.scalar(select(func.count()).select_from(metadata.tables[name])) for name in names):
        raise RuntimeError('Refusing to remove populated board game 3.2 tables; disable the feature instead.')
    probes = [
        "SELECT COUNT(*) FROM boardgames WHERE complexity IS NOT NULL",
        "SELECT COUNT(*) FROM boardgame_plays WHERE round_count IS NOT NULL OR result_source <> 'unknown' OR result_reason IS NOT NULL OR tiebreak_applied <> 0 OR exclusion_reason IS NOT NULL OR timer_status <> 'idle' OR timer_elapsed_seconds <> 0 OR timer_resumed_at IS NOT NULL OR timer_stopped_at IS NOT NULL",
        "SELECT COUNT(*) FROM boardgame_inventory WHERE purchase_price IS NOT NULL",
        "SELECT COUNT(*) FROM boardgame_play_players WHERE participant_kind <> 'human'",
        "SELECT COUNT(*) FROM boardgame_scoresheet_templates WHERE template_family IS NOT NULL OR sheet_definition IS NOT NULL OR selection IS NOT NULL OR version_number IS NOT NULL OR is_active <> 1 OR name IS NOT NULL"
    ]
    if any(connection.scalar(text(query)) for query in probes):
        raise RuntimeError('Refusing to discard board game 3.2 business values; disable the feature instead.')
    for table in reversed(metadata.sorted_tables):
        if table.name in names:
            table.drop(connection)
    changes = {
        'boardgames': (['complexity'], ['ck_game_complexity']),
        'boardgame_plays': (['round_count','result_source','result_reason','tiebreak_applied','exclusion_reason','timer_status','timer_elapsed_seconds','timer_resumed_at','timer_stopped_at'],
                           ['ck_play_round_count','ck_play_result_source','ck_play_timer_status','ck_play_timer_elapsed','ck_play_timer_clock']),
        'boardgame_play_players': (['participant_kind'], ['ck_player_kind','ck_player_automa']),
        'boardgame_inventory': (['purchase_price','purchase_currency'], ['ck_inventory_price','ck_inventory_currency']),
        'boardgame_scoresheet_templates': (['name','template_family','version_number','selection','sheet_definition','is_active'], ['ck_template_version'])
    }
    op.drop_constraint('uq_template_version', 'boardgame_scoresheet_templates', type_='unique')
    for name, (columns, checks) in changes.items():
        for check in checks:
            op.drop_constraint(check, name, type_='check')
        for column in reversed(columns):
            op.drop_column(name, column)
