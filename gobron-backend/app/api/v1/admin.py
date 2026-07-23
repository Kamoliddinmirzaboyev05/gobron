"""Superadmin endpoints — manage users/admins and send bot broadcasts.

Every route here is gated to the SUPERADMIN role.
"""
from datetime import date

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.core.deps import DBSession, require_role
from app.models.banner import Banner
from app.models.broadcast import Broadcast
from app.models.enums import BookingStatus, UserRole
from app.models.field_owner import FieldOwner
from app.models.user import User
from app.repositories.booking_repository import BookingRepository
from app.repositories.user_repository import UserRepository
from app.schemas.banner import BannerCreate, BannerOut, BannerUpdate
from app.schemas.booking import AdminBookingOut
from app.schemas.broadcast import BroadcastCreate, BroadcastOut
from app.schemas.field_owner import (
    FieldOwnerAdminOut,
    FieldOwnerCreate,
    FieldOwnerOut,
    FieldOwnerUpdate,
)
from app.schemas.user import UserOut
from app.schemas.subscription import SubscriptionPaymentAdminOut
from app.services.broadcast_service import BroadcastService
from app.models.subscription_payment import SubscriptionPayment
from app.models.field import Field

_superadmin = require_role(UserRole.SUPERADMIN)

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(_superadmin)],
)

# --- Users & admins ---


@router.get("/users", response_model=list[UserOut])
async def list_users(
    db: DBSession,
    role: UserRole | None = None,
    search: str | None = None,
    blocked: bool | None = None,
    limit: int = Query(100, le=200),
    offset: int = 0,
):
    return await UserRepository(db).list(
        role=role, search=search, blocked=blocked, limit=limit, offset=offset
    )


async def _get_user(user_id: int, db):
    user = await UserRepository(db).get(user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    return user


@router.get("/users/{user_id}", response_model=UserOut)
async def get_user(user_id: int, db: DBSession):
    return await _get_user(user_id, db)


@router.post("/users/{user_id}/block", response_model=UserOut)
async def block_user(
    user_id: int,
    db: DBSession,
    actor: User = Depends(_superadmin),
):
    user = await _get_user(user_id, db)
    if user.id == actor.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "O'zingizni bloklab bo'lmaydi")
    if user.role == UserRole.SUPERADMIN:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Superadminni bloklab bo'lmaydi")
    user.is_blocked = True
    await db.commit()
    await db.refresh(user)
    return user


@router.post("/users/{user_id}/unblock", response_model=UserOut)
async def unblock_user(user_id: int, db: DBSession):
    user = await _get_user(user_id, db)
    user.is_blocked = False
    await db.commit()
    await db.refresh(user)
    return user


@router.patch("/users/{user_id}/role", response_model=UserOut)
async def set_role(
    user_id: int,
    role: UserRole,
    db: DBSession,
    actor: User = Depends(_superadmin),
):
    user = await _get_user(user_id, db)
    if user.id == actor.id and role != UserRole.SUPERADMIN:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "O'zingizning superadmin rolini olib tashlab bo'lmaydi"
        )
    user.role = role
    await db.commit()
    await db.refresh(user)
    return user


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    db: DBSession,
    actor: User = Depends(_superadmin),
):
    user = await _get_user(user_id, db)
    if user.id == actor.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "O'zingizni o'chirib bo'lmaydi")
    if user.role == UserRole.SUPERADMIN:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Superadminni o'chirib bo'lmaydi")
    await db.delete(user)
    await db.commit()


# --- Field owner profiles ---


async def _ensure_owner_profiles(db) -> None:
    """Backfill field_owners rows for users with FIELD_OWNER role.

    Phone-register historically created only the User row; the admin list
    reads field_owners, so without this the page looks empty.
    """
    existing_user_ids = set(
        (
            await db.execute(select(FieldOwner.user_id))
        )
        .scalars()
        .all()
    )
    owners = (
        await db.execute(select(User).where(User.role == UserRole.FIELD_OWNER))
    ).scalars().all()
    created = False
    for user in owners:
        if user.id in existing_user_ids:
            continue
        name = (user.full_name or user.first_name or user.phone or f"Owner #{user.id}").strip()
        db.add(
            FieldOwner(
                user_id=user.id,
                business_name=name[:150],
                contact_phone=user.phone,
                is_verified=False,
            )
        )
        created = True
    if created:
        await db.commit()


