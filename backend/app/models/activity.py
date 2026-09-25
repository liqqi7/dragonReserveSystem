from __future__ import annotations

"""Activity models."""

from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Index, Integer, String, UniqueConstraint, func
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
    remark: Mapped[str] = mapped_column(String(1000), nullable=False, default="")
    max_participants: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, default=None)
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    signup_deadline: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    signup_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    activity_type: Mapped[Optional[str]] = mapped_column(String(32), nullable=True, default=None)
    activity_style_key: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, default=None)
    activity_cover_id: Mapped[str] = mapped_column(
        String(96),
        nullable=False,
        server_default="aleksey-rico-001",
    )
    share_preview_file: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    location_name: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    location_address: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    location_latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    location_longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
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
    sub_items: Mapped[list["ActivitySubItem"]] = relationship(
        back_populates="activity",
        cascade="all, delete-orphan",
        order_by="ActivitySubItem.sort_order, ActivitySubItem.id",
    )
    weather_snapshot: Mapped[Optional["ActivityWeatherSnapshot"]] = relationship(
        back_populates="activity",
        cascade="all, delete-orphan",
        uselist=False,
    )


class ActivitySubItem(Base):
    """Sub-item (sub-activity) within an activity."""

    __tablename__ = "activity_sub_items"
    __table_args__ = (
        Index("ix_activity_sub_items_activity_id", "activity_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    activity_id: Mapped[int] = mapped_column(ForeignKey("activities.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    max_participants: Mapped[int] = mapped_column(Integer, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    activity: Mapped[Activity] = relationship(back_populates="sub_items")
    @property
    def current_participants(self) -> int:
        return len(self.participant_associations)

    participant_associations: Mapped[list["ActivityParticipantSubItem"]] = relationship(
        back_populates="sub_item",
        cascade="all, delete-orphan",
    )


class ActivityParticipant(Base):
    """Participant record for an activity."""

    __tablename__ = "activity_participants"
    __table_args__ = (
        UniqueConstraint("activity_id", "user_id", name="uq_activity_participants_activity_user"),
        Index("ix_activity_participants_activity_id", "activity_id"),
        Index("ix_activity_participants_user_id", "user_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    activity_id: Mapped[int] = mapped_column(ForeignKey("activities.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    display_nickname: Mapped[str] = mapped_column(String(64), nullable=False)
    display_avatar_url: Mapped[str] = mapped_column(String(512), nullable=False, default="")
    checked_in_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    checkin_method: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    checkin_lat: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    checkin_lng: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    checkin_location_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    checkin_address: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    activity: Mapped[Activity] = relationship(back_populates="participants")
    @property
    def sub_item_ids(self) -> list[int]:
        return [link.sub_item_id for link in self.sub_item_associations]

    sub_item_associations: Mapped[list["ActivityParticipantSubItem"]] = relationship(
        back_populates="participant",
        cascade="all, delete-orphan",
    )


class ActivityParticipantSubItem(Base):
    """Mapping between participant and chosen sub-items."""

    __tablename__ = "activity_participant_sub_items"
    __table_args__ = (
        UniqueConstraint("participant_id", "sub_item_id", name="uq_participant_sub_item"),
        Index("ix_participant_sub_items_activity_id", "activity_id"),
        Index("ix_participant_sub_items_sub_item_id", "sub_item_id"),
        Index("ix_participant_sub_items_user_id", "user_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    activity_id: Mapped[int] = mapped_column(ForeignKey("activities.id", ondelete="CASCADE"), nullable=False)
    participant_id: Mapped[int] = mapped_column(ForeignKey("activity_participants.id", ondelete="CASCADE"), nullable=False)
    sub_item_id: Mapped[int] = mapped_column(ForeignKey("activity_sub_items.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    participant: Mapped[ActivityParticipant] = relationship(back_populates="sub_item_associations")
    sub_item: Mapped[ActivitySubItem] = relationship(back_populates="participant_associations")
