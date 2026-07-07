"""Broadcast service — deliver an admin post to every bot user.

Sends directly through the Telegram Bot HTTP API (no aiogram dependency needed
here): sendPhoto when an image is attached, otherwise sendMessage. Runs
sequentially with a tiny delay to stay under Telegram's ~30 msg/s limit.
# ponytail: sequential sender, fine to low-thousands of users; move to a queue
# (Celery/arq) + batched workers if the audience grows large.
"""
import asyncio
from datetime import datetime, timezone

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.broadcast import Broadcast
from app.models.enums import BroadcastAudience, BroadcastStatus
from app.repositories.user_repository import UserRepository

_API = "https://api.telegram.org/bot{token}/{method}"


class BroadcastService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.users = UserRepository(db)

    @staticmethod
    def _includes_bot_users(bc: Broadcast) -> bool:
        return bc.audience in (BroadcastAudience.BOT_USERS, BroadcastAudience.ALL)

    async def _send_one(
        self, client: httpx.AsyncClient, chat_id: int, bc: Broadcast
    ) -> bool:
        if bc.image_url:
            method, payload = "sendPhoto", {
                "chat_id": chat_id,
                "photo": bc.image_url,
                "caption": bc.text,
            }
        else:
            method, payload = "sendMessage", {"chat_id": chat_id, "text": bc.text}
        try:
            resp = await client.post(
                _API.format(token=settings.TELEGRAM_BOT_TOKEN, method=method),
                json=payload,
                timeout=15,
            )
            return resp.status_code == 200 and resp.json().get("ok", False)
        except httpx.HTTPError:
            return False

    async def send(self, broadcast_id: int) -> Broadcast:
        """Deliver a draft broadcast to all eligible users; record counts."""
        bc = await self.db.get(Broadcast, broadcast_id)
        if bc is None:
            raise ValueError("Broadcast not found")
        if bc.status == BroadcastStatus.SENT:
            return bc

        bc.status = BroadcastStatus.SENDING
        await self.db.commit()

        sent = failed = 0
        if self._includes_bot_users(bc):
            recipients = await self.users.all_active_telegram_ids()
            async with httpx.AsyncClient() as client:
                for chat_id in recipients:
                    ok = await self._send_one(client, chat_id, bc)
                    sent += ok
                    failed += not ok
                    await asyncio.sleep(0.05)  # ~20 msg/s, safely under the limit

        bc.sent_count = sent
        bc.failed_count = failed
        bc.status = BroadcastStatus.SENT
        bc.sent_at = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(bc)
        return bc
