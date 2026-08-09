"""remove billing tables

Revision ID: 20260809_0009
Revises: 20260326_0008
Create Date: 2026-08-09
"""

from alembic import op
from sqlalchemy import inspect


revision = "20260809_0009"
down_revision = "20260326_0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    tables = set(inspector.get_table_names())
    if "bill_participants" in tables:
        op.drop_table("bill_participants")
    if "bills" in tables:
        op.drop_table("bills")


def downgrade() -> None:
    raise RuntimeError("Billing tables were intentionally removed and can only be restored from a database backup.")
