"""FieldOwner schemas — business profile attached to a `field_owner`-role User."""
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class FieldOwnerCreate(BaseModel):
    user_id: int
    business_name: str = Field(..., max_length=150)
    contact_phone: str | None = Field(None, max_length=20)


class FieldOwnerUpdate(BaseModel):
    business_name: str | None = Field(None, max_length=150)
    contact_phone: str | None = Field(None, max_length=20)


class FieldOwnerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    business_name: str
    contact_phone: str | None
    is_verified: bool
    created_at: datetime


class FieldOwnerAdminOut(FieldOwnerOut):
    """Enriched card for superadmin list."""

    full_name: str = ""
    phone: str | None = None
    is_blocked: bool = False
    is_active: bool = True
    fields_count: int = 0
    active_fields_count: int = 0
    field_names: list[str] = []
