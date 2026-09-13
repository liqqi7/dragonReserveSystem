"""Keep the edition explicitly chosen when entering a physical game copy."""
from alembic import op
import sqlalchemy as sa

revision = '20260913_0015'
down_revision = '20260913_0014'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('boardgame_inventory', sa.Column('bgg_version_snapshot', sa.JSON(), nullable=True))


def downgrade():
    if op.get_bind().execute(sa.text(
            'SELECT COUNT(*) FROM boardgame_inventory WHERE bgg_version_snapshot IS NOT NULL')).scalar():
        raise RuntimeError('Selected editions exist; keep the snapshot column when rolling back the application.')
    with op.batch_alter_table('boardgame_inventory') as batch:
        batch.drop_column('bgg_version_snapshot')
