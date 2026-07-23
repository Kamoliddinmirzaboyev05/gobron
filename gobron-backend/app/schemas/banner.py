"""Banner schemas — superadmin CRUD + the public read shape shown in the app."""
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class BannerCreate(BaseModel):
    image_url: str
    title: str | None = Field(None, max_length=200)
    description: str | None = Field(None, max_length=500)
    link: str | None = None
    sort_order: int = 0
    is_active: bool = True


class BannerUpdate(BaseModel):
    image_url: str | None = None
    title: str | None = Field(None, max_length=200)
    description: str | None = Field(None, max_length=500)
    link: str | None = None
    sort_order: int | None = None
    is_active: bool | None = None


class BannerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    image_url: str
    title: str | None = None
    description: str | None = None
    link: str | None
    sort_order: int
    is_active: bool
    created_at: datetime
