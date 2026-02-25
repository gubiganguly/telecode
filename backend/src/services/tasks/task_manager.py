"""TaskManager — owns Claude process lifecycle independently of WebSocket connections.

WebSocket connections subscribe/unsubscribe to tasks. Processes keep running
even when all subscribers disconnect. Events are buffered server-side and
replayed on reconnect.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import TYPE_CHECKING

from ...core.config import settings

if TYPE_CHECKING:
    from fastapi import WebSocket

    from ..claude.process_manager import ProcessManager
    from ..messages.message_service import MessageService
    from ..sessions.session_service import SessionService

logger = logging.getLogger(__name__)


@dataclass
class BackgroundTask:
    session_id: str
    project_id: str
    status: str = "running"  # running | completed | cancelled | error | waiting_for_input
    started_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: datetime | None = None
    event_buffer: list[dict] = field(default_factory=list)
    subscribers: set[WebSocket] = field(default_factory=set)
    asyncio_task: asyncio.Task | None = None
    # Accumulators for message persistence
    full_content: str = ""
    full_thinking: str = ""
    tool_uses_acc: list[dict] = field(default_factory=list)
    final_usage: dict | None = None
    final_cost: float | None = None


def _event_to_json(event, session_id: str) -> dict | None:
    """Convert a ParsedEvent to a JSON-serializable dict for the frontend."""
    base: dict = {"type": event.type, "session_id": session_id}

    if event.type == "text_delta":
        base["text"] = event.data.get("text", "")
    elif event.type == "thinking_delta":
        base["thinking"] = event.data.get("thinking", "")
    elif event.type == "tool_use_start":
        base["tool_name"] = event.data.get("tool_name", "")
        base["tool_id"] = event.data.get("tool_id", "")
        base["input"] = event.data.get("input", {})
    elif event.type == "tool_result":
        base["tool_id"] = event.data.get("tool_id", "")
        base["output"] = event.data.get("output", "")
        base["is_error"] = event.data.get("is_error", False)
    elif event.type == "message_complete":
        base["result_text"] = event.data.get("result_text", "")
        base["usage"] = event.data.get("usage")
        base["cost_usd"] = event.data.get("cost_usd")
    elif event.type == "error":
        base["error"] = event.data.get("error", "Unknown error")
        base["code"] = event.data.get("code")
    else:
        base.update(event.data)

    return base


class TaskManager:
    """Manages background Claude tasks independently of WebSocket connections."""

    def __init__(
        self,
        process_manager: ProcessManager,
        message_service: MessageService,
        session_service: SessionService,
    ) -> None:
        self._tasks: dict[str, BackgroundTask] = {}
        self._lock = asyncio.Lock()
        self._process_manager = process_manager
        self._message_service = message_service
        self._session_service = session_service
        self._cleanup_loop_task: asyncio.Task | None = None

    # -- Lifecycle --

    async def startup(self) -> None:
        self._cleanup_loop_task = asyncio.create_task(self._cleanup_loop())

    async def shutdown(self) -> None:
        if self._cleanup_loop_task:
            self._cleanup_loop_task.cancel()
            try:
                await self._cleanup_loop_task
            except asyncio.CancelledError:
                pass

        # Cancel all running tasks and persist what we can
        async with self._lock:
            session_ids = list(self._tasks.keys())
        for sid in session_ids:
            await self.cancel_task(sid)

    # -- Task creation --

    async def start_task(
        self,
        session_id: str,
        project_id: str,
        project_path: Path,
        message: str,
        is_continuation: bool,
        model: str | None,
        max_budget_usd: float | None,
    ) -> BackgroundTask:
        """Start a new background task. Returns the task immediately."""
        async with self._lock:
            running_count = sum(
                1 for t in self._tasks.values() if t.status == "running"
            )
            if running_count >= settings.max_concurrent_tasks:
                raise RuntimeError(
                    f"Maximum concurrent tasks ({settings.max_concurrent_tasks}) reached. "
                    "Wait for a task to complete or cancel one."
                )

            # Clean up any finished task for this session
            existing = self._tasks.get(session_id)
            if existing and existing.status == "running":
                raise RuntimeError("Session is busy. Cancel the current request first.")
            if existing:
                del self._tasks[session_id]

            task = BackgroundTask(
                session_id=session_id,
                project_id=project_id,
            )
            self._tasks[session_id] = task

        # Spawn the background coroutine
        task.asyncio_task = asyncio.create_task(
            self._run_task(
                task=task,
                project_path=project_path,
                message=message,
                is_continuation=is_continuation,
                model=model,
                max_budget_usd=max_budget_usd,
            )
        )

        return task

    # -- Subscription --

    async def subscribe(self, session_id: str, websocket: WebSocket) -> bool:
        """Subscribe a WebSocket to a task. Returns True if task exists."""
        async with self._lock:
            task = self._tasks.get(session_id)
            if not task:
                return False
            task.subscribers.add(websocket)
            return True

    def get_replay(self, session_id: str) -> tuple[list[dict], bool] | None:
        """Get buffered events for replay. Returns (events, is_complete) or None."""
        task = self._tasks.get(session_id)
        if not task:
            return None
        is_complete = task.status != "running"
        return list(task.event_buffer), is_complete

    async def unsubscribe(self, session_id: str, websocket: WebSocket) -> None:
        """Remove a WebSocket from a task's subscriber list."""
        async with self._lock:
            task = self._tasks.get(session_id)
            if task:
                task.subscribers.discard(websocket)

    async def unsubscribe_all(self, websocket: WebSocket) -> None:
        """Remove a WebSocket from ALL tasks. Called on disconnect."""
        async with self._lock:
            for task in self._tasks.values():
                task.subscribers.discard(websocket)

    # -- Cancellation --

    async def cancel_task(self, session_id: str) -> bool:
        """Cancel a running task. Broadcasts cancelled event to all subscribers."""
        async with self._lock:
            task = self._tasks.get(session_id)
            if not task or task.status != "running":
                return False

        # Kill the process
        cancelled = await self._process_manager.cancel(session_id)

        # Cancel the asyncio task
        if task.asyncio_task and not task.asyncio_task.done():
            task.asyncio_task.cancel()

        task.status = "cancelled"
        task.completed_at = datetime.now(timezone.utc)

        # Persist whatever we have so far
        await self._persist_assistant(task)

        # Broadcast cancellation to all subscribers
        cancel_event = {"type": "cancelled", "session_id": session_id}
        task.event_buffer.append(cancel_event)
        await self._broadcast(task, cancel_event)

        return cancelled or True

    # -- Monitoring --

    def is_task_running(self, session_id: str) -> bool:
        task = self._tasks.get(session_id)
        return task is not None and task.status == "running"

    def list_active(self) -> list[dict]:
        """Return summary of all tasks for REST endpoint."""
        now = datetime.now(timezone.utc)
        result = []
        for task in self._tasks.values():
            elapsed = (now - task.started_at).total_seconds()
            result.append({
                "session_id": task.session_id,
                "project_id": task.project_id,
                "status": task.status,
                "started_at": task.started_at.isoformat(),
                "completed_at": task.completed_at.isoformat() if task.completed_at else None,
                "event_count": len(task.event_buffer),
                "subscriber_count": len(task.subscribers),
                "elapsed_seconds": round(elapsed, 1),
            })
        return result

    # -- Broadcasting --

    async def broadcast_to_task(self, session_id: str, event_json: dict) -> None:
        """Broadcast an event to all subscribers of a task (for title generation etc)."""
        task = self._tasks.get(session_id)
        if task:
            await self._broadcast(task, event_json)

    async def _broadcast(self, task: BackgroundTask, event_json: dict) -> None:
        """Send an event to all subscribers, silently removing dead connections."""
        dead: list[WebSocket] = []
        for ws in task.subscribers:
            try:
                await ws.send_json(event_json)
            except Exception:
                dead.append(ws)
        for ws in dead:
            task.subscribers.discard(ws)

    # -- Core task runner --

    async def _run_task(
        self,
        task: BackgroundTask,
        project_path: Path,
        message: str,
        is_continuation: bool,
        model: str | None,
        max_budget_usd: float | None,
    ) -> None:
        """Background coroutine that consumes process events, buffers, and broadcasts."""
        session_id = task.session_id

        try:
            # Send message_start
            start_event = {"type": "message_start", "session_id": session_id}
            task.event_buffer.append(start_event)
            await self._broadcast(task, start_event)

            async for event in self._process_manager.run_prompt(
                session_id=session_id,
                project_id=task.project_id,
                project_path=project_path,
                message=message,
                is_continuation=is_continuation,
                model=model,
                max_budget_usd=max_budget_usd,
            ):
                outbound = _event_to_json(event, session_id)
                if not outbound:
                    continue

                # Buffer the event
                task.event_buffer.append(outbound)

                # Broadcast to all subscribers
                await self._broadcast(task, outbound)

                # Accumulate for persistence
                if event.type == "text_delta":
                    task.full_content += event.data.get("text", "")
                elif event.type == "thinking_delta":
                    task.full_thinking += event.data.get("thinking", "")
                elif event.type == "tool_use_start":
                    task.tool_uses_acc.append({
                        "toolId": event.data.get("tool_id", ""),
                        "toolName": event.data.get("tool_name", ""),
                        "input": event.data.get("input", {}),
                        "isComplete": False,
                    })
                elif event.type == "tool_result":
                    tool_id = event.data.get("tool_id", "")
                    for tu in task.tool_uses_acc:
                        if tu["toolId"] == tool_id:
                            tu["output"] = event.data.get("output", "")
                            tu["isError"] = event.data.get("is_error", False)
                            tu["isComplete"] = True
                            break
                elif event.type == "message_complete":
                    task.final_usage = event.data.get("usage")
                    task.final_cost = event.data.get("cost_usd")

                # AskUserQuestion: kill process, set waiting_for_input
                if (
                    event.type == "tool_use_start"
                    and event.data.get("tool_name") == "AskUserQuestion"
                ):
                    await self._process_manager.cancel(session_id)
                    task.status = "waiting_for_input"
                    task.completed_at = datetime.now(timezone.utc)
                    await self._persist_assistant(task)

                    input_event = {"type": "input_required", "session_id": session_id}
                    task.event_buffer.append(input_event)
                    await self._broadcast(task, input_event)
                    return

            # Stream completed successfully
            task.status = "completed"
            task.completed_at = datetime.now(timezone.utc)
            await self._persist_assistant(task)

        except asyncio.CancelledError:
            # Cancelled by cancel_task() — persistence handled there
            pass
        except Exception:
            logger.exception("Task error for session %s", session_id)
            task.status = "error"
            task.completed_at = datetime.now(timezone.utc)
            await self._persist_assistant(task)

            error_event = {
                "type": "error",
                "session_id": session_id,
                "error": "Something went wrong processing your message. Please try again.",
            }
            task.event_buffer.append(error_event)
            await self._broadcast(task, error_event)
        finally:
            # Ensure process is cleaned up
            if self._process_manager.is_session_busy(session_id):
                logger.warning(
                    "Force-cleaning busy session %s after task ended", session_id
                )
                await self._process_manager.cancel(session_id)

    # -- Persistence --

    async def _persist_assistant(self, task: BackgroundTask) -> None:
        """Save accumulated assistant message to SQLite."""
        if not (task.full_content or task.full_thinking or task.tool_uses_acc):
            return
        try:
            await self._message_service.save_message(
                session_id=task.session_id,
                role="assistant",
                content=task.full_content,
                thinking=task.full_thinking,
                tool_uses=task.tool_uses_acc,
                usage=task.final_usage,
                cost_usd=task.final_cost,
            )
        except Exception:
            logger.warning(
                "Failed to persist assistant message for session %s",
                task.session_id,
                exc_info=True,
            )

    # -- Cleanup --

    async def _cleanup_loop(self) -> None:
        """Periodically remove completed task buffers past TTL."""
        while True:
            try:
                await asyncio.sleep(60)
                await self._cleanup_expired()
            except asyncio.CancelledError:
                break
            except Exception:
                logger.warning("Cleanup loop error", exc_info=True)

    async def _cleanup_expired(self) -> None:
        now = datetime.now(timezone.utc)
        ttl = settings.task_buffer_ttl_seconds
        async with self._lock:
            expired = [
                sid
                for sid, task in self._tasks.items()
                if task.status != "running"
                and task.completed_at
                and (now - task.completed_at).total_seconds() > ttl
            ]
            for sid in expired:
                del self._tasks[sid]
                logger.debug("Cleaned up expired task buffer for session %s", sid)
