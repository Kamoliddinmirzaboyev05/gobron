"""Field endpoints — public listing/detail + owner/admin CRUD."""
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.models.user import User
from app.core.deps import DBSession, require_role
from app.models.enums import UserRole
from app.models.field import Field
from app.repositories.field_repository import FieldRepository, FieldSort
from app.schemas.field import FieldCreate, FieldOut, FieldUpdate

router = APIRouter(prefix="/fields", tags=["fields"])

_owner_or_admin = require_role(UserRole.FIELD_OWNER, UserRole.SUPERADMIN)


@router.get("", response_model=list[FieldOut])
async def list_fields(
    db: DBSession,
    search: str | None = None,
    min_price: Decimal | None = None,
    max_price: Decimal | None = None,
    min_rating: float | None = None,
    available_today: bool = False,
    sort: FieldSort = "rating",
    limit: int = Query(50, le=100),
    offset: int = 0,
):
    return await FieldRepository(db).list(
        search=search,
        min_price=min_price,
        max_price=max_price,
        min_rating=min_rating,
        available_today=available_today,
        sort=sort,
        limit=limit,
        offset=offset,
    )


@router.get("/{field_id}", response_model=FieldOut)
async def get_field(field_id: int, db: DBSession):
    field = await FieldRepository(db).get(field_id)
    if field is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Field not found")
    return field


@router.post("", response_model=FieldOut, status_code=status.HTTP_201_CREATED)
async def create_field(
    body: FieldCreate, db: DBSession, user: User = Depends(_owner_or_admin)
):
    field = Field(owner_id=user.id, **body.model_dump())
    db.add(field)
    await db.commit()
    await db.refresh(field)
    return field


async def _load_owned(field_id: int, db, user) -> Field:
    field = await FieldRepository(db).get(field_id)
    if field is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Field not found")
    if user.role != UserRole.SUPERADMIN and field.owner_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your field")
    return field


@router.patch("/{field_id}", response_model=FieldOut)
async def update_field(
    field_id: int,
    body: FieldUpdate,
    db: DBSession,
    user: User = Depends(_owner_or_admin),
):
    field = await _load_owned(field_id, db, user)
    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(field, key, value)
    await db.commit()
    await db.refresh(field)
    return field


@router.delete("/{field_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_field(
    field_id: int, db: DBSession, user: User = Depends(_owner_or_admin)
):
    """Soft-delete: deactivate so booking history is preserved."""
    field = await _load_owned(field_id, db, user)
    field.is_active = False
    await db.commit()
