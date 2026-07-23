"""Authentication service.

Two login paths issue the same JWT pair:
  * Telegram Mini App -> validate initData, match the onboarded user by
    telegram_id (the bot created them during onboarding).
  * Phone + password  -> field-owner app login/registration.
  * Phone + OTP       -> fallback for non-Telegram clients (dev / SMS).
"""
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import (
    InvalidInitData,
    create_access_token,
    create_refresh_token,
    decode_token,
    generate_otp,
    hash_password,
    validate_telegram_init_data,
    verify_otp,
    verify_password,
)
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.utils.rate_limit import auth_limiter


class AuthError(Exception):
    """Login failed (bad credentials, blocked, or not onboarded)."""


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.users = UserRepository(db)

    def _tokens(self, user: User) -> dict:
        return {
            "access_token": create_access_token(user.id, user.role.value),
            "refresh_token": create_refresh_token(user.id, user.role.value),
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        }

    def _check_login_rate(self, key: str) -> None:
        if not auth_limiter.allow(
            f"login:{key}",
            limit=settings.LOGIN_FAIL_LIMIT,
            window_seconds=settings.LOGIN_FAIL_WINDOW_SECONDS,
        ):
            raise AuthError("Juda ko'p urinish. Biroz kuting.")

    async def login_with_password(self, username: str, password: str) -> dict:
        """Username + password login for admins and field owners."""
        self._check_login_rate(f"user:{username.lower()}")
        user = await self.users.get_by_username(username)
        if user is None or not user.hashed_password:
            raise AuthError("Login yoki parol noto'g'ri")
        if not verify_password(password, user.hashed_password):
            raise AuthError("Login yoki parol noto'g'ri")
        if user.is_blocked or not user.is_active:
            raise AuthError("Hisob bloklangan")
        return self._tokens(user)

    async def login_with_phone(
        self,
        phone: str,
        full_name: str | None = None,
        password: str | None = None,
    ) -> dict:
        """Phone login/registration for field owners. Password is always required."""
        self._check_login_rate(f"phone:{phone}")
        if not password or len(password) < 6:
            raise AuthError("Parol kamida 6 ta belgidan iborat bo'lishi kerak")

        user = await self.users.get_by_phone(phone)
        if user is None:
            if not full_name or not full_name.strip():
                raise AuthError("Ro'yxatdan o'tish uchun ism majburiy")
            user = await self.users.create_field_owner_by_phone(
                phone, full_name, hash_password(password)
            )
        elif user.hashed_password:
            if not verify_password(password, user.hashed_password):
                raise AuthError("Login yoki parol noto'g'ri")
        else:
            # Legacy phone-only account: set password on this login.
            user.hashed_password = hash_password(password)

        if user.is_blocked or not user.is_active:
            raise AuthError("Hisob bloklangan")
        await self.db.commit()
        return self._tokens(user)

    async def login_with_telegram(self, init_data: str) -> dict:
        """Validate TMA initData and issue tokens for the onboarded user."""
        try:
            tg_user = validate_telegram_init_data(init_data)
        except InvalidInitData as exc:
            raise AuthError(f"Invalid Telegram data: {exc}") from exc

        user = await self.users.get_by_telegram_id(int(tg_user["id"]))
        if user is None or not user.is_onboarded:
            raise AuthError("Please finish onboarding in the bot first")
        if user.is_blocked or not user.is_active:
            raise AuthError("Account is blocked")
        return self._tokens(user)

    # --- Phone + OTP fallback ---
    async def request_otp(self, phone: str) -> None:
        if not auth_limiter.allow(
            f"otp:{phone}",
            limit=settings.OTP_REQUEST_LIMIT,
            window_seconds=settings.OTP_REQUEST_WINDOW_SECONDS,
        ):
            raise AuthError("Juda ko'p OTP so'rovi. Biroz kuting.")
        generate_otp(phone)  # dev mode: always the master code

    async def verify_and_login(
        self, phone: str, code: str, full_name: str | None = None
    ) -> dict:
        self._check_login_rate(f"otp-verify:{phone}")
        if not verify_otp(phone, code):
            raise AuthError("Invalid or expired code")
        user = await self.users.get_or_create_by_phone(phone, full_name)
        if user.is_blocked:
            raise AuthError("Account is blocked")
        await self.db.commit()
        return self._tokens(user)

    async def refresh(self, refresh_token: str) -> dict:
        import jwt

        try:
            payload = decode_token(refresh_token)
            if payload.get("type") != "refresh":
                raise AuthError("Not a refresh token")
            user = await self.db.get(User, int(payload["sub"]))
        except (jwt.PyJWTError, KeyError, ValueError) as exc:
            raise AuthError("Invalid refresh token") from exc
        if user is None or user.is_blocked or not user.is_active:
            raise AuthError("Account unavailable")
        return self._tokens(user)
