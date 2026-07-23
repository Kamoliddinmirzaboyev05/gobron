"""Public banner listing — the user-web hero carousel reads this."""
from fastapi import APIRouter
from sqlalchemy import select

from app.core.deps import DBSession
from app.models.banner import Banner
from app.schemas.banner import BannerOut

router = APIRouter(prefix="/banners", tags=["banners"])


def _to_out(b: Banner) -> BannerOut:
    """Always serialize title/description (null if empty) for the TMA slider."""
    return BannerOut(
        id=b.id,
        image_url=b.image_url,
        title=(b.title or None),
        description=(b.description or None),
        link=b.link,
        sort_order=b.sort_order,
        is_active=b.is_active,
        created_at=b.created_at,
    )


@router.get("", response_model=list[BannerOut])
async def list_banners(db: DBSession):
    stmt = (
        select(Banner)
        .where(Banner.is_active.is_(True))
        .order_by(Banner.sort_order, Banner.id)
    )
    rows = list((await db.execute(stmt)).scalars().all())
    return [_to_out(b) for b in rows]
