"""Recorded plays and per-player scores for the boardgame library.

Revision: 20261012_0022
Revises: 20261007_0021
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

revision = "20261012_0022"
down_revision = "20261010_0023"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "boardgame_plays",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("game_id", sa.Integer(), nullable=False),
        sa.Column("played_on", sa.Date(), nullable=False),
        sa.Column("archived_at", sa.DateTime().with_variant(mysql.DATETIME(fsp=6), "mysql"), nullable=True),
        sa.Column("created_by", sa.Integer(), nullable=False),
        sa.Column("updated_by", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime().with_variant(mysql.DATETIME(fsp=6), "mysql"), nullable=False),
        sa.Column("updated_at", sa.DateTime().with_variant(mysql.DATETIME(fsp=6), "mysql"), nullable=False),
        sa.Column("revision", sa.Integer(), server_default=sa.text("1"), nullable=False),
        sa.ForeignKeyConstraint(["game_id"], ["boardgames.id"], name="fk_play_game"),
        sa.CheckConstraint("revision >= 1", name="ck_play_revision"),
        sa.PrimaryKeyConstraint("id"),
        mysql_engine="InnoDB", mysql_charset="utf8mb4", mysql_collate="utf8mb4_unicode_ci",
    )
    op.create_table(
        "boardgame_play_players",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("play_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("display_name", sa.String(length=64), nullable=False),
        sa.Column("score", sa.Numeric(9, 2), nullable=True),
        sa.Column("is_winner", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("seat_order", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.ForeignKeyConstraint(["play_id"], ["boardgame_plays.id"], name="fk_play_player_play", ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name="fk_play_player_user"),
        sa.PrimaryKeyConstraint("id"),
        mysql_engine="InnoDB", mysql_charset="utf8mb4", mysql_collate="utf8mb4_unicode_ci",
    )
    op.create_table(
        "boardgame_expansion_links",
        sa.Column("base_game_id", sa.Integer(), nullable=False),
        sa.Column("expansion_game_id", sa.Integer(), nullable=False),
        sa.Column("bgg_suggested", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("manual_decision", sa.String(length=16), server_default=sa.text("'inherit'"), nullable=False),
        sa.Column("note", sa.String(length=500), nullable=True),
        sa.Column("updated_by", sa.Integer(), nullable=False),
        sa.Column("updated_at", sa.DateTime().with_variant(mysql.DATETIME(fsp=6), "mysql"), nullable=False),
        sa.Column("revision", sa.Integer(), server_default=sa.text("1"), nullable=False),
        sa.ForeignKeyConstraint(["base_game_id"], ["boardgames.id"], name="fk_explink_base"),
        sa.ForeignKeyConstraint(["expansion_game_id"], ["boardgames.id"], name="fk_explink_expansion"),
        sa.ForeignKeyConstraint(["updated_by"], ["users.id"], name="fk_explink_updated_by"),
        sa.CheckConstraint("manual_decision IN ('inherit','allow','block')", name="ck_compat_decision"),
        sa.PrimaryKeyConstraint("base_game_id", "expansion_game_id"),
        mysql_engine="InnoDB", mysql_charset="utf8mb4", mysql_collate="utf8mb4_unicode_ci",
    )
    op.create_table(
        "boardgame_play_expansions",
        sa.Column("play_id", sa.Integer(), nullable=False),
        sa.Column("expansion_game_id", sa.Integer(), nullable=False),
        sa.Column("inventory_id", sa.Integer(), nullable=True),
        sa.Column("modules_note", sa.String(length=500), nullable=True),
        sa.Column("compatibility_note", sa.String(length=500), nullable=True),
        sa.Column("game_snapshot", sa.JSON(), nullable=False),
        sa.Column("sort_order", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.ForeignKeyConstraint(["play_id"], ["boardgame_plays.id"], name="fk_playexp_play", ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["expansion_game_id"], ["boardgames.id"], name="fk_playexp_game"),
        sa.ForeignKeyConstraint(["inventory_id"], ["boardgame_inventory.id"], name="fk_playexp_inventory"),
        sa.PrimaryKeyConstraint("play_id", "expansion_game_id"),
        mysql_engine="InnoDB", mysql_charset="utf8mb4", mysql_collate="utf8mb4_unicode_ci",
    )
    op.create_index("ix_play_game_date", "boardgame_plays", ["game_id", "played_on"])
    op.create_index("ix_play_player_user", "boardgame_play_players", ["user_id"])


def downgrade() -> None:
    op.drop_table("boardgame_play_expansions")
    op.drop_table("boardgame_expansion_links")
    op.drop_index("ix_play_player_user", table_name="boardgame_play_players")
    op.drop_index("ix_play_game_date", table_name="boardgame_plays")
    op.drop_table("boardgame_play_players")
    op.drop_table("boardgame_plays")
