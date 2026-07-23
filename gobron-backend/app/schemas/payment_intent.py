"""Payment intent schemas for Humo P2P matching."""
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class PaymentIntentCreate(BaseModel):
    """Optional override; defaults to payment_settings.subscription_amount."""
    base_amount: int | None = Field(None, ge=1000, le=50_000_000)


class PaymentIntentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    owner_id: int
    base_amount: int
    unique_amount: int
    status: str
    expires_at: datetime
    paid_at: datetime | None
    created_at: datetime


class PaymentIntentStartOut(BaseModel):
    """What the owner sees after starting a payment."""
    intent: PaymentIntentOut
    card_number: str
    card_holder: str
    bank_name: str | None
    # Seconds remaining until expires_at (client countdown).
    ttl_seconds: int


class UnmatchedTransactionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    amount: int | None
    raw_message: str
    reason: str
    created_at: datetime


class PaymentIntentAdminOut(PaymentIntentOut):
    owner_phone: str | None = None
    owner_name: str | None = None
    matched_message: str | None = None
