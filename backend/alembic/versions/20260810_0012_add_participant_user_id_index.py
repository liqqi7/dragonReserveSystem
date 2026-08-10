"""add activity participant user index

Revision ID: 20260810_0012
Revises: 20260810_0011
Create Date: 2026-08-10
"""

from alembic import op


revision = "20260810_0012"
down_revision = "20260810_0011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index("ix_activity_participants_user_id", "activity_participants", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_activity_participants_user_id", table_name="activity_participants")
