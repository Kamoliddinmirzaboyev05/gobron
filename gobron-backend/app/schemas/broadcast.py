"""Broadcast schemas — create a bot post and read its delivery result."""
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import BroadcastAudience, BroadcastStatus


class BroadcastCreate(BaseModel):
    text: str = Field(..., min_length=1)
    image_url: str | None = None  # URL or Telegram file_id; None => text-only
    audience: BroadcastAudience = BroadcastAudience.BOT_USERS


class BroadcastOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    text: str
    image_url: str | None
    audience: BroadcastAudience
    status: BroadcastStatus
    sent_count: int
    failed_count: int
    created_at: datetime
    sent_at: datetime | None
