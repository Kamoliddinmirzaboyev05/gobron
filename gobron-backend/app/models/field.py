"""Field model — a bookable artificial football field.

The slot-generation engine reads the scheduling columns here
(opening_time, closing_time, slot_duration, working_days) to produce Slots.
"""
from datetime import datetime, time
from decimal import Decimal

from sqlalchemy import (
    ARRAY,
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    Time,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Field(Base):
    __tablename__ = "fields"

    id: Mapped[int] = mapped_column(primary_key=True)
    owner_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    venue_id: Mapped[int | None] = mapped_column(
        ForeignKey("venues.id", ondelete="CASCADE"), index=True
    )

    name: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    address: Mapped[str | None] = mapped_column(String(255))
    latitude: Mapped[float | None] = mapped_column()
    longitude: Mapped[float | None] = mapped_column()

    # Comma/array of image URLs for the gallery.
    images: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    rating: Mapped[float] = mapped_column(default=0.0)

    # --- Scheduling configuration (drives the slot engine) ---
    opening_time: Mapped[time] = mapped_column(Time, nullable=False, default=time(8, 0))
    closing_time: Mapped[time] = mapped_column(Time, nullable=False, default=time(23, 0))
    # 30 or 60 minutes.
    slot_duration: Mapped[int] = mapped_column(Integer, default=60, nullable=False)
    # Weekdays the field operates on: 0 = Monday ... 6 = Sunday.
    working_days: Mapped[list[int]] = mapped_column(
        ARRAY(Integer), default=lambda: [0, 1, 2, 3, 4, 5, 6]
    )
    # How many days ahead (including today) the manual-booking picker opens.
    booking_window_days: Mapped[int] = mapped_column(Integer, default=3, nullable=False)

    # Base price per slot; effective price may vary by time (see pricing logic).
    price_per_slot: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0"))
    size: Mapped[str | None] = mapped_column(String(40))
    surface_type: Mapped[str] = mapped_column(String(20), default="open", nullable=False)
    price_per_hour: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), default=Decimal("0")
    )
    # Optional premium multiplier applied to evening/peak hours.
    peak_start_time: Mapped[time | None] = mapped_column(Time)
    peak_price_multiplier: Mapped[Decimal] = mapped_column(
        Numeric(4, 2), default=Decimal("1.0")
    )

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    owner: Mapped["User"] = relationship(back_populates="fields")  # noqa: F821
    venue: Mapped["Venue | None"] = relationship(back_populates="fields")  # noqa: F821
    slots: Mapped[list["Slot"]] = relationship(  # noqa: F821
        back_populates="field", cascade="all, delete-orphan"
    )
