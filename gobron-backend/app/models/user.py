"""User model — players, field owners and superadmins.

A single table holds all accounts; `role` distinguishes their capabilities.
Onboarding happens in the Telegram bot (start -> first name, region, phone);
afterwards the user opens the Telegram Mini App (TMA), which logs in
by validating Telegram `initData`. There is no password column. Phone + OTP is
also supported as a fallback login.
"""
from datetime import datetime

from sqlalchemy import BigInteger, Boolean, DateTime, Enum, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import UserRole


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)

    # Telegram identity (set when the user onboards through the bot).
    telegram_id: Mapped[int | None] = mapped_column(
        BigInteger, unique=True, index=True
    )

    phone: Mapped[str | None] = mapped_column(String(20), unique=True, index=True)

    # Username + password login (admins / field owners). Players use Telegram.
    username: Mapped[str | None] = mapped_column(String(50), unique=True, index=True)
    hashed_password: Mapped[str | None] = mapped_column(String(255))

    first_name: Mapped[str | None] = mapped_column(String(80))
    last_name: Mapped[str | None] = mapped_column(String(80))
    region: Mapped[str | None] = mapped_column(String(80))   # viloyat
    city: Mapped[str | None] = mapped_column(String(80))     # shahar

    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role"), default=UserRole.PLAYER, nullable=False
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    # Blocked users keep their data but cannot log in or use the bot/TMA.
    is_blocked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    # True once the bot onboarding (all required fields) is complete.
    is_onboarded: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    @property
    def full_name(self) -> str:
        return " ".join(p for p in (self.first_name, self.last_name) if p).strip()

    # An owner may own many fields (only meaningful when role == FIELD_OWNER).
    fields: Mapped[list["Field"]] = relationship(  # noqa: F821
        back_populates="owner", cascade="all, delete-orphan"
    )
    bookings: Mapped[list["Booking"]] = relationship(  # noqa: F821
        back_populates="user"
    )
