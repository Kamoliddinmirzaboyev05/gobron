"""Thin Telegram Bot API client, shared by everything the backend pushes out.

The aiogram process only handles *inbound* updates. Outbound messages (broadcasts,
booking confirmations, kickoff reminders) go straight to the HTTP API from here,
so exactly one module knows the token, the timeout, and what "delivered" means.
"""
import logging

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

_API = "https://api.telegram.org/bot{token}/{method}"


async def call(
    method: str,
    payload: dict,
    client: httpx.AsyncClient | None = None,
    timeout: float = 15,
) -> bool:
    """POST one Bot API method. Never raises — delivery is best-effort."""
    if client is None:
        async with httpx.AsyncClient() as owned:
            return await call(method, payload, owned, timeout)

    try:
        resp = await client.post(
            _API.format(token=settings.TELEGRAM_BOT_TOKEN, method=method),
            json=payload,
            timeout=timeout,
        )
    except httpx.HTTPError:
        logger.warning("telegram %s failed", method, exc_info=True)
        return False

    # Telegram answers 200 with {"ok": false} for blocked bots and dead chats,
    # so the status code alone does not mean the message landed.
    try:
        ok = resp.status_code == 200 and resp.json().get("ok", False)
    except ValueError:
        ok = False
    if not ok:
        logger.warning("telegram %s rejected: %s", method, resp.text[:200])
    return ok


async def send_message(
    chat_id: int,
    text: str,
    client: httpx.AsyncClient | None = None,
    timeout: float = 15,
) -> bool:
    return await call("sendMessage", {"chat_id": chat_id, "text": text}, client, timeout)
