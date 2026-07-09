"""Owner operations for venue, fields, manual bookings and stats."""
from datetime import date, datetime, time, timedelta
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models.enums import ManualBookingStatus, BookingStatus, SlotStatus
from app.models.field import Field
from app.models.manual_booking import ManualBooking
from app.models.booking import Booking
from app.models.slot import Slot
from app.models.user import User
from app.models.venue import Venue
from app.models.subscription_payment import SubscriptionPayment
from app.repositories.booking_repository import BookingRepository
from app.services.booking_notifications import send_confirmation
from app.services.slot_service import SlotService
from app.schemas.owner import (
    ManualBookingCreate,
    ManualBookingUpdate,
    OwnerBookingOut,
    OwnerFieldIn,
    OwnerStatsSummary,
    VenueIn,
)
from app.utils.clock import now_local, today_local


def time_ranges_overlap(
    first_start: time, first_end: time, second_start: time, second_end: time
) -> bool:
    return first_start < second_end and first_end > second_start


class OwnerService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_or_create_venue(self, owner: User) -> Venue:
        venue = await self._get_venue(owner.id)
        if venue is not None:
            return venue
        venue = Venue(
            owner_id=owner.id,
            name=owner.full_name or "Mening maydonim",
            opening_time=time(8, 0),
            closing_time=time(23, 0),
            working_days=[0, 1, 2, 3, 4, 5, 6],
            is_active=True,
        )
        self.db.add(venue)
        await self.db.commit()
        await self.db.refresh(venue)
        return venue

    async def upsert_venue(self, owner: User, body: VenueIn) -> Venue:
        venue = await self._get_venue(owner.id)
        if venue is None:
            venue = Venue(owner_id=owner.id)
            self.db.add(venue)
        for key, value in body.model_dump().items():
            setattr(venue, key, value)
        await self.db.commit()
        await self.db.refresh(venue)
        return venue

    async def list_fields(self, owner: User) -> list[Field]:
        venue = await self.get_or_create_venue(owner)
        stmt = select(Field).where(Field.owner_id == owner.id, Field.venue_id == venue.id)
        return list((await self.db.execute(stmt)).scalars().all())

    async def create_field(self, owner: User, body: OwnerFieldIn) -> Field:
        venue = await self.get_or_create_venue(owner)
        field = Field(
            owner_id=owner.id,
            venue_id=venue.id,
            name=body.name,
            size=body.size,
            phone=body.phone,
            surface_type=body.surface_type,
            price_per_hour=body.price_per_hour,
            price_per_slot=body.price_per_hour,
            images=body.images,
            opening_time=venue.opening_time,
            closing_time=venue.closing_time,
            working_days=venue.working_days,
            address=venue.address,
            latitude=venue.latitude,
            longitude=venue.longitude,
            is_active=body.is_active,
            booking_window_days=body.booking_window_days,
        )
        self.db.add(field)
        await self.db.commit()
        await self.db.refresh(field)
        # Players book against pre-generated Slot rows, not the field itself -
        # without this, a freshly created field has zero bookable slots until
        # someone with superadmin access finds the manual "generate" button.
        # booking_window_days counts today, generate_daily_slots counts days
        # *ahead* of today - so 3 days of availability is +2.
        await SlotService(self.db).generate_daily_slots(
            field, max(0, field.booking_window_days - 1)
        )
        await self.db.commit()
        return field

    async def update_field(
        self, owner: User, field_id: int, body: OwnerFieldIn
    ) -> Field:
        field = await self._get_owned_field(owner, field_id)
        venue = await self.get_or_create_venue(owner)
        for key, value in body.model_dump().items():
            setattr(field, key, value)
        field.price_per_slot = body.price_per_hour
        field.address = venue.address
        field.latitude = venue.latitude
        field.longitude = venue.longitude
        await self.db.commit()
        await self.db.refresh(field)
        # ponytail: re-extends the rolling slot window on every save so it
        # self-heals without owner action; a real fix is the daily cron job
        # slot_service.generate_daily_slots's own docstring says should exist.
        # booking_window_days counts today, generate_daily_slots counts days
        # *ahead* of today - so 3 days of availability is +2.
        await SlotService(self.db).generate_daily_slots(
            field, max(0, field.booking_window_days - 1)
        )
        await self.db.commit()
        return field

    async def delete_field(self, owner: User, field_id: int) -> None:
        field = await self._get_owned_field(owner, field_id)
        await self.db.delete(field)
        await self.db.commit()

    async def list_bookings(
        self, owner: User, day: date | None = None
    ) -> list[OwnerBookingOut]:
        """Owner's whole schedule: their own manual entries plus the bookings
        players made on their fields. These live in two different tables, so
        they're projected into one shape and merged here.
        """
        await BookingRepository(self.db).settle_finished_bookings()
        manual_stmt = select(ManualBooking).where(ManualBooking.owner_id == owner.id)
        if day is not None:
            manual_stmt = manual_stmt.where(ManualBooking.booking_date == day)
        manual = (await self.db.execute(manual_stmt)).scalars().all()

        player_stmt = (
            select(Booking)
            .join(Slot, Booking.slot_id == Slot.id)
            .join(Field, Slot.field_id == Field.id)
            .options(joinedload(Booking.user), joinedload(Booking.slot))
            .where(Field.owner_id == owner.id)
        )
        if day is not None:
            player_stmt = player_stmt.where(Slot.slot_date == day)
        player = (await self.db.execute(player_stmt)).scalars().all()

        rows = [
            OwnerBookingOut(
                id=b.id,
                source="manual",
                field_id=b.field_id,
                booking_date=b.booking_date,
                start_time=b.start_time,
                end_time=b.end_time,
                customer_name=b.customer_name,
                customer_phone=b.customer_phone,
                price=b.price,
                note=b.note,
                status=b.status.value,
            )
            for b in manual
        ] + [
            OwnerBookingOut(
                id=b.id,
                source="player",
                field_id=b.slot.field_id,
                booking_date=b.slot.slot_date,
                start_time=b.slot.start_time,
                end_time=b.slot.end_time,
                customer_name=b.user.full_name if b.user else None,
                customer_phone=b.user.phone if b.user else None,
                price=b.total_price,
                note=None,
                status=b.status.value,
            )
            for b in player
        ]
        rows.sort(key=lambda r: (r.booking_date, r.start_time))
        return rows

    async def extend_booking(
        self, owner: User, source: str, booking_id: int, minutes: int
    ) -> None:
        """Add 30 or 60 minutes to a booking that is happening right now.

        Slots are whole hours, so a 30-minute extension still consumes the
        whole next slot (nobody else can take half an hour) but is charged
        pro-rata - the trade the owner picked over splitting the slot grid.
        """
        if minutes not in (30, 60):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Faqat 30 yoki 60 daqiqa")

        now = now_local()
        if source == "player":
            await self._extend_player_booking(owner, booking_id, minutes, now)
        else:
            await self._extend_manual_booking(owner, booking_id, minutes, now)
        await self.db.commit()

    @staticmethod
    def _assert_in_progress(booking_date: date, start: time, end: time, now: datetime) -> None:
        if booking_date != now.date() or not (start <= now.time() < end):
            raise HTTPException(
                status.HTTP_409_CONFLICT, "Faqat davom etayotgan bandlikni uzaytirish mumkin"
            )

    async def _extend_player_booking(
        self, owner: User, booking_id: int, minutes: int, now: datetime
    ) -> None:
        stmt = (
            select(Booking)
            .join(Slot, Booking.slot_id == Slot.id)
            .join(Field, Slot.field_id == Field.id)
            .options(joinedload(Booking.slot))
            .where(Field.owner_id == owner.id, Booking.id == booking_id)
        )
        booking = (await self.db.execute(stmt)).scalar_one_or_none()
        if booking is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Bandlik topilmadi")
        if booking.status != BookingStatus.CONFIRMED:
            raise HTTPException(status.HTTP_409_CONFLICT, "Bandlik tasdiqlanmagan")

        slot = booking.slot
        self._assert_in_progress(slot.slot_date, slot.start_time, slot.end_time, now)

        next_slot = (
            await self.db.execute(
                select(Slot).where(
                    Slot.field_id == slot.field_id,
                    Slot.slot_date == slot.slot_date,
                    Slot.start_time == slot.end_time,
                )
            )
        ).scalar_one_or_none()
        if next_slot is None or next_slot.status != SlotStatus.AVAILABLE:
            raise HTTPException(status.HTTP_409_CONFLICT, "Keyingi vaqt bo'sh emas")

        next_slot.status = SlotStatus.BOOKED
        self.db.add(
            Booking(
                user_id=booking.user_id,
                slot_id=next_slot.id,
                status=BookingStatus.CONFIRMED,
                total_price=self._prorate(next_slot.price, minutes),
            )
        )

    async def _extend_manual_booking(
        self, owner: User, booking_id: int, minutes: int, now: datetime
    ) -> None:
        booking = await self._get_owned_booking(owner, booking_id)
        if booking.status != ManualBookingStatus.BOOKED:
            raise HTTPException(status.HTTP_409_CONFLICT, "Bandlik faol emas")
        self._assert_in_progress(booking.booking_date, booking.start_time, booking.end_time, now)

        end_dt = datetime.combine(booking.booking_date, booking.end_time) + timedelta(
            minutes=minutes
        )
        if end_dt.date() != booking.booking_date:
            raise HTTPException(status.HTTP_409_CONFLICT, "Ish vaqti tugadi")
        new_end = end_dt.time()

        field = await self._get_owned_field(owner, booking.field_id)
        if new_end > field.closing_time:
            raise HTTPException(status.HTTP_409_CONFLICT, "Ish vaqti tugadi")
        await self._ensure_no_overlap(
            owner.id,
            booking.field_id,
            booking.booking_date,
            booking.end_time,
            new_end,
            exclude_booking_id=booking.id,
        )

        booking.end_time = new_end
        booking.price += self._prorate(field.price_per_hour, minutes)

    @staticmethod
    def _prorate(hourly_price: Decimal, minutes: int) -> Decimal:
        return (Decimal(hourly_price) * Decimal(minutes) / Decimal(60)).quantize(Decimal("0.01"))

    async def create_manual_booking(
        self, owner: User, body: ManualBookingCreate
    ) -> ManualBooking:
        if body.start_time >= body.end_time:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid time range")
        await self._get_owned_field(owner, body.field_id)
        await self._ensure_no_overlap(
            owner.id, body.field_id, body.booking_date, body.start_time, body.end_time
        )
        booking = ManualBooking(owner_id=owner.id, **body.model_dump())
        self.db.add(booking)
        await self.db.commit()
        await self.db.refresh(booking)
        return booking

    async def update_booking(
        self, owner: User, booking_id: int, body: ManualBookingUpdate
    ) -> ManualBooking:
        booking = await self._get_owned_booking(owner, booking_id)
        data = body.model_dump(exclude_unset=True)
        next_date = data.get("booking_date", booking.booking_date)
        next_start = data.get("start_time", booking.start_time)
        next_end = data.get("end_time", booking.end_time)
        if next_start >= next_end:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid time range")
        await self._ensure_no_overlap(
            owner.id,
            booking.field_id,
            next_date,
            next_start,
            next_end,
            exclude_booking_id=booking.id,
        )
        for key, value in data.items():
            setattr(booking, key, value)
        await self.db.commit()
        await self.db.refresh(booking)
        return booking

    async def cancel_booking(self, owner: User, booking_id: int) -> ManualBooking:
        booking = await self._get_owned_booking(owner, booking_id)
        booking.status = ManualBookingStatus.CANCELLED
        await self.db.commit()
        await self.db.refresh(booking)
        return booking

    async def complete_booking(self, owner: User, booking_id: int) -> ManualBooking:
        booking = await self._get_owned_booking(owner, booking_id)
        booking.status = ManualBookingStatus.COMPLETED
        await self.db.commit()
        await self.db.refresh(booking)
        return booking

    async def list_booking_requests(self, owner: User) -> list[Booking]:
        # A request for a slot that already passed is dead; don't offer
        # accept/reject on it.
        await BookingRepository(self.db).settle_finished_bookings()
        stmt = (
            select(Booking)
            .join(Slot, Booking.slot_id == Slot.id)
            .join(Field, Slot.field_id == Field.id)
            .options(joinedload(Booking.user), joinedload(Booking.slot))
            .where(
                Field.owner_id == owner.id,
                Booking.status == BookingStatus.PENDING,
            )
            .order_by(Booking.created_at.desc())
        )
        return list((await self.db.execute(stmt)).scalars().all())

    async def _get_owned_booking_request(self, owner: User, booking_id: int) -> Booking:
        stmt = (
            select(Booking)
            .join(Slot, Booking.slot_id == Slot.id)
            .join(Field, Slot.field_id == Field.id)
            # slot.field is loaded for the confirmation message's field name.
            .options(
                joinedload(Booking.user),
                joinedload(Booking.slot).joinedload(Slot.field),
            )
            .where(Field.owner_id == owner.id, Booking.id == booking_id)
        )
        booking = (await self.db.execute(stmt)).scalar_one_or_none()
        if not booking:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Booking request not found")
        return booking

    async def accept_booking_request(self, owner: User, booking_id: int) -> Booking:
        booking = await self._get_owned_booking_request(owner, booking_id)
        booking.status = BookingStatus.CONFIRMED
        await self.db.commit()
        # AdminBookingOut serializes .slot/.user; refresh() expires them, so
        # re-load eagerly rather than letting pydantic trigger a lazy load
        # outside async context (MissingGreenlet -> 500 after a successful write).
        booking = await self._get_owned_booking_request(owner, booking_id)
        # After the commit, never before: the booking is confirmed whether or not
        # Telegram answers, so send_confirmation swallows its own failures.
        await send_confirmation(booking)
        return booking

    async def reject_booking_request(self, owner: User, booking_id: int) -> Booking:
        booking = await self._get_owned_booking_request(owner, booking_id)
        booking.status = BookingStatus.CANCELLED
        if booking.slot:
            booking.slot.status = SlotStatus.AVAILABLE
        await self.db.commit()
        return await self._get_owned_booking_request(owner, booking_id)

    async def stats_summary(self, owner: User) -> OwnerStatsSummary:
        today = today_local()
        week_start = today - timedelta(days=today.weekday())
        month_start = today.replace(day=1)
        return OwnerStatsSummary(
            today_revenue=await self._sum_revenue(owner.id, today, today),
            weekly_revenue=await self._sum_revenue(owner.id, week_start, today),
            monthly_revenue=await self._sum_revenue(owner.id, month_start, today),
            today_booking_count=await self._count_bookings(owner.id, today, today),
            weekly_booking_count=await self._count_bookings(owner.id, week_start, today),
            monthly_booking_count=await self._count_bookings(owner.id, month_start, today),
            top_field_name=await self._top_field_name(owner.id, month_start, today),
        )

    async def _get_venue(self, owner_id: int) -> Venue | None:
        stmt = select(Venue).where(Venue.owner_id == owner_id)
        return (await self.db.execute(stmt)).scalar_one_or_none()

    async def _get_owned_field(self, owner: User, field_id: int) -> Field:
        stmt = select(Field).where(Field.id == field_id, Field.owner_id == owner.id)
        field = (await self.db.execute(stmt)).scalar_one_or_none()
        if field is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Field not found")
        return field

    async def _get_owned_booking(self, owner: User, booking_id: int) -> ManualBooking:
        stmt = select(ManualBooking).where(
            ManualBooking.id == booking_id,
            ManualBooking.owner_id == owner.id,
        )
        booking = (await self.db.execute(stmt)).scalar_one_or_none()
        if booking is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Booking not found")
        return booking

    async def _ensure_no_overlap(
        self,
        owner_id: int,
        field_id: int,
        booking_date: date,
        start_time: time,
        end_time: time,
        exclude_booking_id: int | None = None,
    ) -> None:
        stmt = select(ManualBooking).where(
            ManualBooking.owner_id == owner_id,
            ManualBooking.field_id == field_id,
            ManualBooking.booking_date == booking_date,
            ManualBooking.status == ManualBookingStatus.BOOKED,
            ManualBooking.start_time < end_time,
            ManualBooking.end_time > start_time,
        )
        if exclude_booking_id is not None:
            stmt = stmt.where(ManualBooking.id != exclude_booking_id)
        exists = (await self.db.execute(stmt)).scalar_one_or_none()
        if exists is not None:
            raise HTTPException(
                status.HTTP_409_CONFLICT, "Time range is already booked"
            )

    async def _sum_revenue(
        self, owner_id: int, start_date: date, end_date: date
    ) -> Decimal:
        manual = select(func.coalesce(func.sum(ManualBooking.price), 0)).where(
            self._active_booking_period(owner_id, start_date, end_date)
        )
        player = (
            select(func.coalesce(func.sum(Booking.total_price), 0))
            .join(Slot, Booking.slot_id == Slot.id)
            .join(Field, Slot.field_id == Field.id)
            .where(self._earned_player_booking_period(owner_id, start_date, end_date))
        )
        manual_total = (await self.db.execute(manual)).scalar_one()
        player_total = (await self.db.execute(player)).scalar_one()
        return Decimal(str(manual_total)) + Decimal(str(player_total))

    async def _count_bookings(
        self, owner_id: int, start_date: date, end_date: date
    ) -> int:
        manual = select(func.count(ManualBooking.id)).where(
            self._active_booking_period(owner_id, start_date, end_date)
        )
        player = (
            select(func.count(Booking.id))
            .join(Slot, Booking.slot_id == Slot.id)
            .join(Field, Slot.field_id == Field.id)
            .where(self._earned_player_booking_period(owner_id, start_date, end_date))
        )
        return int((await self.db.execute(manual)).scalar_one()) + int(
            (await self.db.execute(player)).scalar_one()
        )

    async def _top_field_name(
        self, owner_id: int, start_date: date, end_date: date
    ) -> str | None:
        manual = (
            select(Field.name, func.count(ManualBooking.id).label("n"))
            .join(ManualBooking, ManualBooking.field_id == Field.id)
            .where(self._active_booking_period(owner_id, start_date, end_date))
            .group_by(Field.id, Field.name)
        )
        player = (
            select(Field.name, func.count(Booking.id).label("n"))
            .select_from(Booking)
            .join(Slot, Booking.slot_id == Slot.id)
            .join(Field, Slot.field_id == Field.id)
            .where(self._earned_player_booking_period(owner_id, start_date, end_date))
            .group_by(Field.id, Field.name)
        )
        totals: dict[str, int] = {}
        for stmt in (manual, player):
            for name, count in (await self.db.execute(stmt)).all():
                totals[name] = totals.get(name, 0) + count
        return max(totals, key=totals.get) if totals else None

    def _active_booking_period(self, owner_id: int, start_date: date, end_date: date):
        return and_(
            ManualBooking.owner_id == owner_id,
            ManualBooking.booking_date >= start_date,
            ManualBooking.booking_date <= end_date,
            ManualBooking.status != ManualBookingStatus.CANCELLED,
        )

    def _earned_player_booking_period(
        self, owner_id: int, start_date: date, end_date: date
    ):
        """Player bookings that count as the owner's earnings.

        Unlike manual bookings (owner types them in, so they're real the moment
        they exist), a player booking starts as PENDING and is only money once
        the owner accepts it - so PENDING is excluded here, not just CANCELLED.
        """
        return and_(
            Field.owner_id == owner_id,
            Slot.slot_date >= start_date,
            Slot.slot_date <= end_date,
            Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.COMPLETED]),
        )

    async def list_subscription_payments(self, owner: User) -> list[SubscriptionPayment]:
        stmt = select(SubscriptionPayment).where(SubscriptionPayment.owner_id == owner.id).order_by(SubscriptionPayment.created_at.desc())
        return list((await self.db.execute(stmt)).scalars().all())

    async def create_subscription_payment(self, owner: User, amount: Decimal, receipt_image: str) -> SubscriptionPayment:
        payment = SubscriptionPayment(owner_id=owner.id, amount=amount, receipt_image=receipt_image)
        self.db.add(payment)
        await self.db.commit()
        await self.db.refresh(payment)
        return payment
