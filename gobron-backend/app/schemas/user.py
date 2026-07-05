"""User schemas."""
from datetime import datetime

from pydantic import BaseModel, ConfigDict, computed_field

from app.models.enums import UserRole


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    telegram_id: int | None
    phone: str | None
    first_name: str | None
    last_name: str | None
    region: str | None
    city: str | None
    role: UserRole
    is_active: bool
    is_blocked: bool
    is_onboarded: bool
    created_at: datetime

    @computed_field
    @property
    def full_name(self) -> str:
        return " ".join(p for p in (self.first_name, self.last_name) if p).strip()


class UserUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    region: str | None = None
    city: str | None = None
