"""User model."""

from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Index, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class User(Base):
    """Application user for local and WeChat-based authentication."""

    __tablename__ = "users"
    __table_args__ = (
        Index("ix_users_role", "role"),
        Index("ix_users_wechat_openid", "wechat_openid"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    username: Mapped[Optional[str]] = mapped_column(String(64), unique=True, nullable=True)
    wechat_openid: Mapped[Optional[str]] = mapped_column(String(64), unique=True, nullable=True)
    password_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    nickname: Mapped[str] = mapped_column(String(64), nullable=False)
    avatar_url: Mapped[str] = mapped_column(String(512), nullable=False, default="")
    role: Mapped[str] = mapped_column(String(32), nullable=False, default="user")
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
