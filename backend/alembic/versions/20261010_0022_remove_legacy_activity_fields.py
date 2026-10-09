"""Remove unused activity columns. Back up the database before applying.

Revision ID: 20261010_0022
Revises: 20261009_0021
Create Date: 2026-10-10
"""

from alembic import op


revision = "20261010_0022"
down_revision = "20261009_0021"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Native DROP COLUMN preserves child foreign keys; no table-copy fallback.
    for column in ("signup_deadline", "activity_type", "activity_style_key"):
        op.drop_column("activities", column)


def downgrade() -> None:
    raise RuntimeError("Removed activity data is irreversible; restore the pre-migration database backup.")
