"""Superadmin endpoints — manage users/admins and send bot broadcasts.

Every route here is gated to the SUPERADMIN role.
"""
from datetime import date

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.core.deps import DBSession, require_role
from app.models.broadcast import Broadcast
from app.models.enums import BookingStatus, UserRole
from app.models.field_owner import FieldOwner
from app.models.user import User
from app.repositories.booking_repository import BookingRepository
from app.repositories.user_repository import UserRepository
from app.schemas.booking import AdminBookingOut
from app.schemas.broadcast import BroadcastCreate, BroadcastOut
from app.schemas.field_owner import FieldOwnerCreate, FieldOwnerOut, FieldOwnerUpdate
from app.schemas.user import UserOut
from app.services.broadcast_service import BroadcastService

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
