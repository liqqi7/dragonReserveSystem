"""Independent memories, individual assets, audit trail and global capacity ledger."""

from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, Index, JSON, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.utils.app_time import app_now


class Memory(Base):
    __tablename__ = "memories"
    __table_args__ = (
        UniqueConstraint("user_id", "client_submission_id", name="uq_memory_submission"),
        Index("ix_memories_public", "status", "published_at", "id"),
        Index("ix_memories_review", "status", "created_at", "id"),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    activity_id: Mapped[int | None] = mapped_column(ForeignKey("activities.id", ondelete="SET NULL"))
    activity_name: Mapped[str] = mapped_column(String(128), default="")
    location_name: Mapped[str] = mapped_column(String(128), default="")
    caption: Mapped[str] = mapped_column(String(50), default="")
    author_nickname: Mapped[str] = mapped_column(String(64), default="")
    status: Mapped[str] = mapped_column(String(24), default="draft")
    client_submission_id: Mapped[str] = mapped_column(String(64))
    revision: Mapped[int] = mapped_column(default=1)
    expires_at: Mapped[datetime] = mapped_column(DateTime)
    published_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=app_now)


class MemoryMedia(Base):
    __tablename__ = "memory_media"
    __table_args__ = (UniqueConstraint("memory_id", "sort", name="uq_memory_slot"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    memory_id: Mapped[int] = mapped_column(ForeignKey("memories.id"), index=True)
    sort: Mapped[int] = mapped_column()
    kind: Mapped[str] = mapped_column(String(8))
    declared_bytes: Mapped[int] = mapped_column(BigInteger)
    original_bytes: Mapped[int] = mapped_column(BigInteger, default=0)
    reserved_bytes: Mapped[int] = mapped_column(BigInteger)
    original_key: Mapped[str] = mapped_column(String(255), default="")
    display_key: Mapped[str] = mapped_column(String(255), default="")
    thumbnail_key: Mapped[str] = mapped_column(String(255), default="")
    digest: Mapped[str] = mapped_column(String(64), default="")
    width: Mapped[int] = mapped_column(default=0)
    height: Mapped[int] = mapped_column(default=0)
    duration: Mapped[float] = mapped_column(default=0)
    state: Mapped[str] = mapped_column(String(24), default="waiting")
    publication_status: Mapped[str] = mapped_column(String(24), default="unreviewed")
    lease_until: Mapped[datetime | None] = mapped_column(DateTime)
    attempts: Mapped[int] = mapped_column(default=0)


class MemoryAuditLog(Base):
    __tablename__ = "memory_audit_logs"
    id: Mapped[int] = mapped_column(primary_key=True)
    memory_id: Mapped[int] = mapped_column(ForeignKey("memories.id"), index=True)
    actor_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    action: Mapped[str] = mapped_column(String(32))
    media_ids: Mapped[list] = mapped_column(JSON, default=list)
    revision: Mapped[int] = mapped_column()
    created_at: Mapped[datetime] = mapped_column(DateTime, default=app_now)


class MemoryCapacity(Base):
    __tablename__ = "memory_capacity"
    id: Mapped[int] = mapped_column(primary_key=True)
    reserved_bytes: Mapped[int] = mapped_column(BigInteger, default=0)
