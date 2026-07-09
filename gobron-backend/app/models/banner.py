"""Banner model — superadmin-managed images shown in the user-web hero carousel."""
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Banner(Base):
    __tablename__ = "banners"

    id: Mapped[int] = mapped_column(primary_key=True)
    image_url: Mapped[str] = mapped_column(String(500), nullable=False)
    link: Mapped[str | None] = mapped_column(String(500))
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
