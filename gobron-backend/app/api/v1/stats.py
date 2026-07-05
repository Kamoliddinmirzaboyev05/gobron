"""Statistics endpoints — dashboard for owners (own data) and superadmin (all)."""
from datetime import date

from fastapi import APIRouter

from app.core.deps import CurrentUser, DBSession
from app.models.enums import UserRole
from app.schemas.stats import DashboardStats
from app.services.stats_service import StatsService

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/dashboard", response_model=DashboardStats)
async def dashboard(
    db: DBSession,
    user: CurrentUser,
    date_from: date | None = None,
    date_to: date | None = None,
):
    # Field owners see only their own metrics; superadmin sees everything.
    owner_id = None if user.role == UserRole.SUPERADMIN else user.id
    return await StatsService(db).dashboard(
        owner_id=owner_id, date_from=date_from, date_to=date_to
    )
