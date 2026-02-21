import asyncio
import logging
from pathlib import Path

from ...core.config import settings

logger = logging.getLogger(__name__)


class ClaudeMdService:
    @property
    def _claude_md_path(self) -> Path:
        return settings.templates_dir / ".claude" / "CLAUDE.md"

    async def get_claude_md(self) -> dict:
        loop = asyncio.get_event_loop()

        def _read() -> str:
            path = self._claude_md_path
            if path.is_file():
                return path.read_text(encoding="utf-8")
            return ""

        content = await loop.run_in_executor(None, _read)
        return {"content": content}

    async def update_claude_md(self, content: str) -> dict:
        loop = asyncio.get_event_loop()

        def _write() -> None:
            path = self._claude_md_path
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content, encoding="utf-8")

        await loop.run_in_executor(None, _write)

        synced = await self._sync_to_projects(content)
        return {"content": content, "synced_projects": synced}

    async def _sync_to_projects(self, content: str) -> int:
        """Sync CLAUDE.md to all existing project directories."""
        loop = asyncio.get_event_loop()

        def _do_sync() -> int:
            projects_dir = settings.projects_dir
            if not projects_dir.is_dir():
                return 0

            count = 0
            for entry in projects_dir.iterdir():
                if entry.name.startswith(".") or not entry.is_dir():
                    continue

                claude_dir = entry / ".claude"
                target = claude_dir / "CLAUDE.md"

                try:
                    claude_dir.mkdir(parents=True, exist_ok=True)
                    target.write_text(content, encoding="utf-8")
                    count += 1
                except Exception:
                    logger.warning(
                        "Failed to sync CLAUDE.md to %s", entry.name, exc_info=True
                    )

            return count

        try:
            return await loop.run_in_executor(None, _do_sync)
        except Exception:
            logger.warning("Failed to sync CLAUDE.md to projects", exc_info=True)
            return 0
