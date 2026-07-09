"""Banner schemas — superadmin CRUD + the public read shape shown in the app."""
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class BannerCreate(BaseModel):
    image_url: str
    link: str | None = None
    sort_order: int = 0
    is_active: bool = True


class BannerUpdate(BaseModel):
    image_url: str | None = None
    link: str | None = None
    sort_order: int | None = None
    is_active: bool | None = None


class BannerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    image_url: str
    link: str | None
    sort_order: int
    is_active: bool
    created_at: datetime
