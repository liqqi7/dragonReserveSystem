"""migrate activities away from retired activity covers

Revision ID: 20260923_0019
Revises: 20260918_0018
Create Date: 2026-09-23
"""

from alembic import op
import sqlalchemy as sa


revision = "20260923_0019"
down_revision = "20260918_0018"
branch_labels = None
depends_on = None


# These replacements were reviewed against the production activity-usage audit.
# Keep the retired files in place after this migration so historical rollback is
# still possible without changing the catalog or asset paths.
REPLACEMENTS = (
    ("ardhira-putra-009", "ardhira-putra-001"),
    ("patryk-wojciechowicz-002", "coen-pohl-001"),
    ("patryk-wojciechowicz-004", "patryk-wojciechowicz-007"),
    ("patryk-wojciechowicz-005", "miguel-angel-camprubi-009"),
    ("patryk-wojciechowicz-009", "patryk-wojciechowicz-006"),
    ("patryk-wojciechowicz-011", "meyoco-001"),
    ("patryk-wojciechowicz-014", "lam-002"),
    ("venmen-001", "magoyama-008"),
    ("venmen-005", "lam-007"),
    ("venmen-006", "patryk-wojciechowicz-007"),
    ("venmen-007", "yoneyama-mai-016"),
    ("yoneyama-mai-003", "hiroaki-seto-002"),
    ("yoneyama-mai-004", "tatsuro-kiuchi-001"),
    ("yoneyama-mai-007", "miguel-angel-camprubi-009"),
    ("yoneyama-mai-010", "ardhira-putra-008"),
    ("yoneyama-mai-011", "ardhira-putra-001"),
    ("yoneyama-mai-013", "ardhira-putra-002"),
)


def _replace(source: str, replacement: str) -> None:
    op.execute(
        sa.text(
            "UPDATE activities "
            "SET activity_cover_id = :replacement "
            "WHERE activity_cover_id = :source"
        ).bindparams(source=source, replacement=replacement)
    )


def upgrade() -> None:
    for source, replacement in REPLACEMENTS:
        _replace(source, replacement)


def downgrade() -> None:
    # Several retired IDs intentionally converge on the same replacement ID.
    # A SQL reverse update would therefore assign the wrong source to some
    # activities. Restore the pre-migration database backup instead.
    raise RuntimeError(
        "activity cover replacement migration is irreversible; restore the "
        "pre-migration database backup to roll back"
    )
