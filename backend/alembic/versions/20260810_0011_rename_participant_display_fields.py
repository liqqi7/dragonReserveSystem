"""rename participant display fields

Revision ID: 20260810_0011
Revises: 20260810_0010
Create Date: 2026-08-10
"""

from alembic import op
import sqlalchemy as sa


revision = "20260810_0011"
down_revision = "20260810_0010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "activity_participants",
        "nickname_snapshot",
        new_column_name="display_nickname",
        existing_type=sa.String(length=64),
        existing_nullable=False,
    )
    op.alter_column(
        "activity_participants",
        "avatar_url_snapshot",
        new_column_name="display_avatar_url",
        existing_type=sa.String(length=512),
        existing_nullable=False,
        existing_server_default="",
    )


def downgrade() -> None:
    op.alter_column(
        "activity_participants",
        "display_nickname",
        new_column_name="nickname_snapshot",
        existing_type=sa.String(length=64),
        existing_nullable=False,
    )
    op.alter_column(
        "activity_participants",
        "display_avatar_url",
        new_column_name="avatar_url_snapshot",
        existing_type=sa.String(length=512),
        existing_nullable=False,
        existing_server_default="",
    )
