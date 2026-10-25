"""Backfill default_rules / projection_warnings columns for existing boardgame rows.

Revision: 20261025_0025
Revises: 20261012_0022

Production-safe: only ADDs columns with server defaults. Existing rows keep
all their data untouched and simply receive the default column values.
Idempotent: fresh databases whose 0021 migration file already creates the
columns skip the ALTER entirely.
"""
from alembic import op
import sqlalchemy as sa

revision = "20261025_0025"
down_revision = "20261012_0022"
branch_labels = None
depends_on = None

_DEFAULT_RULES = '{"competition_mode": "unscored", "score_direction": "none", "variant_key": "", "rules_version": "1"}'


def upgrade() -> None:
    bind = op.get_bind()
    existing = {c['name'] for c in sa.inspect(bind).get_columns('boardgames')}
    # JSON columns on MySQL only accept expression defaults — wrap in parens.
    if 'default_rules' not in existing:
        op.add_column('boardgames', sa.Column('default_rules', sa.JSON(), nullable=False,
                                              server_default=sa.text("('" + _DEFAULT_RULES + "')")))
    if 'projection_warnings' not in existing:
        op.add_column('boardgames', sa.Column('projection_warnings', sa.JSON(), nullable=False,
                                              server_default=sa.text("('[]')")))


def downgrade() -> None:
    bind = op.get_bind()
    existing = {c['name'] for c in sa.inspect(bind).get_columns('boardgames')}
    if 'projection_warnings' in existing:
        op.drop_column('boardgames', 'projection_warnings')
    if 'default_rules' in existing:
        op.drop_column('boardgames', 'default_rules')
