"""Version 3.2 schema additions. Imported before the base ORM classes are mapped."""

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
