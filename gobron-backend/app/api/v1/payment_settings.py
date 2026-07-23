"""Humo card settings + superadmin Telegram matcher (2FA) credentials."""
from decimal import Decimal

from fastapi import APIRouter, Depends

from app.core.deps import CurrentUser, DBSession, require_role
from app.models.enums import UserRole
from app.models.payment_settings import PaymentSettings
from app.models.user import User
from app.schemas.payment_settings import (
    PaymentSettingsAdminOut,
    PaymentSettingsIn,
    PaymentSettingsOut,
)

router = APIRouter(prefix="/payment-settings", tags=["payment-settings"])

_ROW_ID = 1
_owner_or_admin = require_role(UserRole.FIELD_OWNER, UserRole.SUPERADMIN)
_admin = require_role(UserRole.SUPERADMIN)


async def _get_or_create(db) -> PaymentSettings:
    settings = await db.get(PaymentSettings, _ROW_ID)
    if settings is None:
        settings = PaymentSettings(
            id=_ROW_ID,
            card_number="",
            card_holder="",
            bank_name="HUMO",
            subscription_amount=Decimal("50000"),
            humo_bot_username="HUMOcardbot",
        )
        db.add(settings)
        await db.commit()
        await db.refresh(settings)
    return settings


@router.get("")
async def read_payment_settings(
    db: DBSession,
    user: User = Depends(_owner_or_admin),
):
    settings = await _get_or_create(db)
    if user.role == UserRole.SUPERADMIN:
        return PaymentSettingsAdminOut.from_row(settings)
    return PaymentSettingsOut.model_validate(settings)


@router.put("", response_model=PaymentSettingsAdminOut)
async def update_payment_settings(
    body: PaymentSettingsIn,
    db: DBSession,
    _: User = Depends(_admin),
):
    settings = await _get_or_create(db)
    data = body.model_dump()
    data["subscription_amount"] = Decimal(str(data["subscription_amount"]))
    if not data.get("bank_name"):
        data["bank_name"] = "HUMO"
    # Empty strings → None for optional secrets (don't wipe session if UI sends "")
    for key in (
        "telegram_api_id",
        "telegram_api_hash",
        "telegram_phone",
        "telegram_2fa_password",
        "telegram_session",
        "humo_bot_username",
    ):
        if data.get(key) == "":
            data[key] = None
    # If client omits session on purpose with null, allow clear; if missing key keep old —
    # model_dump has all keys so empty→None already handled. To keep existing session when
    # UI doesn't re-send it, treat None as "leave unchanged" for session/2fa/hash when blank.
    preserve_if_none = (
        "telegram_session",
        "telegram_2fa_password",
        "telegram_api_hash",
        "telegram_api_id",
        "telegram_phone",
    )
    for key, value in data.items():
        if key in preserve_if_none and value is None:
            continue
        setattr(settings, key, value)
    await db.commit()
    await db.refresh(settings)
    return PaymentSettingsAdminOut.from_row(settings)


@router.get("/matcher", response_model=PaymentSettingsAdminOut)
async def read_matcher_settings_for_service(
    db: DBSession,
    _: User = Depends(_admin),
):
    """Explicit superadmin endpoint; payment-matcher can also use DB directly."""
    return PaymentSettingsAdminOut.from_row(await _get_or_create(db))
