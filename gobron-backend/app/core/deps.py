"""FastAPI dependencies for authentication and role-based access."""
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import decode_token
from app.models.enums import UserRole
from app.models.user import User

_bearer = HTTPBearer(auto_error=True)

DBSession = Annotated[AsyncSession, Depends(get_db)]


async def get_current_user(
    creds: Annotated[HTTPAuthorizationCredentials, Depends(_bearer)],
    db: DBSession,
) -> User:
    """Resolve the authenticated user from the Bearer access token."""
    cred_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(creds.credentials)
        if payload.get("type") != "access":
            raise cred_error
        user_id = int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        raise cred_error

    user = await db.get(User, user_id)
    if user is None or not user.is_active:
        raise cred_error
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_role(*roles: UserRole):
    """Dependency factory guarding an endpoint to the given roles."""

    async def _guard(user: CurrentUser) -> User:
        if user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return user

    return _guard
