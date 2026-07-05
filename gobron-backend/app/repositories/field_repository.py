"""Data access for Field, including the public listing with filters."""
from __future__ import annotations  # `list` method shadows builtin otherwise

from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.field import Field


class FieldRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get(self, field_id: int) -> Field | None:
        return await self.db.get(Field, field_id)

    async def list(
        self,
        *,
        search: str | None = None,
        min_price: Decimal | None = None,
        max_price: Decimal | None = None,
        min_rating: float | None = None,
        owner_id: int | None = None,
        active_only: bool = True,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Field]:
        stmt = select(Field)
        if active_only:
            stmt = stmt.where(Field.is_active.is_(True))
        if owner_id is not None:
            stmt = stmt.where(Field.owner_id == owner_id)
        if search:
            like = f"%{search}%"
            stmt = stmt.where(Field.name.ilike(like) | Field.address.ilike(like))
        if min_price is not None:
            stmt = stmt.where(Field.price_per_slot >= min_price)
        if max_price is not None:
            stmt = stmt.where(Field.price_per_slot <= max_price)
        if min_rating is not None:
            stmt = stmt.where(Field.rating >= min_rating)
        stmt = stmt.order_by(Field.rating.desc(), Field.id.desc()).limit(limit).offset(offset)
        return list((await self.db.execute(stmt)).scalars().all())
