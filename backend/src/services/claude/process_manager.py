import asyncio
import logging
import os
import shutil
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import AsyncIterator

from ...core.config import settings
from ..credentials.credential_service import CredentialService
from ..sessions.session_service import SessionService
from . import command_translator, stream_parser
from .stream_parser import ParsedEvent
from .system_context import CASPERBOT_SYSTEM_CONTEXT

logger = logging.getLogger(__name__)


@dataclass
class RunningProcess:
    session_id: str
    project_id: str
    process: asyncio.subprocess.Process
    started_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    cancelled: bool = False


class ProcessManager:
    """Manages concurrent Claude CLI subprocess instances."""

    def __init__(
        self,
        session_service: SessionService,
        credential_service: CredentialService,
    ) -> None:
        self._processes: dict[str, RunningProcess] = {}
        self._lock = asyncio.Lock()
        self._session_service = session_service
        self._credential_service = credential_service

    @property
    def active_count(self) -> int:
        return len(self._processes)

    def is_session_busy(self, session_id: str) -> bool:
        return session_id in self._processes

    async def run_prompt(
        self,
        session_id: str,
        project_id: str,
        project_path: Path,
        message: str,
        *,
        is_continuation: bool = False,
        model: str | None = None,
        max_budget_usd: float | None = None,
    ) -> AsyncIterator[ParsedEvent]:
        """Spawn a ``claude -p`` process and yield parsed stream events."""

        prompt = command_translator.translate(message)

        # Resolve effective approvals: project override → global default → False
        approvals_enabled = False
        try:
            from ..project_settings.project_settings_service import ProjectSettingsService
            ps_svc = ProjectSettingsService()
            approvals_enabled = await ps_svc.resolve_approvals(project_id)
        except Exception:
            logger.debug("Failed to check approvals setting, defaulting to off")

        cmd = self._build_command(
            session_id=session_id,
            prompt=prompt,
            model=model,
            max_budget_usd=max_budget_usd,
            is_continuation=is_continuation,
            approvals_enabled=approvals_enabled,
        )

        logger.info("Running CLI command for session %s: %s", session_id, " ".join(cmd))

        # Pre-flight: verify the binary exists
        binary_path = shutil.which(settings.claude_binary)
        if binary_path is None:
            logger.error("Claude CLI binary '%s' not found in PATH", settings.claude_binary)
            yield ParsedEvent(
                type="error",
                session_id=session_id,
                data={
                    "error": (
                        f"Claude CLI binary '{settings.claude_binary}' not found in PATH. "
                        "Make sure the Claude CLI is installed and available."
                    )
                },
            )
            return

        # Pre-flight: verify project path exists
        if not project_path.is_dir():
            logger.error("Project path does not exist: %s", project_path)
            yield ParsedEvent(
                type="error",
                session_id=session_id,
                data={"error": f"Project directory not found: {project_path}"},
            )
            return

        # Build a clean env — unset CLAUDECODE to avoid nesting detection,
        # and strip ANTHROPIC_API_KEY so the CLI uses the Claude Code
        # subscription instead of the user's personal API key.
        _cli_blocked_keys = {"CLAUDECODE", "ANTHROPIC_API_KEY"}
        env = {k: v for k, v in os.environ.items() if k not in _cli_blocked_keys}

        # Inject stored credentials as environment variables (excluding
        # ANTHROPIC_API_KEY — that key is only used server-side for
        # title generation, never passed to the CLI).
        # Also respect per-project credential exclusions.
        try:
            creds = await self._credential_service.get_decrypted_env_map()
            # Load per-project exclusions
            excluded: set[str] = set()
            try:
                from ..project_settings.project_settings_service import ProjectSettingsService
                excluded = set(await ProjectSettingsService().list_excluded_credentials(project_id))
            except Exception:
                logger.debug("Failed to load credential exclusions", exc_info=True)
            for var, val in creds.items():
                if var != "ANTHROPIC_API_KEY" and var not in excluded:
                    env[var] = val
        except Exception:
            logger.warning("Failed to load credentials for injection", exc_info=True)

        # Inject project-scoped env vars (override global on conflict)
        try:
            from ..project_settings.project_settings_service import ProjectSettingsService
            project_env = await ProjectSettingsService().get_decrypted_env_map(project_id)
            for var, val in project_env.items():
                env[var] = val
        except Exception:
            logger.debug("Failed to load project env vars", exc_info=True)

        # Run the CLI — if resume fails silently, retry as a new session
        async for event in self._run_cli(
            cmd=cmd,
            session_id=session_id,
            project_id=project_id,
            project_path=project_path,
            env=env,
            is_continuation=is_continuation,
            prompt=prompt,
            model=model,
            max_budget_usd=max_budget_usd,
            approvals_enabled=approvals_enabled,
        ):
            yield event

    async def _run_cli(
        self,
        cmd: list[str],
        session_id: str,
        project_id: str,
        project_path: Path,
        env: dict[str, str],
        is_continuation: bool,
        prompt: str,
        model: str | None,
        max_budget_usd: float | None,
        approvals_enabled: bool = False,
    ) -> AsyncIterator[ParsedEvent]:
        """Execute the CLI subprocess and stream events.

        If a ``--resume`` attempt fails with no output (stale session),
        automatically retries as a brand-new ``--session-id`` invocation.
        """
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdin=asyncio.subprocess.DEVNULL,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=str(project_path),
            env=env,
        )

        running = RunningProcess(
            session_id=session_id,
            project_id=project_id,
            process=process,
        )

        async with self._lock:
            self._processes[session_id] = running

        full_text_parts: list[str] = []
        timeout = settings.process_timeout_seconds

        try:
            assert process.stdout is not None

            # Drain stderr concurrently to prevent pipe buffer deadlock
            stderr_task = asyncio.create_task(self._drain_stderr(process))

            # Collect non-JSON stdout lines for diagnostics
            discarded_lines: list[str] = []

            # Stream stdout — check elapsed time each line to enforce timeout
            async for line in process.stdout:
                if running.cancelled:
                    break

                # Check if we've exceeded timeout
                elapsed = (
                    datetime.now(timezone.utc) - running.started_at
                ).total_seconds()
                if elapsed > timeout:
                    logger.warning(
                        "Process for session %s exceeded timeout of %ds",
                        session_id,
                        timeout,
                    )
                    await self._kill_process(running)
                    yield ParsedEvent(
                        type="error",
                        session_id=session_id,
                        data={
                            "error": f"Request timed out after {timeout}s"
                        },
                    )
                    break

                decoded = line.decode("utf-8", errors="replace").strip()
                if not decoded:
                    continue

                events = stream_parser.parse_line(decoded, session_id)
                if events:
                    for event in events:
                        if event.type == "text_delta":
                            full_text_parts.append(event.data.get("text", ""))
                        yield event
                else:
                    # Non-JSON output — capture for error diagnostics
                    if len(discarded_lines) < 100:
                        discarded_lines.append(decoded)

            await process.wait()
            stderr_text = await stderr_task

            # Handle failure
            if process.returncode != 0 and not running.cancelled:
                has_output = bool(stderr_text or discarded_lines)

                logger.error(
                    "CLI process for session %s failed (exit %d). "
                    "Command: %s | %s",
                    session_id,
                    process.returncode,
                    " ".join(cmd),
                    (
                        " | ".join(
                            ([f"stderr: {stderr_text[:500]}"] if stderr_text else [])
                            + (
                                [
                                    "stdout (non-JSON): "
                                    + "\n".join(discarded_lines[-10:])[:500]
                                ]
                                if discarded_lines
                                else []
                            )
                        )
                        or "(no output)"
                    ),
                )

                # If resume failed silently, retry as a fresh session
                if is_continuation and not has_output:
                    logger.info(
                        "Retrying session %s as new session (resume failed silently)",
                        session_id,
                    )
                    retry_cmd = self._build_command(
                        session_id=session_id,
                        prompt=prompt,
                        model=model,
                        max_budget_usd=max_budget_usd,
                        is_continuation=False,
                        approvals_enabled=approvals_enabled,
                    )
                    # Remove from active processes before retry
                    async with self._lock:
                        self._processes.pop(session_id, None)
                    async for event in self._run_cli(
                        cmd=retry_cmd,
                        session_id=session_id,
                        project_id=project_id,
                        project_path=project_path,
                        env=env,
                        is_continuation=False,
                        prompt=prompt,
                        model=model,
                        max_budget_usd=max_budget_usd,
                        approvals_enabled=approvals_enabled,
                    ):
                        yield event
                    return

                # Build an actionable error message
                if stderr_text:
                    error_msg = stderr_text[:500]
                elif discarded_lines:
                    error_msg = "\n".join(discarded_lines[-5:])
                else:
                    error_msg = (
                        f"The Claude CLI exited with code {process.returncode} "
                        "without any output. Try running 'claude --version' "
                        "in your terminal to verify the CLI works."
                    )

                yield ParsedEvent(
                    type="error",
                    session_id=session_id,
                    data={"error": error_msg},
                )

            # Update session metadata
            full_text = "".join(full_text_parts)
            preview = full_text[:200] if full_text else ""
            await self._session_service.update_after_message(
                session_id=session_id,
                last_message_preview=preview,
            )

        except asyncio.CancelledError:
            await self._kill_process(running)
            raise
        finally:
            async with self._lock:
                self._processes.pop(session_id, None)

    async def cancel(self, session_id: str) -> bool:
        async with self._lock:
            running = self._processes.pop(session_id, None)
            if not running:
                return False
            running.cancelled = True

        await self._kill_process(running)
        return True

    async def cleanup_all(self) -> None:
        async with self._lock:
            session_ids = list(self._processes.keys())
        for sid in session_ids:
            await self.cancel(sid)

    @staticmethod
    async def _drain_stderr(process: asyncio.subprocess.Process) -> str:
        """Drain stderr concurrently to prevent pipe buffer deadlock."""
        assert process.stderr is not None
        chunks: list[bytes] = []
        total = 0
        max_bytes = 16384  # 16KB — enough for most CLI error messages
        try:
            while True:
                chunk = await process.stderr.read(4096)
                if not chunk:
                    break
                if total < max_bytes:
                    chunks.append(chunk[: max_bytes - total])
                total += len(chunk)
        except Exception:
            pass
        return b"".join(chunks).decode("utf-8", errors="replace").strip()

    async def _kill_process(self, running: RunningProcess) -> None:
        proc = running.process
        if proc.returncode is not None:
            return
        try:
            proc.terminate()
            try:
                await asyncio.wait_for(proc.wait(), timeout=5.0)
            except asyncio.TimeoutError:
                proc.kill()
                await proc.wait()
        except ProcessLookupError:
            pass

    def _build_command(
        self,
        session_id: str,
        prompt: str,
        model: str | None,
        max_budget_usd: float | None,
        is_continuation: bool = False,
        approvals_enabled: bool = False,
    ) -> list[str]:
        cmd = [
            settings.claude_binary,
            "-p",
            prompt,
            "--output-format",
            "stream-json",
            "--verbose",
        ]

        if is_continuation:
            # Resume an existing session — pass session ID as --resume value
            cmd.extend(["--resume", session_id])
        else:
            # First message — create a new CLI session with this ID
            cmd.extend(["--session-id", session_id])

        cmd.extend(["--model", model or settings.default_model])

        budget = max_budget_usd or settings.max_budget_usd
        cmd.extend(["--max-budget-usd", str(budget)])

        if settings.fallback_model:
            cmd.extend(["--fallback-model", settings.fallback_model])

        # Pre-approve all tools so the CLI never blocks for permission
        # (unless the user has enabled approvals for this project)
        if not approvals_enabled:
            cmd.extend([
                "--allowedTools",
                "Read",
                "Write",
                "Edit",
                "Glob",
                "Grep",
                "Bash(*)",
                "WebFetch",
                "WebSearch",
                "NotebookEdit",
            ])

        # Inject CasperBot system context so Claude is always self-aware
        cmd.extend(["--append-system-prompt", CASPERBOT_SYSTEM_CONTEXT])

        return cmd
