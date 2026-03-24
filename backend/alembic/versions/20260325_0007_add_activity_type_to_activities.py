"""add activity_type column to activities

Revision ID: 20260325_0007
Revises: 20260317_0006
Create Date: 2026-03-25
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "20260325_0007"
down_revision = "20260317_0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = {col["name"] for col in inspector.get_columns("activities")}
    if "activity_type" not in columns:
        op.add_column(
            "activities",
            sa.Column("activity_type", sa.String(length=32), nullable=True),
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = {col["name"] for col in inspector.get_columns("activities")}
    if "activity_type" in columns:
        op.drop_column("activities", "activity_type")
