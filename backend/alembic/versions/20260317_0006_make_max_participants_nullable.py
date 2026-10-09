"""make max_participants nullable on activities

Revision ID: 20260317_0006
Revises: 20260316_0005
Create Date: 2026-03-17 00:00:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260317_0006"
down_revision = "20260316_0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "activities",
        "max_participants",
        existing_type=sa.Integer(),
        nullable=True,
    )


def downgrade() -> None:
    if op.get_bind().execute(sa.text(
        "SELECT 1 FROM activities WHERE max_participants IS NULL LIMIT 1"
    )).first() is not None:
        raise RuntimeError(
            "Cannot restore NOT NULL while unlimited-capacity activities exist; "
            "choose explicit capacities before retrying, or restore the backup."
        )
    op.alter_column(
        "activities",
        "max_participants",
        existing_type=sa.Integer(),
        nullable=False,
    )

