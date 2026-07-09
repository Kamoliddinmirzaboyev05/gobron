"""The subscription card: superadmin edits it, field owners read it."""
from fastapi import APIRouter, Depends

from app.core.deps import DBSession, require_role
from app.models.enums import UserRole
from app.models.payment_settings import PaymentSettings
from app.schemas.payment_settings import PaymentSettingsIn, PaymentSettingsOut

router = APIRouter(prefix="/payment-settings", tags=["payment-settings"])

_ROW_ID = 1  # single-row table


async def _get_or_create(db) -> PaymentSettings:
    settings = await db.get(PaymentSettings, _ROW_ID)
    if settings is None:
        settings = PaymentSettings(id=_ROW_ID, card_number="", card_holder="")
        db.add(settings)
        await db.commit()
        await db.refresh(settings)
    return settings


@router.get("", response_model=PaymentSettingsOut)
async def read_payment_settings(
    db: DBSession,
    _=Depends(require_role(UserRole.FIELD_OWNER, UserRole.SUPERADMIN)),
):
    return await _get_or_create(db)


@router.put("", response_model=PaymentSettingsOut)
async def update_payment_settings(
    body: PaymentSettingsIn,
    db: DBSession,
    _=Depends(require_role(UserRole.SUPERADMIN)),
):
    settings = await _get_or_create(db)
    for key, value in body.model_dump().items():
        setattr(settings, key, value)
    await db.commit()
    await db.refresh(settings)
    return settings
