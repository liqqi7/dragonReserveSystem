"""fix activity status and add checkin method

Revision ID: 20260810_0010
Revises: 20260809_0009
Create Date: 2026-08-10
"""

from alembic import op
import sqlalchemy as sa


revision = "20260810_0010"
down_revision = "20260809_0009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("activity_participants")}
    if "checkin_method" not in columns:
        op.add_column("activity_participants", sa.Column("checkin_method", sa.String(length=16), nullable=True))
    op.execute(
        """
        UPDATE activity_participants
        SET checkin_method = CASE
            WHEN checked_in_at IS NULL THEN NULL
            WHEN checkin_lat IS NULL AND checkin_lng IS NULL THEN 'admin'
            ELSE 'location'
        END
        """
    )
    foreign_keys = inspector.get_foreign_keys("activity_participants")
    user_foreign_key = next(
        (foreign_key for foreign_key in foreign_keys if foreign_key["constrained_columns"] == ["user_id"]),
        None,
    )
    if user_foreign_key and user_foreign_key.get("options", {}).get("ondelete") != "CASCADE":
        op.drop_constraint(user_foreign_key["name"], "activity_participants", type_="foreignkey")
        user_foreign_key = None
    if user_foreign_key is None:
        op.create_foreign_key(
            "activity_participants_ibfk_2",
            "activity_participants",
            "users",
            ["user_id"],
            ["id"],
            ondelete="CASCADE",
        )
    op.execute(
        """
        UPDATE activities
        SET status = CONVERT(0xE5B7B2E7BB93E69D9F USING utf8mb4)
        WHERE end_time <= NOW()
          AND HEX(status) NOT IN ('E5B7B2E58F96E6B688', 'E5B7B2E588A0E999A4', 'E5B7B2B2E6B581')
        """
    )


def downgrade() -> None:
    op.drop_constraint("activity_participants_ibfk_2", "activity_participants", type_="foreignkey")
    op.create_foreign_key(
        "activity_participants_ibfk_2",
        "activity_participants",
        "users",
        ["user_id"],
        ["id"],
    )
    op.drop_column("activity_participants", "checkin_method")
