"""Nudges players an hour before kickoff.

Lives in the bot process on purpose: it is the one component that runs as a
single instance. The API is served by several uvicorn workers, and a loop there
would send every reminder once per worker. Nothing here talks to aiogram — the
messages go out over app.services.telegram — so the loop is just a ticker.
"""
import asyncio
import logging

from app.core.database import AsyncSessionLocal
from app.services.booking_notifications import send_due_reminders

logger = logging.getLogger(__name__)


async def reminder_loop(interval: int = 60) -> None:
    while True:
        try:
            async with AsyncSessionLocal() as db:
                sent = await send_due_reminders(db)
            if sent:
                logger.info("sent %d booking reminder(s)", sent)
        except Exception:  # noqa: BLE001 — one bad tick must not kill the loop
            logger.exception("reminder tick failed")
        await asyncio.sleep(interval)
