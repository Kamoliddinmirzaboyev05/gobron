"""Owner + admin endpoints for Humo P2P payment intents."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select

from app.core.deps import DBSession, CurrentUser, require_role
from app.models.enums import UserRole
from app.models.payment_intent import PaymentIntent, UnmatchedTransaction
from app.models.user import User
from app.schemas.payment_intent import (
    PaymentIntentAdminOut,
    PaymentIntentCreate,
    PaymentIntentOut,
    PaymentIntentStartOut,
    UnmatchedTransactionOut,
)
from app.services.payment_intent_service import PaymentIntentService

router = APIRouter(tags=["payment-intents"])

_owner = require_role(UserRole.FIELD_OWNER, UserRole.SUPERADMIN)
_admin = require_role(UserRole.SUPERADMIN)


def _ttl_seconds(expires_at: datetime) -> int:
    now = datetime.now(timezone.utc)
    exp = expires_at if expires_at.tzinfo else expires_at.replace(tzinfo=timezone.utc)
    return max(0, int((exp - now).total_seconds()))


@router.post(
    "/owner/payment-intents",
    response_model=PaymentIntentStartOut,
    status_code=status.HTTP_201_CREATED,
)
async def start_payment(
    db: DBSession,
    user: User = Depends(_owner),
    body: PaymentIntentCreate | None = None,
):
    """Create (or reuse) a pending unique-amount payment for the owner."""
    svc = PaymentIntentService(db)
    base = body.base_amount if body else None
    intent, settings = await svc.start(user, base)
    return PaymentIntentStartOut(
        intent=intent,
        card_number=settings.card_number,
        card_holder=settings.card_holder,
        bank_name=settings.bank_name,
        ttl_seconds=_ttl_seconds(intent.expires_at),
    )


@router.get("/owner/payment-intents/active", response_model=PaymentIntentStartOut | None)
async def active_payment(db: DBSession, user: User = Depends(_owner)):
    svc = PaymentIntentService(db)
    intent = await svc.get_active(user)
    if intent is None:
        return None
    settings = await svc._settings()
    return PaymentIntentStartOut(
        intent=intent,
        card_number=settings.card_number,
        card_holder=settings.card_holder,
        bank_name=settings.bank_name,
        ttl_seconds=_ttl_seconds(intent.expires_at),
    )


@router.get("/owner/payment-intents", response_model=list[PaymentIntentOut])
async def list_my_intents(db: DBSession, user: User = Depends(_owner)):
    return await PaymentIntentService(db).list_for_owner(user)


@router.get("/admin/payment-intents", response_model=list[PaymentIntentAdminOut])
async def admin_list_intents(
    db: DBSession,
    _: User = Depends(_admin),
    status_filter: str | None = Query(None, alias="status"),
    limit: int = Query(100, le=200),
):
    await PaymentIntentService(db).expire_stale()
    stmt = (
        select(PaymentIntent, User)
        .join(User, PaymentIntent.owner_id == User.id)
        .order_by(PaymentIntent.created_at.desc())
        .limit(limit)
    )
    if status_filter:
        stmt = stmt.where(PaymentIntent.status == status_filter)
    rows = (await db.execute(stmt)).all()
    out: list[PaymentIntentAdminOut] = []
    for intent, owner in rows:
        out.append(
            PaymentIntentAdminOut(
                id=intent.id,
                owner_id=intent.owner_id,
                base_amount=intent.base_amount,
                unique_amount=intent.unique_amount,
                status=intent.status,
                expires_at=intent.expires_at,
                paid_at=intent.paid_at,
                created_at=intent.created_at,
                owner_phone=owner.phone,
                owner_name=owner.full_name or owner.first_name,
                matched_message=intent.matched_message,
            )
        )
    return out


@router.get("/admin/unmatched-transactions", response_model=list[UnmatchedTransactionOut])
async def admin_unmatched(
    db: DBSession,
    _: User = Depends(_admin),
    limit: int = Query(100, le=200),
):
    stmt = (
        select(UnmatchedTransaction)
        .order_by(UnmatchedTransaction.created_at.desc())
        .limit(limit)
    )
    return list((await db.execute(stmt)).scalars().all())
