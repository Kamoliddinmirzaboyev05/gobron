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
