"""Web Push subscription endpoints."""
from fastapi import APIRouter, status

from app.core.config import settings
from app.core.deps import CurrentUser, DBSession
from app.schemas.push import PushSubscriptionIn
from app.services.push_service import PushService

router = APIRouter(prefix="/push", tags=["push"])


@router.get("/vapid-public-key")
async def vapid_public_key():
    return {"key": settings.VAPID_PUBLIC_KEY}


@router.post("/subscribe", status_code=status.HTTP_204_NO_CONTENT)
async def subscribe(body: PushSubscriptionIn, db: DBSession, user: CurrentUser):
    await PushService(db).subscribe(user.id, body)


@router.post("/unsubscribe", status_code=status.HTTP_204_NO_CONTENT)
async def unsubscribe(body: PushSubscriptionIn, db: DBSession, user: CurrentUser):
    await PushService(db).unsubscribe(body.endpoint)
