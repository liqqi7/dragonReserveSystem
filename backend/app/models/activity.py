"""Activity models."""

from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Index, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Activity(Base):
    """Activity aggregate root."""

    __tablename__ = "activities"
    __table_args__ = (
        Index("ix_activities_status", "status"),
        Index("ix_activities_start_time", "start_time"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="进行中")
    remark: Mapped[str] = mapped_column(Text, nullable=False, default="")
    max_participants: Mapped[int] = mapped_column(Integer, nullable=False, default=20)
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    signup_deadline: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    location_name: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    location_address: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    location_latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    location_longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    participants: Mapped[list["ActivityParticipant"]] = relationship(
        back_populates="activity",
        cascade="all, delete-orphan",
    )


class ActivityParticipant(Base):
    """Participant record for an activity."""

    __tablename__ = "activity_participants"
    __table_args__ = (
        UniqueConstraint("activity_id", "user_id", name="uq_activity_participants_activity_user"),
        Index("ix_activity_participants_activity_id", "activity_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    activity_id: Mapped[int] = mapped_column(ForeignKey("activities.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    nickname_snapshot: Mapped[str] = mapped_column(String(64), nullable=False)
    avatar_url_snapshot: Mapped[str] = mapped_column(String(512), nullable=False, default="")
    checked_in_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    checkin_lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    checkin_lng: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    activity: Mapped[Activity] = relationship(back_populates="participants")
