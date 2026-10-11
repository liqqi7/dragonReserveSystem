"""Add private memory submissions and a transactional capacity ledger."""

from alembic import op
from sqlalchemy import BigInteger, Column, DateTime, Float, ForeignKey, Integer, JSON, String, UniqueConstraint

revision = "20261011_0024"
down_revision = "20261010_0023"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("memories", Column("id", Integer, primary_key=True),
        Column("user_id", Integer, ForeignKey("users.id"), nullable=False),
        Column("activity_id", Integer, ForeignKey("activities.id", ondelete="SET NULL")),
        Column("activity_name", String(128), nullable=False),
        Column("location_name", String(128), nullable=False), Column("caption", String(50), nullable=False),
        Column("author_nickname", String(64), nullable=False), Column("status", String(24), nullable=False),
        Column("client_submission_id", String(64), nullable=False), Column("revision", Integer, nullable=False),
        Column("expires_at", DateTime, nullable=False), Column("published_at", DateTime),
        Column("created_at", DateTime, nullable=False),
        UniqueConstraint("user_id", "client_submission_id", name="uq_memory_submission"))
    op.create_index("ix_memories_user_id", "memories", ["user_id"])
    op.create_index("ix_memories_public", "memories", ["status", "published_at", "id"])
    op.create_index("ix_memories_review", "memories", ["status", "created_at", "id"])
    op.create_table("memory_media", Column("id", Integer, primary_key=True),
        Column("memory_id", Integer, ForeignKey("memories.id"), nullable=False),
        Column("sort", Integer, nullable=False), Column("kind", String(8), nullable=False),
        Column("declared_bytes", BigInteger, nullable=False), Column("original_bytes", BigInteger, nullable=False),
        Column("reserved_bytes", BigInteger, nullable=False), Column("original_key", String(255), nullable=False),
        Column("display_key", String(255), nullable=False), Column("thumbnail_key", String(255), nullable=False),
        Column("digest", String(64), nullable=False), Column("width", Integer, nullable=False),
        Column("height", Integer, nullable=False), Column("duration", Float, nullable=False),
        Column("state", String(24), nullable=False), Column("publication_status", String(24), nullable=False),
        Column("lease_until", DateTime), Column("attempts", Integer, nullable=False),
        UniqueConstraint("memory_id", "sort", name="uq_memory_slot"))
    op.create_index("ix_memory_media_memory_id", "memory_media", ["memory_id"])
    op.create_table("memory_audit_logs", Column("id", Integer, primary_key=True),
        Column("memory_id", Integer, ForeignKey("memories.id"), nullable=False),
        Column("actor_id", Integer, ForeignKey("users.id")), Column("action", String(32), nullable=False),
        Column("media_ids", JSON, nullable=False), Column("revision", Integer, nullable=False),
        Column("created_at", DateTime, nullable=False))
    op.create_index("ix_memory_audit_logs_memory_id", "memory_audit_logs", ["memory_id"])
    table = op.create_table("memory_capacity", Column("id", Integer, primary_key=True),
                            Column("reserved_bytes", BigInteger, nullable=False))
    op.bulk_insert(table, [{"id": 1, "reserved_bytes": 0}])


def downgrade():
    raise RuntimeError("Memory rollback must preserve submissions; disable the feature instead")
