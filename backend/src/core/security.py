import logging
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .config import settings

logger = logging.getLogger(__name__)

_bearer_scheme = HTTPBearer(auto_error=False)


def create_access_token() -> str:
    """Create a JWT access token."""
    payload = {
        "sub": "owner",
        "exp": datetime.now(timezone.utc)
        + timedelta(hours=settings.auth_token_expiry_hours),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.auth_secret, algorithm="HS256")


def verify_token(token: str) -> dict | None:
    """Verify a JWT token. Returns the payload or None if invalid."""
    try:
        return jwt.decode(token, settings.auth_secret, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
) -> dict:
    """FastAPI dependency that validates the JWT from Authorization header."""
    if not settings.auth_enabled or not settings.auth_secret:
        return {"sub": "local"}

    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = verify_token(credentials.credentials)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return payload


async def authenticate_websocket(token: str | None) -> bool:
    """Validate JWT for WebSocket connections."""
    if not settings.auth_enabled or not settings.auth_secret:
        return True

    if not token:
        return False

    return verify_token(token) is not None
