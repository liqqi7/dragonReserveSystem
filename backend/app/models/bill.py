from __future__ import annotations

"""Bill models."""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import Date, DateTime, ForeignKey, Index, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Bill(Base):
    """Expense record for an activity or ad hoc settlement."""

    __tablename__ = "bills"
    __table_args__ = (
        Index("ix_bills_activity_id", "activity_id"),
        Index("ix_bills_date", "date"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    activity_id: Mapped[Optional[int]] = mapped_column(ForeignKey("activities.id", ondelete="SET NULL"), nullable=True)
    item: Mapped[str] = mapped_column(String(128), nullable=False)
    note: Mapped[str] = mapped_column(String(1000), nullable=False, default="")
    total_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    payer_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    payer_name_snapshot: Mapped[str] = mapped_column(String(64), nullable=False)
    per_share: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
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

    participants: Mapped[list["BillParticipant"]] = relationship(
        back_populates="bill",
        cascade="all, delete-orphan",
    )


class BillParticipant(Base):
    """Participant snapshot attached to a bill."""

    __tablename__ = "bill_participants"
    __table_args__ = (
        Index("ix_bill_participants_bill_id", "bill_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    bill_id: Mapped[int] = mapped_column(ForeignKey("bills.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    nickname_snapshot: Mapped[str] = mapped_column(String(64), nullable=False)

    bill: Mapped[Bill] = relationship(back_populates="participants")
