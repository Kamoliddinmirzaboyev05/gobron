"""Public banner listing — the user-web hero carousel reads this."""
from fastapi import APIRouter
from sqlalchemy import select

from app.core.deps import DBSession
from app.models.banner import Banner
from app.schemas.banner import BannerOut

router = APIRouter(prefix="/banners", tags=["banners"])


@router.get("", response_model=list[BannerOut])
async def list_banners(db: DBSession):
    stmt = (
        select(Banner)
        .where(Banner.is_active.is_(True))
        .order_by(Banner.sort_order, Banner.id)
    )
    return list((await db.execute(stmt)).scalars().all())
