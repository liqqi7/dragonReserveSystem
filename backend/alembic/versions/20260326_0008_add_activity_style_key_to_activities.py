"""add activity_style_key column to activities

Revision ID: 20260326_0008
Revises: 20260325_0007
Create Date: 2026-03-26
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "20260326_0008"
down_revision = "20260325_0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = {col["name"] for col in inspector.get_columns("activities")}
    if "activity_style_key" not in columns:
        op.add_column(
            "activities",
            sa.Column("activity_style_key", sa.String(length=64), nullable=True),
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = {col["name"] for col in inspector.get_columns("activities")}
    if "activity_style_key" in columns:
        op.drop_column("activities", "activity_style_key")

