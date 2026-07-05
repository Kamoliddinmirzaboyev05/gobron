"""Slot model — a single bookable time window on a field for a given date.

Optimistic locking: the `version_id` column is bumped on every UPDATE. When two
requests race to book the same slot, only the first commit succeeds; the second
sees a stale version and is rejected. This prevents double booking without
holding long database locks.
"""
from datetime import date, datetime, time
from decimal import Decimal

from sqlalchemy import (
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    Time,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import SlotStatus


class Slot(Base):
    __tablename__ = "slots"
    __table_args__ = (
        # A field cannot have two slots starting at the same time on the same day.
        UniqueConstraint("field_id", "slot_date", "start_time", name="uq_slot_field_date_start"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    field_id: Mapped[int] = mapped_column(
        ForeignKey("fields.id", ondelete="CASCADE"), index=True
    )

    slot_date: Mapped[date] = mapped_column(Date, index=True, nullable=False)
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)

    status: Mapped[SlotStatus] = mapped_column(
        Enum(SlotStatus, name="slot_status"),
        default=SlotStatus.AVAILABLE,
        nullable=False,
        index=True,
    )
    # Effective price for this specific slot (peak pricing already applied).
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0"))

    # Optimistic-lock version. SQLAlchemy auto-increments this on UPDATE.
    version_id: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    __mapper_args__ = {"version_id_col": version_id}

    field: Mapped["Field"] = relationship(back_populates="slots")  # noqa: F821
    booking: Mapped["Booking | None"] = relationship(  # noqa: F821
        back_populates="slot", uselist=False
    )
