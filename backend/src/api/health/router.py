import shutil

from fastapi import APIRouter

from ...core.config import settings

router = APIRouter(tags=["health"])


@router.get("/api/health")
async def health_check() -> dict:
    claude_path = shutil.which(settings.claude_binary)
    return {
        "status": "ok",
        "claude_cli_available": claude_path is not None,
        "claude_cli_path": claude_path,
        "projects_dir_exists": settings.projects_dir.exists(),
        "projects_dir": str(settings.projects_dir),
        "version": "0.1.0",
    }
