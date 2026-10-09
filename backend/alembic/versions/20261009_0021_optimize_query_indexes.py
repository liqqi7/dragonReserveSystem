"""Index activity end times and remove redundant openid index."""
from alembic import op

revision = "20261009_0021"
down_revision = "20260924_0020"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index("ix_activities_end_time", "activities", ["end_time"])
    op.drop_index("ix_users_wechat_openid", table_name="users")


def downgrade() -> None:
    op.create_index("ix_users_wechat_openid", "users", ["wechat_openid"])
    op.drop_index("ix_activities_end_time", table_name="activities")
