"""create bills tables"""

from alembic import op
import sqlalchemy as sa


revision = "20260307_0003"
down_revision = "20260307_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "bills",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("activity_id", sa.Integer(), nullable=True),
        sa.Column("item", sa.String(length=128), nullable=False),
        sa.Column("note", sa.String(length=1000), nullable=False, server_default=""),
        sa.Column("total_amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("payer_user_id", sa.Integer(), nullable=False),
        sa.Column("payer_name_snapshot", sa.String(length=64), nullable=False),
        sa.Column("per_share", sa.Numeric(10, 2), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["activity_id"], ["activities.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["payer_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_bills_activity_id", "bills", ["activity_id"], unique=False)
    op.create_index("ix_bills_date", "bills", ["date"], unique=False)

    op.create_table(
        "bill_participants",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("bill_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("nickname_snapshot", sa.String(length=64), nullable=False),
        sa.ForeignKeyConstraint(["bill_id"], ["bills.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_bill_participants_bill_id", "bill_participants", ["bill_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_bill_participants_bill_id", table_name="bill_participants")
    op.drop_table("bill_participants")
    op.drop_index("ix_bills_date", table_name="bills")
    op.drop_index("ix_bills_activity_id", table_name="bills")
    op.drop_table("bills")
