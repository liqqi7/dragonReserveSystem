"""Persist the pre-generated share card file identifier.

Revision ID: 20260924_0020
Revises: 20260923_0019
"""
from alembic import op
import sqlalchemy as sa

revision = "20260924_0020"
down_revision = "20260923_0019"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("activities", sa.Column("share_preview_file", sa.String(length=128), nullable=True))


def downgrade() -> None:
    op.drop_column("activities", "share_preview_file")
