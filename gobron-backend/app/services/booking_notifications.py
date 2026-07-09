"""Telegram messages a player gets about their own booking.

Two events: the owner accepts the request, and kickoff is an hour away. The
player already talks to the bot, so there is no extra channel to maintain.

Slot dates and times are naive Tashkent wall-clock (see app.utils.clock), so
every comparison in here must use now_local(), never datetime.utcnow().
"""
import logging
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.booking import Booking
from app.models.enums import BookingStatus
from app.models.slot import Slot
from app.services import telegram
from app.utils.clock import now_local

logger = logging.getLogger(__name__)

REMINDER_LEAD = timedelta(minutes=60)

# Below this, "1 soat qoldi" would be a lie — the loop woke up late (restart, a
# slow tick) and the real gap is smaller.
_ROUND_TO_AN_HOUR = 50


def format_price(value: Decimal | int) -> str:
    """12000 -> '12 000'. Prices are whole so'm."""
    return f"{int(value):,}".replace(",", " ")


def slot_start(slot: Slot) -> datetime:
    return datetime.combine(slot.slot_date, slot.start_time)


def is_due(start: datetime, now: datetime) -> bool:
    """Kickoff still ahead, and within the reminder lead."""
    return now < start <= now + REMINDER_LEAD


def day_label(day: date, today: date) -> str:
    delta = (day - today).days
    if delta == 0:
        return "bugungi"
    if delta == 1:
        return "ertangi"
    return f"{day:%d.%m.%Y} kungi"


def countdown_label(minutes: int) -> str:
    return "1 soat qoldi" if minutes >= _ROUND_TO_AN_HOUR else f"{minutes} daqiqa qoldi"


def confirmation_text(booking: Booking, today: date) -> str:
    slot = booking.slot
    return (
        f"✅ Sizning {day_label(slot.slot_date, today)} "
        f"{slot.start_time:%H:%M} - {slot.end_time:%H:%M} dagi broningiz tasdiqlandi!\n\n"
        f"🏟 {slot.field.name}\n"
        f"💰 {format_price(booking.total_price)} so'm"
    )


def reminder_text(booking: Booking, minutes: int) -> str:
    slot = booking.slot
    return (
        f"⏰ O'yiningizga {countdown_label(minutes)}!\n\n"
        f"🏟 {slot.field.name}\n"
        f"🕐 {slot.start_time:%H:%M} - {slot.end_time:%H:%M}\n"
        f"💰 {format_price(booking.total_price)} so'm"
    )


async def send_confirmation(booking: Booking) -> bool:
    """Called right after the owner accepts. Best-effort: the booking is already
    confirmed, so a dead Telegram chat must not fail the owner's request."""
    if not booking.user or not booking.user.telegram_id:
        return False
    # Short timeout: the owner's HTTP request is waiting on this.
    return await telegram.send_message(
        booking.user.telegram_id, confirmation_text(booking, now_local().date()), timeout=5
    )


async def due_reminders(db: AsyncSession, now: datetime) -> list[Booking]:
    horizon = now + REMINDER_LEAD
    stmt = (
        select(Booking)
        .join(Slot, Booking.slot_id == Slot.id)
        .options(
            selectinload(Booking.user),
            selectinload(Booking.slot).selectinload(Slot.field),
        )
        .where(
            Booking.status == BookingStatus.CONFIRMED,
            Booking.reminder_sent_at.is_(None),
            Slot.slot_date.between(now.date(), horizon.date()),
        )
    )
    rows = (await db.execute(stmt)).scalars().all()
    # ponytail: the SQL filter is coarse (two days of unsent confirmed bookings);
    # the exact cut is done here because `slot_date + start_time` as a SQL
    # expression is dialect-specific. Move it into SQL if this ever scans big.
    return [b for b in rows if is_due(slot_start(b.slot), now)]


async def send_due_reminders(db: AsyncSession, now: datetime | None = None) -> int:
    """One tick. Returns how many reminders went out."""
    now = now or now_local()
    sent = 0
    for booking in await due_reminders(db, now):
        if not booking.user or not booking.user.telegram_id:
            # Unreachable player: stamp it so the next tick stops reconsidering.
            booking.reminder_sent_at = datetime.now(timezone.utc)
            continue
        minutes = round((slot_start(booking.slot) - now).total_seconds() / 60)
        if await telegram.send_message(booking.user.telegram_id, reminder_text(booking, minutes)):
            booking.reminder_sent_at = datetime.now(timezone.utc)
            sent += 1
        # A failed send stays unstamped: the next tick retries until kickoff,
        # after which the booking falls out of the window on its own.
    await db.commit()
    return sent
