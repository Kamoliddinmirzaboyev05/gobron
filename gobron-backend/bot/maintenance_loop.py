"""Hourly maintenance: rolling slot windows + settle finished bookings.

Lives next to the reminder loop so only the single bot process runs it.
"""
import asyncio
import logging

from app.services.maintenance import run_maintenance

logger = logging.getLogger(__name__)


async def maintenance_loop(interval: int = 3600) -> None:
    # First tick shortly after boot so a restart heals empty slot windows fast.
    await asyncio.sleep(15)
    while True:
        try:
            result = await run_maintenance()
            logger.info(
                "maintenance: fields=%s slots_created=%s",
                result["fields"],
                result["slots_created"],
            )
        except Exception:  # noqa: BLE001 — one bad tick must not kill the loop
            logger.exception("maintenance tick failed")
        await asyncio.sleep(interval)
