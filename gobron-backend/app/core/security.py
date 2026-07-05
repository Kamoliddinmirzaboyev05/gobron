"""Auth primitives: JWT encode/decode and OTP generation/verification.

Phone + OTP login flow:
  1. client requests an OTP for a phone  -> we store a short-lived code
  2. client submits phone + code         -> we verify and issue JWT tokens

The OTP store is a process-local dict here. That is fine for a single-process
dev/demo deployment; swap it for Redis when you run more than one worker.
# ponytail: in-memory OTP store, move to Redis when scaling past one worker.
"""
import hashlib
import hmac
import json
import secrets
import time as _time
from datetime import datetime, timedelta, timezone
from urllib.parse import parse_qsl

import jwt

from app.core.config import settings

# phone -> (code, expires_at_epoch)
_otp_store: dict[str, tuple[str, float]] = {}


def generate_otp(phone: str) -> str:
    """Create and store an OTP for ``phone``, returning the code.

    In dev mode we always use the master code so no SMS gateway is needed.
    """
    code = (
        settings.OTP_DEV_CODE
        if settings.OTP_DEV_MODE
        else "".join(secrets.choice("0123456789") for _ in range(settings.OTP_LENGTH))
    )
    _otp_store[phone] = (code, _time.time() + settings.OTP_EXPIRE_SECONDS)
    return code


def verify_otp(phone: str, code: str) -> bool:
    """Return True if ``code`` matches the live OTP for ``phone`` (once)."""
    if settings.OTP_DEV_MODE and code == settings.OTP_DEV_CODE:
        return True
    entry = _otp_store.get(phone)
    if entry is None:
        return False
    stored_code, expires_at = entry
    if _time.time() > expires_at:
        _otp_store.pop(phone, None)
        return False
    if not secrets.compare_digest(stored_code, code):
        return False
    _otp_store.pop(phone, None)  # single use
    return True


def _create_token(subject: str, role: str, expires_minutes: int, token_type: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": subject,
        "role": role,
        "type": token_type,
        "iat": now,
        "exp": now + timedelta(minutes=expires_minutes),
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_access_token(user_id: int, role: str) -> str:
    return _create_token(str(user_id), role, settings.ACCESS_TOKEN_EXPIRE_MINUTES, "access")


def create_refresh_token(user_id: int, role: str) -> str:
    return _create_token(str(user_id), role, settings.REFRESH_TOKEN_EXPIRE_MINUTES, "refresh")


def decode_token(token: str) -> dict:
    """Decode and validate a JWT. Raises jwt.PyJWTError on failure."""
    return jwt.decode(
        token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
    )


class InvalidInitData(Exception):
    """Telegram Mini App initData failed signature/freshness validation."""


def validate_telegram_init_data(init_data: str) -> dict:
    """Verify a Telegram Mini App ``initData`` string and return its `user` dict.

    Implements Telegram's documented check: HMAC-SHA256 of the sorted
    "key=value" data-check-string, keyed by SHA256("WebAppData", bot_token),
    must equal the provided `hash`. See core.telegram.org/bots/webapps.
    """
    pairs = dict(parse_qsl(init_data, keep_blank_values=True))
    received_hash = pairs.pop("hash", None)
    if not received_hash:
        raise InvalidInitData("missing hash")

    data_check_string = "\n".join(f"{k}={pairs[k]}" for k in sorted(pairs))
    secret_key = hmac.new(
        b"WebAppData", settings.TELEGRAM_BOT_TOKEN.encode(), hashlib.sha256
    ).digest()
    expected = hmac.new(
        secret_key, data_check_string.encode(), hashlib.sha256
    ).hexdigest()
    if not hmac.compare_digest(expected, received_hash):
        raise InvalidInitData("bad signature")

    auth_date = int(pairs.get("auth_date", "0"))
    if _time.time() - auth_date > settings.TELEGRAM_INITDATA_MAX_AGE:
        raise InvalidInitData("initData expired")

    user_raw = pairs.get("user")
    if not user_raw:
        raise InvalidInitData("missing user")
    return json.loads(user_raw)
