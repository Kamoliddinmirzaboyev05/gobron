"""Schemas for the platform's subscription-payment card."""
import re

from pydantic import BaseModel, ConfigDict, Field, field_validator


class PaymentSettingsIn(BaseModel):
    card_number: str = Field(..., max_length=32)
    card_holder: str = Field(..., min_length=1, max_length=150)
    bank_name: str | None = Field(None, max_length=100)

    @field_validator("card_number")
    @classmethod
    def _digits_only(cls, value: str) -> str:
        digits = re.sub(r"\s", "", value)
        if not digits.isdigit() or not 16 <= len(digits) <= 20:
            raise ValueError("Karta raqami 16-20 ta raqamdan iborat bo'lishi kerak")
        # Store grouped, so every client renders it the same way.
        return " ".join(digits[i : i + 4] for i in range(0, len(digits), 4))


class PaymentSettingsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    card_number: str
    card_holder: str
    bank_name: str | None
