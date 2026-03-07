"""create activities tables"""

from alembic import op
import sqlalchemy as sa


revision = "20260307_0002"
down_revision = "20260307_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "activities",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="进行中"),
        sa.Column("remark", sa.String(length=1000), nullable=False, server_default=""),
        sa.Column("max_participants", sa.Integer(), nullable=False, server_default="20"),
        sa.Column("start_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("signup_deadline", sa.DateTime(timezone=True), nullable=True),
        sa.Column("location_name", sa.String(length=255), nullable=False, server_default=""),
        sa.Column("location_address", sa.String(length=255), nullable=False, server_default=""),
        sa.Column("location_latitude", sa.Float(), nullable=True),
        sa.Column("location_longitude", sa.Float(), nullable=True),
        sa.Column("created_by", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_activities_start_time", "activities", ["start_time"], unique=False)
    op.create_index("ix_activities_status", "activities", ["status"], unique=False)

    op.create_table(
        "activity_participants",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("activity_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("nickname_snapshot", sa.String(length=64), nullable=False),
        sa.Column("avatar_url_snapshot", sa.String(length=512), nullable=False, server_default=""),
        sa.Column("checked_in_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("checkin_lat", sa.Float(), nullable=True),
        sa.Column("checkin_lng", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["activity_id"], ["activities.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("activity_id", "user_id", name="uq_activity_participants_activity_user"),
    )
    op.create_index(
        "ix_activity_participants_activity_id",
        "activity_participants",
        ["activity_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_activity_participants_activity_id", table_name="activity_participants")
    op.drop_table("activity_participants")
    op.drop_index("ix_activities_status", table_name="activities")
    op.drop_index("ix_activities_start_time", table_name="activities")
    op.drop_table("activities")
