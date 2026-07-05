"""Seed / reset the superadmin account.

Run (DB must be migrated first):  python -m app.seed

Credentials come from the environment (SUPERADMIN_USERNAME / SUPERADMIN_PASSWORD),
defaulting to superadmin / kamoliddin. Safe to re-run: it updates the password if
the user already exists.
"""
import asyncio

from sqlalchemy import select

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.models.enums import UserRole
from app.models.user import User


async def seed_superadmin() -> None:
    username = settings.SUPERADMIN_USERNAME
    password = settings.SUPERADMIN_PASSWORD

    async with AsyncSessionLocal() as db:
        user = (
            await db.execute(select(User).where(User.username == username))
        ).scalar_one_or_none()
        if user is None:
            user = User(username=username, role=UserRole.SUPERADMIN, is_onboarded=True)
            db.add(user)
        user.role = UserRole.SUPERADMIN
        user.hashed_password = hash_password(password)
        user.is_active = True
        user.is_blocked = False
        await db.commit()
        print(f"✅ superadmin ready — login: {username}  password: {password}")


if __name__ == "__main__":
    asyncio.run(seed_superadmin())
