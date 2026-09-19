"""create activity sub items tables

Revision ID: 20260918_0018
Revises: 20260907_0017
Create Date: 2026-09-18
"""

import sqlalchemy as sa
from alembic import op


revision = "20260918_0018"
down_revision = "20260907_0017"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "activity_sub_items",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("activity_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=64), nullable=False),
        sa.Column("max_participants", sa.Integer(), nullable=False),
        sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["activity_id"],
            ["activities.id"],
            name="fk_activity_sub_items_activity_id",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_activity_sub_items_activity_id",
        "activity_sub_items",
        ["activity_id"],
        unique=False,
    )

    op.create_table(
        "activity_participant_sub_items",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("activity_id", sa.Integer(), nullable=False),
        sa.Column("participant_id", sa.Integer(), nullable=False),
        sa.Column("sub_item_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["activity_id"],
            ["activities.id"],
            name="fk_participant_sub_items_activity_id",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["participant_id"],
            ["activity_participants.id"],
            name="fk_participant_sub_items_participant_id",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["sub_item_id"],
            ["activity_sub_items.id"],
            name="fk_participant_sub_items_sub_item_id",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name="fk_participant_sub_items_user_id",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "participant_id",
            "sub_item_id",
            name="uq_participant_sub_item",
        ),
    )
    op.create_index(
        "ix_participant_sub_items_activity_id",
        "activity_participant_sub_items",
        ["activity_id"],
        unique=False,
    )
    op.create_index(
        "ix_participant_sub_items_sub_item_id",
        "activity_participant_sub_items",
        ["sub_item_id"],
        unique=False,
    )
    op.create_index(
        "ix_participant_sub_items_user_id",
        "activity_participant_sub_items",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_table("activity_participant_sub_items")
    op.drop_table("activity_sub_items")
