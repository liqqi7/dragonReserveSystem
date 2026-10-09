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
    # 0002 already uses display_* in fresh databases; older installations may
    # still use *_snapshot. Normalize only the legacy columns, preserving data.
    columns = {c["name"] for c in sa.inspect(op.get_bind()).get_columns("activity_participants")}
    for old, new, length in (
        ("nickname_snapshot", "display_nickname", 64),
        ("avatar_url_snapshot", "display_avatar_url", 512),
    ):
        if old in columns and new in columns:
            raise RuntimeError(f"Both {old} and {new} exist; reconcile their data before migration.")
        if old in columns:
            options = {"existing_server_default": ""} if length == 512 else {}
            op.alter_column(
                "activity_participants", old, new_column_name=new,
                existing_type=sa.String(length=length), existing_nullable=False, **options,
            )
        elif new not in columns:
            raise RuntimeError(f"Missing participant column: {old} or {new}")


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
