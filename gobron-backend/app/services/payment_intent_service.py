"""Create / expire / settle unique-amount payment intents."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.field import Field
from app.models.payment_intent import PaymentIntent
from app.models.payment_settings import PaymentSettings
from app.models.subscription_payment import SubscriptionPayment
from app.models.user import User
from app.utils.amount_generator import generate_unique_amount

_ROW_ID = 1
_TTL_MINUTES = 15


class PaymentIntentService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _settings(self) -> PaymentSettings:
        row = await self.db.get(PaymentSettings, _ROW_ID)
        if row is None:
            row = PaymentSettings(
                id=_ROW_ID,
                card_number="",
                card_holder="",
                subscription_amount=Decimal("50000"),
            )
            self.db.add(row)
            await self.db.commit()
            await self.db.refresh(row)
        return row

    async def expire_stale(self) -> int:
        """Mark timed-out pending intents as expired. Idempotent."""
        now = datetime.now(timezone.utc)
        result = await self.db.execute(
            update(PaymentIntent)
            .where(
                PaymentIntent.status == "pending",
                PaymentIntent.expires_at < now,
            )
            .values(status="expired")
        )
        await self.db.commit()
        return result.rowcount or 0

    async def get_active(self, owner: User) -> PaymentIntent | None:
        await self.expire_stale()
        now = datetime.now(timezone.utc)
        stmt = (
            select(PaymentIntent)
            .where(
                PaymentIntent.owner_id == owner.id,
                PaymentIntent.status == "pending",
                PaymentIntent.expires_at > now,
            )
            .order_by(PaymentIntent.created_at.desc())
            .limit(1)
        )
        return (await self.db.execute(stmt)).scalar_one_or_none()

    async def list_for_owner(self, owner: User, limit: int = 50) -> list[PaymentIntent]:
        await self.expire_stale()
        stmt = (
            select(PaymentIntent)
            .where(PaymentIntent.owner_id == owner.id)
            .order_by(PaymentIntent.created_at.desc())
            .limit(limit)
        )
        return list((await self.db.execute(stmt)).scalars().all())

    async def start(
        self, owner: User, base_amount: int | None = None
    ) -> tuple[PaymentIntent, PaymentSettings]:
        """Create a new pending intent with a unique amount, or return existing active one."""
        settings_row = await self._settings()
        if not settings_row.card_number:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "To'lov kartasi sozlanmagan. Superadmin bilan bog'laning.",
            )

        existing = await self.get_active(owner)
        if existing is not None:
            return existing, settings_row

        base = base_amount
        if base is None:
            base = int(settings_row.subscription_amount)

        # Collect taken amounts among still-pending intents.
        now = datetime.now(timezone.utc)
        taken_rows = (
            await self.db.execute(
                select(PaymentIntent.unique_amount).where(
                    PaymentIntent.status == "pending",
                    PaymentIntent.expires_at > now,
                )
            )
        ).scalars().all()
        taken = set(taken_rows)

        # Retry a few times if partial unique index races.
        last_err: Exception | None = None
        for _ in range(5):
            try:
                unique = generate_unique_amount(base, taken)
                intent = PaymentIntent(
                    owner_id=owner.id,
                    base_amount=base,
                    unique_amount=unique,
                    status="pending",
                    expires_at=now + timedelta(minutes=_TTL_MINUTES),
                )
                self.db.add(intent)
                await self.db.commit()
                await self.db.refresh(intent)
                return intent, settings_row
            except (ValueError, IntegrityError) as exc:
                await self.db.rollback()
                taken.add(base + len(taken) + 1)  # nudge set
                last_err = exc
                # Refresh taken set after race.
                taken_rows = (
                    await self.db.execute(
                        select(PaymentIntent.unique_amount).where(
                            PaymentIntent.status == "pending",
                            PaymentIntent.expires_at > now,
                        )
                    )
                ).scalars().all()
                taken = set(taken_rows)

        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Unikal summa yaratib bo'lmadi. Qayta urinib ko'ring.",
        ) from last_err

    async def mark_paid_side_effects(self, intent: PaymentIntent) -> None:
        """Activate owner fields + record an approved subscription payment row.

        Called after the matcher (or admin) sets intent.status = paid.
        """
        fields = (
            await self.db.execute(select(Field).where(Field.owner_id == intent.owner_id))
        ).scalars().all()
        for f in fields:
            f.is_active = True

        self.db.add(
            SubscriptionPayment(
                owner_id=intent.owner_id,
                amount=Decimal(intent.unique_amount),
                receipt_image=f"humo://intent/{intent.id}",
                status="approved",
            )
        )
        await self.db.commit()
