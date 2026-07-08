from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class SubscriptionPaymentCreate(BaseModel):
    amount: Decimal
    receipt_image: str


class SubscriptionPaymentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    owner_id: int
    amount: Decimal
    receipt_image: str
    status: str
    created_at: datetime


class SubscriptionPaymentAdminOut(SubscriptionPaymentOut):
    owner_phone: str | None = None
    owner_name: str | None = None
