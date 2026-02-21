from .config import settings


async def get_current_user() -> dict:
    """Auth dependency stub. Returns a dummy user since auth is disabled."""
    return {"sub": "local"}


async def authenticate_websocket(token: str | None) -> bool:
    """WebSocket auth stub. Always returns True since auth is disabled."""
    return True