async def _owner_admin_card(db, profile: FieldOwner, user: User | None) -> FieldOwnerAdminOut:
    fields = list(
        (
            await db.execute(
                select(Field)
                .where(Field.owner_id == profile.user_id)
                .order_by(Field.id.desc())
            )
        )
        .scalars()
        .all()
    )
    u = user
    return FieldOwnerAdminOut(
        id=profile.id,
        user_id=profile.user_id,
        business_name=profile.business_name,
        contact_phone=profile.contact_phone,
        is_verified=profile.is_verified,
        created_at=profile.created_at,
        full_name=(u.full_name if u else "") or profile.business_name,
        phone=(u.phone if u else None) or profile.contact_phone,
        is_blocked=bool(u.is_blocked) if u else False,
        is_active=bool(u.is_active) if u else True,
        fields_count=len(fields),
        active_fields_count=sum(1 for f in fields if f.is_active),
        field_names=[f.name for f in fields[:5]],
    )


@router.get("/field-owners", response_model=list[FieldOwnerAdminOut])
async def list_field_owners(db: DBSession, limit: int = Query(100, le=200)):
    await _ensure_owner_profiles(db)
    stmt = (
        select(FieldOwner, User)
        .outerjoin(User, User.id == FieldOwner.user_id)
        .order_by(FieldOwner.created_at.desc())
        .limit(limit)
    )
    rows = (await db.execute(stmt)).all()
    return [await _owner_admin_card(db, profile, user) for profile, user in rows]


async def _get_field_owner(field_owner_id: int, db) -> FieldOwner:
    owner = await db.get(FieldOwner, field_owner_id)
    if owner is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Field owner not found")
    return owner


