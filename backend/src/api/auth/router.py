from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from ...core.config import settings
from ...core.security import create_access_token

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginRequest(BaseModel):
    password: str


class LoginResponse(BaseModel):
    token: str


@router.post("/login", response_model=LoginResponse)
async def login(body: LoginRequest):
    """Authenticate with password and receive a JWT."""
    if not settings.auth_password:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Auth not configured. Set TELECODE_AUTH_PASSWORD.",
        )

    if body.password != settings.auth_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid password",
        )

    return LoginResponse(token=create_access_token())
