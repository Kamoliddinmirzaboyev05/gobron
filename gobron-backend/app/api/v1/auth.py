"""Auth endpoints: Telegram Mini App login, OTP fallback, refresh, me."""
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.core.deps import CurrentUser, DBSession
from app.schemas.auth import (
    OTPRequest,
    OTPVerify,
    PasswordLogin,
    PhoneLogin,
    RefreshRequest,
    TokenPair,
)
from app.schemas.user import UserOut
from app.services.auth_service import AuthError, AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


class TelegramLogin(BaseModel):
    init_data: str  # value of window.Telegram.WebApp.initData


@router.post("/login", response_model=TokenPair)
async def login(body: PasswordLogin, db: DBSession):
    """Username + password login for admins and field owners."""
    try:
        return await AuthService(db).login_with_password(body.username, body.password)
    except AuthError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, str(exc))


@router.post("/phone-login", response_model=TokenPair)
async def phone_login(body: PhoneLogin, db: DBSession):
    try:
        return await AuthService(db).login_with_phone(
            body.phone, body.full_name, body.password
        )
    except AuthError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc))


@router.post("/telegram", response_model=TokenPair)
async def telegram_login(body: TelegramLogin, db: DBSession):
    try:
        return await AuthService(db).login_with_telegram(body.init_data)
    except AuthError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, str(exc))


@router.post("/otp/request", status_code=status.HTTP_204_NO_CONTENT)
async def request_otp(body: OTPRequest, db: DBSession):
    await AuthService(db).request_otp(body.phone)


@router.post("/otp/verify", response_model=TokenPair)
async def verify_otp(body: OTPVerify, db: DBSession):
    try:
        return await AuthService(db).verify_and_login(
            body.phone, body.code, body.full_name
        )
    except AuthError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, str(exc))


@router.post("/refresh", response_model=TokenPair)
async def refresh(body: RefreshRequest, db: DBSession):
    try:
        return await AuthService(db).refresh(body.refresh_token)
    except AuthError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, str(exc))


@router.get("/me", response_model=UserOut)
async def me(user: CurrentUser):
    return user