@router.post(
    "/field-owners", response_model=FieldOwnerAdminOut, status_code=status.HTTP_201_CREATED
)
async def create_field_owner(body: FieldOwnerCreate, db: DBSession):
    user = await db.get(User, body.user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    if user.role != UserRole.FIELD_OWNER:
        user.role = UserRole.FIELD_OWNER
    existing = (
        await db.execute(select(FieldOwner).where(FieldOwner.user_id == body.user_id))
    ).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Bu foydalanuvchida profil bor")
    owner = FieldOwner(**body.model_dump())
    db.add(owner)
    await db.commit()
    await db.refresh(owner)
    return await _owner_admin_card(db, owner, user)


@router.patch("/field-owners/{field_owner_id}", response_model=FieldOwnerAdminOut)
async def update_field_owner(field_owner_id: int, body: FieldOwnerUpdate, db: DBSession):
    owner = await _get_field_owner(field_owner_id, db)
    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(owner, key, value)
    await db.commit()
    await db.refresh(owner)
    user = await db.get(User, owner.user_id)
    return await _owner_admin_card(db, owner, user)


@router.post("/field-owners/{field_owner_id}/verify", response_model=FieldOwnerAdminOut)
async def verify_field_owner(field_owner_id: int, db: DBSession):
    owner = await _get_field_owner(field_owner_id, db)
    owner.is_verified = True
    await db.commit()
    await db.refresh(owner)
    user = await db.get(User, owner.user_id)
    return await _owner_admin_card(db, owner, user)


@router.delete("/field-owners/{field_owner_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_field_owner(field_owner_id: int, db: DBSession):
    owner = await _get_field_owner(field_owner_id, db)
    await db.delete(owner)
    await db.commit()


@router.post(
    "/field-owners/{field_owner_id}/toggle-active", response_model=FieldOwnerAdminOut
)
async def toggle_field_owner_fields(field_owner_id: int, db: DBSession):
    owner = await _get_field_owner(field_owner_id, db)
    user_fields = await db.execute(select(Field).where(Field.owner_id == owner.user_id))
    fields = list(user_fields.scalars().all())
    if fields:
        new_active = not fields[0].is_active
        for f in fields:
            f.is_active = new_active
        await db.commit()
    user = await db.get(User, owner.user_id)
    return await _owner_admin_card(db, owner, user)


# --- Subscription Payments ---

@router.get("/subscription-payments", response_model=list[SubscriptionPaymentAdminOut])
async def list_subscription_payments(db: DBSession, limit: int = Query(100, le=200)):
    stmt = (
        select(SubscriptionPayment, User)
        .join(User, SubscriptionPayment.owner_id == User.id)
        .order_by(SubscriptionPayment.created_at.desc())
        .limit(limit)
    )
    rows = (await db.execute(stmt)).all()
    return [_payment_admin_dict(payment, user) for payment, user in rows]

def _payment_admin_dict(payment: SubscriptionPayment, user: User) -> dict:
    return {
        "id": payment.id,
        "owner_id": payment.owner_id,
        "amount": payment.amount,
        "receipt_image": payment.receipt_image,
        "status": payment.status,
        "created_at": payment.created_at,
        "updated_at": payment.updated_at,
        "owner_phone": user.phone,
        "owner_name": user.full_name or user.first_name,
    }


@router.post("/subscription-payments/{payment_id}/approve", response_model=SubscriptionPaymentAdminOut)
async def approve_subscription_payment(payment_id: int, db: DBSession):
    stmt = (
        select(SubscriptionPayment, User)
        .join(User, SubscriptionPayment.owner_id == User.id)
        .where(SubscriptionPayment.id == payment_id)
    )
    row = (await db.execute(stmt)).first()
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Payment not found")

    payment, user = row
    if payment.status == "approved":
        return _payment_admin_dict(payment, user)
    if payment.status == "rejected":
        raise HTTPException(status.HTTP_409_CONFLICT, "Rad etilgan to'lovni tasdiqlab bo'lmaydi")

    payment.status = "approved"
    # Unlock the owner's fields after subscription is paid.
    user_fields = await db.execute(select(Field).where(Field.owner_id == user.id))
    for f in user_fields.scalars().all():
        f.is_active = True

    await db.commit()
    await db.refresh(payment)
    return _payment_admin_dict(payment, user)


@router.post("/subscription-payments/{payment_id}/reject", response_model=SubscriptionPaymentAdminOut)
async def reject_subscription_payment(payment_id: int, db: DBSession):
    stmt = (
        select(SubscriptionPayment, User)
        .join(User, SubscriptionPayment.owner_id == User.id)
        .where(SubscriptionPayment.id == payment_id)
    )
    row = (await db.execute(stmt)).first()
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Payment not found")

    payment, user = row
    if payment.status == "approved":
        raise HTTPException(status.HTTP_409_CONFLICT, "Tasdiqlangan to'lovni rad etib bo'lmaydi")
    payment.status = "rejected"
    await db.commit()
    await db.refresh(payment)
    return _payment_admin_dict(payment, user)


# --- Bookings (all users) ---


@router.get("/bookings", response_model=list[AdminBookingOut])
async def list_all_bookings(
    db: DBSession,
    status_filter: BookingStatus | None = None,
    field_id: int | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    limit: int = Query(100, le=200),
    offset: int = 0,
):
    return await BookingRepository(db).list_all(
        status=status_filter,
        field_id=field_id,
        date_from=date_from,
        date_to=date_to,
        limit=limit,
        offset=offset,
    )


# --- Bot broadcasts ---


@router.get("/broadcasts", response_model=list[BroadcastOut])
async def list_broadcasts(db: DBSession, limit: int = Query(50, le=100)):
    stmt = select(Broadcast).order_by(Broadcast.created_at.desc()).limit(limit)
    return list((await db.execute(stmt)).scalars().all())


async def _run_broadcast(broadcast_id: int) -> None:
    """Background task: uses its own session (request session is closed)."""
    async with AsyncSessionLocal() as session:
        await BroadcastService(session).send(broadcast_id)


@router.post(
    "/broadcasts", response_model=BroadcastOut, status_code=status.HTTP_201_CREATED
)
async def create_broadcast(
    body: BroadcastCreate,
    db: DBSession,
    background: BackgroundTasks,
    user: User = Depends(_superadmin),
    send_now: bool = True,
):
    """Create a post (image optional) and, by default, start delivery."""
    bc = Broadcast(
        created_by=user.id,
        text=body.text,
        image_url=body.image_url,
        audience=body.audience,
    )
    db.add(bc)
    await db.commit()
    await db.refresh(bc)
    if send_now:
        background.add_task(_run_broadcast, bc.id)
    return bc


@router.get("/broadcasts/{broadcast_id}", response_model=BroadcastOut)
async def get_broadcast(broadcast_id: int, db: DBSession):
    bc = await db.get(Broadcast, broadcast_id)
    if bc is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Broadcast not found")
    return bc


# --- Banners (user-web hero carousel) ---


@router.get("/banners", response_model=list[BannerOut])
async def list_all_banners(db: DBSession):
    stmt = select(Banner).order_by(Banner.sort_order, Banner.id)
    return list((await db.execute(stmt)).scalars().all())


@router.post("/banners", response_model=BannerOut, status_code=status.HTTP_201_CREATED)
async def create_banner(body: BannerCreate, db: DBSession):
    banner = Banner(**body.model_dump())
    db.add(banner)
    await db.commit()
    await db.refresh(banner)
    return banner


@router.patch("/banners/{banner_id}", response_model=BannerOut)
async def update_banner(banner_id: int, body: BannerUpdate, db: DBSession):
    banner = await db.get(Banner, banner_id)
    if banner is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Banner not found")
    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(banner, key, value)
    await db.commit()
    await db.refresh(banner)
    return banner


@router.delete("/banners/{banner_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_banner(banner_id: int, db: DBSession):
    banner = await db.get(Banner, banner_id)
    if banner is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Banner not found")
    await db.delete(banner)
    await db.commit()
