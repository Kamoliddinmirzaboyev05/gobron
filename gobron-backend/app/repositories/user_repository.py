"""Data access for User. Only the queries the services actually need."""
from __future__ import annotations  # `list` method shadows builtin otherwise

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import UserRole
from app.models.user import User


class UserRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get(self, user_id: int) -> User | None:
        return await self.db.get(User, user_id)

    async def get_by_phone(self, phone: str) -> User | None:
        res = await self.db.execute(select(User).where(User.phone == phone))
        return res.scalar_one_or_none()

    async def get_by_telegram_id(self, telegram_id: int) -> User | None:
        res = await self.db.execute(
            select(User).where(User.telegram_id == telegram_id)
        )
        return res.scalar_one_or_none()

    async def list(
        self,
        *,
        role: UserRole | None = None,
        search: str | None = None,
        blocked: bool | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[User]:
        """Admin listing with filters over users and admins alike."""
        stmt = select(User)
        if role is not None:
            stmt = stmt.where(User.role == role)
        if blocked is not None:
            stmt = stmt.where(User.is_blocked.is_(blocked))
        if search:
            like = f"%{search}%"
            stmt = stmt.where(
                User.phone.ilike(like)
                | User.first_name.ilike(like)
                | User.last_name.ilike(like)
            )
        stmt = stmt.order_by(User.created_at.desc()).limit(limit).offset(offset)
        return list((await self.db.execute(stmt)).scalars().all())

    async def all_active_telegram_ids(self) -> list[int]:
        """Telegram ids of every non-blocked, active, onboarded user.

        Used as the recipient list for broadcasts.
        """
        stmt = select(User.telegram_id).where(
            User.telegram_id.is_not(None),
            User.is_blocked.is_(False),
            User.is_active.is_(True),
            User.is_onboarded.is_(True),
        )
        return [row[0] for row in (await self.db.execute(stmt)).all()]

    async def get_or_create_by_phone(
        self, phone: str, full_name: str | None = None
    ) -> User:
        user = await self.get_by_phone(phone)
        if user is None:
            user = User(phone=phone, full_name=full_name, role=UserRole.PLAYER)
            self.db.add(user)
            await self.db.flush()
        return user
