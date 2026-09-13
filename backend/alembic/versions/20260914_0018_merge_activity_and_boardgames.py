"""Join the main activity migrations and the boardgame feature migrations.

Both existing histories remain valid; upgrading either deployed head applies
the other branch before reaching this no-op merge revision.
"""

revision = '20260914_0018'
down_revision = ('20260907_0017', '20260913_0015')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
