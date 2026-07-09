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
from app.schemas.field_owner import FieldOwnerCreate, FieldOwnerOut, FieldOwnerUpdate
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
async def block_user(user_id: int, db: DBSession):
    user = await _get_user(user_id, db)
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
async def set_role(user_id: int, role: UserRole, db: DBSession):
    user = await _get_user(user_id, db)
    user.role = role
    await db.commit()
    await db.refresh(user)
    return user


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(user_id: int, db: DBSession):
    user = await _get_user(user_id, db)
    await db.delete(user)
    await db.commit()


# --- Field owner profiles ---


@router.get("/field-owners", response_model=list[FieldOwnerOut])
async def list_field_owners(db: DBSession, limit: int = Query(100, le=200)):
    stmt = select(FieldOwner).order_by(FieldOwner.created_at.desc()).limit(limit)
    return list((await db.execute(stmt)).scalars().all())


async def _get_field_owner(field_owner_id: int, db) -> FieldOwner:
    owner = await db.get(FieldOwner, field_owner_id)
    if owner is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Field owner not found")
    return owner


@router.post(
    "/field-owners", response_model=FieldOwnerOut, status_code=status.HTTP_201_CREATED
)
async def create_field_owner(body: FieldOwnerCreate, db: DBSession):
    owner = FieldOwner(**body.model_dump())
    db.add(owner)
    await db.commit()
    await db.refresh(owner)
    return owner


@router.patch("/field-owners/{field_owner_id}", response_model=FieldOwnerOut)
async def update_field_owner(field_owner_id: int, body: FieldOwnerUpdate, db: DBSession):
    owner = await _get_field_owner(field_owner_id, db)
    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(owner, key, value)
    await db.commit()
    await db.refresh(owner)
    return owner


@router.post("/field-owners/{field_owner_id}/verify", response_model=FieldOwnerOut)
async def verify_field_owner(field_owner_id: int, db: DBSession):
    owner = await _get_field_owner(field_owner_id, db)
    owner.is_verified = True
    await db.commit()
    await db.refresh(owner)
    return owner


@router.delete("/field-owners/{field_owner_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_field_owner(field_owner_id: int, db: DBSession):
    owner = await _get_field_owner(field_owner_id, db)
    await db.delete(owner)
    await db.commit()


@router.post("/field-owners/{field_owner_id}/toggle-active", response_model=FieldOwnerOut)
async def toggle_field_owner_fields(field_owner_id: int, db: DBSession):
    owner = await _get_field_owner(field_owner_id, db)
    # Get all fields for this owner's user ID
    user_fields = await db.execute(select(Field).where(Field.owner_id == owner.user_id))
    fields = user_fields.scalars().all()
    
    # Toggle isActive based on first field or just turn them off
    # Actually just deactivate them if active, activate if inactive
    if not fields:
        return owner
    
    current_active = fields[0].is_active
    new_active = not current_active
    for f in fields:
        f.is_active = new_active
        
    await db.commit()
    return owner


# --- Subscription Payments ---

@router.get("/subscription-payments", response_model=list[SubscriptionPaymentAdminOut])
async def list_subscription_payments(db: DBSession, limit: int = Query(100, le=200)):
    stmt = select(SubscriptionPayment, User).join(User, SubscriptionPayment.owner_id == User.id).order_by(SubscriptionPayment.created_at.desc()).limit(limit)
    rows = (await db.execute(stmt)).all()
    
    result = []
    for payment, user in rows:
        payment_dict = payment.__dict__.copy()
        payment_dict["owner_phone"] = user.phone
        payment_dict["owner_name"] = user.full_name or user.first_name
        result.append(payment_dict)
    return result

@router.post("/subscription-payments/{payment_id}/approve", response_model=SubscriptionPaymentAdminOut)
async def approve_subscription_payment(payment_id: int, db: DBSession):
    stmt = select(SubscriptionPayment, User).join(User, SubscriptionPayment.owner_id == User.id).where(SubscriptionPayment.id == payment_id)
    row = (await db.execute(stmt)).first()
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Payment not found")
        
    payment, user = row
    payment.status = "approved"
    
    # Optionally, activate their fields
    user_fields = await db.execute(select(Field).where(Field.owner_id == user.id))
    for f in user_fields.scalars().all():
        f.is_active = True
        
    await db.commit()
    await db.refresh(payment)
    
    payment_dict = payment.__dict__.copy()
    payment_dict["owner_phone"] = user.phone
    payment_dict["owner_name"] = user.full_name or user.first_name
    return payment_dict

@router.post("/subscription-payments/{payment_id}/reject", response_model=SubscriptionPaymentAdminOut)
async def reject_subscription_payment(payment_id: int, db: DBSession):
    stmt = select(SubscriptionPayment, User).join(User, SubscriptionPayment.owner_id == User.id).where(SubscriptionPayment.id == payment_id)
    row = (await db.execute(stmt)).first()
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Payment not found")
        
    payment, user = row
    payment.status = "rejected"
    await db.commit()
    await db.refresh(payment)
    
    payment_dict = payment.__dict__.copy()
    payment_dict["owner_phone"] = user.phone
    payment_dict["owner_name"] = user.full_name or user.first_name
    return payment_dict


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
