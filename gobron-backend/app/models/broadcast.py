"""Broadcast model — a post an admin sends to all bot users (image optional).

The admin panel creates a Broadcast (text + optional image URL); a worker (or
the send endpoint) pushes it to every eligible Telegram user via the bot and
records delivery counts.
"""
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.enums import BroadcastStatus


class Broadcast(Base):
    __tablename__ = "broadcasts"

    id: Mapped[int] = mapped_column(primary_key=True)
    created_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )

    text: Mapped[str] = mapped_column(Text, nullable=False)
    # Optional photo: a URL or Telegram file_id. Null => text-only post.
    image_url: Mapped[str | None] = mapped_column(String(500))

    status: Mapped[BroadcastStatus] = mapped_column(
        Enum(BroadcastStatus, name="broadcast_status"),
        default=BroadcastStatus.DRAFT,
        nullable=False,
    )
    sent_count: Mapped[int] = mapped_column(Integer, default=0)
    failed_count: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
