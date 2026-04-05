"""add wechat login columns to users"""

from alembic import op
import sqlalchemy as sa


revision = "20260308_0004"
down_revision = "20260307_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("wechat_openid", sa.String(length=64), nullable=True))
    op.alter_column("users", "username", existing_type=sa.String(length=64), nullable=True)
    op.alter_column("users", "password_hash", existing_type=sa.String(length=255), nullable=True)
    op.create_index("ix_users_wechat_openid", "users", ["wechat_openid"], unique=False)
    op.create_unique_constraint("uq_users_wechat_openid", "users", ["wechat_openid"])


def downgrade() -> None:
    op.drop_constraint("uq_users_wechat_openid", "users", type_="unique")
    op.drop_index("ix_users_wechat_openid", table_name="users")
    op.alter_column("users", "password_hash", existing_type=sa.String(length=255), nullable=False)
    op.alter_column("users", "username", existing_type=sa.String(length=64), nullable=False)
    op.drop_column("users", "wechat_openid")
