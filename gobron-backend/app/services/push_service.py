"""Web Push delivery — notifies field owners even while the admin-pwa is closed."""
import asyncio
import json
import logging

from pywebpush import WebPushException, webpush
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.enums import UserRole
from app.models.push_subscription import PushSubscription
from app.models.user import User
from app.schemas.push import PushSubscriptionIn

logger = logging.getLogger(__name__)


class PushService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def subscribe(self, user_id: int, body: PushSubscriptionIn) -> None:
        existing = await self.db.execute(
            select(PushSubscription).where(PushSubscription.endpoint == body.endpoint)
        )
        sub = existing.scalar_one_or_none()
        if sub is None:
            sub = PushSubscription(user_id=user_id, endpoint=body.endpoint)
            self.db.add(sub)
        sub.user_id = user_id
        sub.p256dh = body.keys.p256dh
        sub.auth = body.keys.auth
        await self.db.commit()

    async def unsubscribe(self, endpoint: str) -> None:
        await self.db.execute(
            delete(PushSubscription).where(PushSubscription.endpoint == endpoint)
        )
        await self.db.commit()

    async def send_to_field_owners(self, title: str, body: str, url: str = "/home/notifications") -> tuple[int, int]:
        """Push to every subscribed field-owner device. Returns (sent, failed)."""
        stmt = select(PushSubscription).join(User).where(User.role == UserRole.FIELD_OWNER)
        subs = list((await self.db.execute(stmt)).scalars().all())
        if not subs:
            return 0, 0

        payload = json.dumps({"title": title, "body": body, "url": url})
        sent = failed = 0
        stale_ids: list[int] = []
        for sub in subs:
            try:
                # webpush() is a blocking `requests` call — push off the event loop.
                await asyncio.to_thread(
                    webpush,
                    subscription_info={
                        "endpoint": sub.endpoint,
                        "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
                    },
                    data=payload,
                    vapid_private_key=settings.VAPID_PRIVATE_KEY,
                    vapid_claims={"sub": settings.VAPID_SUBJECT},
                )
                sent += 1
            except WebPushException as exc:
                failed += 1
                status_code = getattr(exc.response, "status_code", None)
                if status_code in (404, 410):
                    stale_ids.append(sub.id)
                else:
                    logger.warning("push send failed: %s", exc)

        if stale_ids:
            await self.db.execute(
                delete(PushSubscription).where(PushSubscription.id.in_(stale_ids))
            )
            await self.db.commit()

        return sent, failed
