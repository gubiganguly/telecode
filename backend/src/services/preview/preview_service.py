"""Manage live preview dev-server subprocesses for user projects."""

from __future__ import annotations

import asyncio
import json
import logging
import os
from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

from ...core.config import settings
from ...core.database import db
from ...core.exceptions import (
    PreviewAlreadyRunningError,
    PreviewNotFoundError,
    PreviewNotSupportedError,
    PreviewStartError,
)
from .caddy_client import CaddyClient
from .detector import DetectionResult, detect

logger = logging.getLogger(__name__)

MAX_LOG_LINES = 500
INSTALL_TIMEOUT = 120  # seconds


@dataclass
class RunningPreview:
    project_id: str
    slug: str
    port: int
    framework: str
    process: asyncio.subprocess.Process
    log_buffer: deque = field(default_factory=lambda: deque(maxlen=MAX_LOG_LINES))
    started_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    _reader_task: asyncio.Task | None = field(default=None, repr=False)


class PreviewService:
    """Lifecycle manager for project preview dev servers."""

    def __init__(self, caddy: CaddyClient) -> None:
        self._previews: dict[str, RunningPreview] = {}  # project_id → preview
        self._lock = asyncio.Lock()
        self._caddy = caddy
        self._allocated_ports: set[int] = set()
        self._auto_stop_task: asyncio.Task | None = None

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    async def startup(self) -> None:
        """Restore port allocations from DB and start auto-stop loop."""
        async with db.conn.execute("SELECT project_id, port FROM previews") as cur:
            rows = await cur.fetchall()
        for row in rows:
            self._allocated_ports.add(row["port"])
            logger.info(
                "Restored port reservation: project %s → port %d",
                row["project_id"], row["port"],
            )
        self._auto_stop_task = asyncio.create_task(self._auto_stop_loop())

    async def shutdown(self) -> None:
        """Stop all running previews and cancel the auto-stop loop."""
        if self._auto_stop_task:
            self._auto_stop_task.cancel()
        await self.cleanup_all()

    async def cleanup_all(self) -> None:
        """Kill every running preview subprocess."""
        async with self._lock:
            project_ids = list(self._previews.keys())
        for pid in project_ids:
            try:
                await self.stop(pid)
            except Exception as exc:
                logger.warning("Error stopping preview %s during cleanup: %s", pid, exc)

    # ------------------------------------------------------------------
    # Detection
    # ------------------------------------------------------------------

    def detect(self, project_path: Path) -> DetectionResult:
        """Detect framework for a project directory (sync, runs in executor)."""
        return detect(project_path)

    # ------------------------------------------------------------------
    # Start / Stop
    # ------------------------------------------------------------------

    async def start(
        self, project_id: str, project_path: Path, slug: str,
    ) -> dict:
        """Start a dev server for the given project.

        Returns a dict suitable for ``PreviewInfo`` serialisation.
        """
        async with self._lock:
            if project_id in self._previews:
                p = self._previews[project_id]
                if p.process.returncode is None:  # still running
                    raise PreviewAlreadyRunningError(
                        f"Preview already running for project {project_id}"
                    )
                # Process died — clean up stale entry
                await self._cleanup_preview(project_id)

        detection = detect(project_path)
        if not detection.supported:
            raise PreviewNotSupportedError(
                "This project type is not supported for live preview"
            )

        # For monorepo layouts, the dev server runs from the subdirectory
        work_dir = project_path / detection.subdir if detection.subdir else project_path

        port = await self._allocate_port(project_id)

        # npm install if needed
        if detection.needs_install and detection.install_cmd:
            logger.info("Running install for %s: %s", project_id, detection.install_cmd)
            try:
                proc = await asyncio.create_subprocess_exec(
                    *detection.install_cmd,
                    cwd=str(work_dir),
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.STDOUT,
                )
                await asyncio.wait_for(proc.wait(), timeout=INSTALL_TIMEOUT)
                if proc.returncode != 0:
                    raise PreviewStartError("npm install failed")
            except asyncio.TimeoutError:
                raise PreviewStartError("npm install timed out")

        # Build the actual command with port substituted
        cmd = [arg.replace("{port}", str(port)) for arg in detection.start_cmd]

        # Environment: inherit current env + set PORT for frameworks that use it
        env = {**os.environ, "PORT": str(port), "BROWSER": "none"}
        # Remove vars that shouldn't leak into user projects
        env.pop("CLAUDECODE", None)
        env.pop("ANTHROPIC_API_KEY", None)

        logger.info("Starting preview for %s: %s (port %d, cwd %s)", project_id, cmd, port, work_dir)

        try:
            process = await asyncio.create_subprocess_exec(
                *cmd,
                cwd=str(work_dir),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.STDOUT,
                env=env,
            )
        except Exception as exc:
            await self._release_port(project_id, port)
            raise PreviewStartError(f"Failed to start dev server: {exc}")

        preview = RunningPreview(
            project_id=project_id,
            slug=slug,
            port=port,
            framework=detection.framework or "unknown",
            process=process,
        )

        # Background reader for stdout
        preview._reader_task = asyncio.create_task(
            self._read_output(preview)
        )

        async with self._lock:
            self._previews[project_id] = preview

        # Persist to DB
        await db.conn.execute(
            """INSERT OR REPLACE INTO previews (project_id, port, framework, start_cmd)
               VALUES (?, ?, ?, ?)""",
            (project_id, port, detection.framework, json.dumps(cmd)),
        )
        await db.conn.commit()

        # Register Caddy route
        try:
            await self._caddy.add_route(slug, port)
        except Exception as exc:
            logger.warning("Failed to configure Caddy route: %s", exc)
            # Don't fail the start — the server is running, Caddy can be retried

        url = f"https://{slug}.{settings.preview_domain}"
        return {
            "project_id": project_id,
            "port": port,
            "framework": detection.framework,
            "status": "running",
            "url": url,
            "started_at": preview.started_at.isoformat(),
            "error": None,
        }

    async def stop(self, project_id: str) -> None:
        """Stop the preview for a project. Idempotent — safe to call if already stopped."""
        async with self._lock:
            preview = self._previews.get(project_id)
        if not preview:
            # Already stopped — clean up DB entry if it exists
            await self._release_port_by_project(project_id)
            return

        await self._kill_process(preview)
        await self._caddy.remove_route(preview.slug)
        await self._cleanup_preview(project_id)
        logger.info("Preview stopped for %s", project_id)

    async def status(self, project_id: str, slug: str) -> dict | None:
        """Return current preview status, or None if never started."""
        async with self._lock:
            preview = self._previews.get(project_id)

        if preview:
            running = preview.process.returncode is None
            url = f"https://{preview.slug}.{settings.preview_domain}"
            return {
                "project_id": project_id,
                "port": preview.port,
                "framework": preview.framework,
                "status": "running" if running else "stopped",
                "url": url if running else None,
                "started_at": preview.started_at.isoformat(),
                "error": None,
            }

        # Check DB for persisted port allocation (server not running)
        async with db.conn.execute(
            "SELECT port, framework FROM previews WHERE project_id = ?",
            (project_id,),
        ) as cur:
            row = await cur.fetchone()
        if row:
            return {
                "project_id": project_id,
                "port": row["port"],
                "framework": row["framework"],
                "status": "stopped",
                "url": None,
                "started_at": None,
                "error": None,
            }

        return None

    def get_logs(self, project_id: str, since_line: int = 0) -> tuple[list[str], int]:
        """Return log lines from the buffer starting at *since_line*.

        Returns ``(lines, total_line_count)``.
        """
        preview = self._previews.get(project_id)
        if not preview:
            return [], 0
        buf = list(preview.log_buffer)
        total = len(buf)
        return buf[since_line:], total

    # ------------------------------------------------------------------
    # Port allocation
    # ------------------------------------------------------------------

    async def _allocate_port(self, project_id: str) -> int:
        """Find the lowest unused port in the configured range."""
        # Check if this project already has a port in DB
        async with db.conn.execute(
            "SELECT port FROM previews WHERE project_id = ?", (project_id,),
        ) as cur:
            row = await cur.fetchone()
        if row:
            self._allocated_ports.add(row["port"])
            return row["port"]

        # Find next free port
        for port in range(settings.preview_port_start, settings.preview_port_end + 1):
            if port not in self._allocated_ports:
                self._allocated_ports.add(port)
                return port

        raise PreviewStartError("No available ports in preview range")

    async def _release_port(self, project_id: str, port: int) -> None:
        """Release a port back to the pool."""
        self._allocated_ports.discard(port)
        await db.conn.execute(
            "DELETE FROM previews WHERE project_id = ?", (project_id,),
        )
        await db.conn.commit()

    async def _release_port_by_project(self, project_id: str) -> None:
        """Release a port by project ID (when we don't have the port number)."""
        async with db.conn.execute(
            "SELECT port FROM previews WHERE project_id = ?", (project_id,),
        ) as cur:
            row = await cur.fetchone()
        if row:
            self._allocated_ports.discard(row["port"])
            await db.conn.execute(
                "DELETE FROM previews WHERE project_id = ?", (project_id,),
            )
            await db.conn.commit()

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    async def _read_output(self, preview: RunningPreview) -> None:
        """Continuously read subprocess stdout and append to the log buffer."""
        assert preview.process.stdout
        try:
            async for raw_line in preview.process.stdout:
                line = raw_line.decode("utf-8", errors="replace").rstrip("\n")
                preview.log_buffer.append(line)
        except Exception:
            pass  # Process exited

    async def _kill_process(self, preview: RunningPreview) -> None:
        """Gracefully terminate a preview process."""
        if preview._reader_task and not preview._reader_task.done():
            preview._reader_task.cancel()

        proc = preview.process
        if proc.returncode is not None:
            return  # Already exited

        proc.terminate()
        try:
            await asyncio.wait_for(proc.wait(), timeout=5)
        except asyncio.TimeoutError:
            proc.kill()
            await proc.wait()

    async def _cleanup_preview(self, project_id: str) -> None:
        """Remove a preview from the in-memory registry and release its port."""
        async with self._lock:
            preview = self._previews.pop(project_id, None)
        if preview:
            await self._release_port(project_id, preview.port)

    async def _auto_stop_loop(self) -> None:
        """Periodically check for idle previews and stop them."""
        while True:
            try:
                await asyncio.sleep(60)
                now = datetime.now(timezone.utc)
                async with self._lock:
                    project_ids = list(self._previews.keys())
                for pid in project_ids:
                    preview = self._previews.get(pid)
                    if not preview:
                        continue
                    # Stop if process already died
                    if preview.process.returncode is not None:
                        logger.info("Preview %s exited (code %s), cleaning up", pid, preview.process.returncode)
                        await self._cleanup_preview(pid)
                        await self._caddy.remove_route(preview.slug)
                        continue
                    # Auto-stop after configured idle time
                    elapsed = (now - preview.started_at).total_seconds() / 60
                    if elapsed > settings.preview_auto_stop_minutes:
                        logger.info("Auto-stopping preview %s (running %.0f min)", pid, elapsed)
                        await self.stop(pid)
            except asyncio.CancelledError:
                return
            except Exception as exc:
                logger.error("Error in auto-stop loop: %s", exc)
