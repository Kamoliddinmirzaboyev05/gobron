"""FieldOwner profile — business details attached to a User with the
FIELD_OWNER role.

We keep authentication unified on `User` (phone + OTP) and store owner-specific
business information here in a one-to-one profile. This satisfies the domain
"FieldOwner" entity without duplicating auth logic.
"""
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class FieldOwner(Base):
    __tablename__ = "field_owners"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True
    )
    business_name: Mapped[str] = mapped_column(String(150), nullable=False)
    contact_phone: Mapped[str | None] = mapped_column(String(20))
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    user: Mapped["User"] = relationship()  # noqa: F821
