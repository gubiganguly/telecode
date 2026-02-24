import asyncio
import json
import logging
from pathlib import Path

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query

from ...core.exceptions import ProjectNotFoundError, SessionNotFoundError
from ...core.security import authenticate_websocket
from ...schemas.chat import ChatMessageType
from ...services.api_keys.api_key_service import ApiKeyService
from ...services.chat.title_generator import generate_title
from ...services.claude.process_manager import ProcessManager
from ...services.claude.stream_parser import ParsedEvent
from ...services.projects.project_service import ProjectService
from ...services.sessions.session_service import SessionService
from ...services.messages.message_service import MessageService

logger = logging.getLogger(__name__)

router = APIRouter()


@router.websocket("/ws/chat")
async def chat_websocket(websocket: WebSocket, token: str = Query(default="")):
    """WebSocket endpoint for bidirectional chat with Claude.

    Protocol:
    - Client sends JSON: send_message, cancel, or ping
    - Server sends JSON events: text_delta, thinking_delta, tool_use_start, etc.
    """
    if not await authenticate_websocket(token):
        await websocket.accept()
        await websocket.close(code=1008, reason="Unauthorized")
        return

    await websocket.accept()

    process_manager: ProcessManager = websocket.app.state.process_manager
    session_service: SessionService = websocket.app.state.session_service
    project_service: ProjectService = websocket.app.state.project_service
    api_key_service: ApiKeyService = websocket.app.state.api_key_service
    message_service: MessageService = websocket.app.state.message_service

    running_tasks: dict[str, asyncio.Task] = {}

    try:
        while True:
            raw = await websocket.receive_text()

            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                await _send_error(websocket, None, "Invalid JSON")
                continue

            msg_type = data.get("type")

            if msg_type == ChatMessageType.PING:
                await websocket.send_json({"type": "pong"})

            elif msg_type == ChatMessageType.CANCEL:
                session_id = data.get("session_id")
                if session_id:
                    cancelled = await process_manager.cancel(session_id)
                    if cancelled:
                        await websocket.send_json(
                            {"type": "cancelled", "session_id": session_id}
                        )
                    task = running_tasks.pop(session_id, None)
                    if task:
                        task.cancel()

            elif msg_type == ChatMessageType.SEND_MESSAGE:
                session_id = data.get("session_id", "")
                project_id = data.get("project_id", "")
                message = data.get("message", "")

                if not message or not session_id or not project_id:
                    await _send_error(
                        websocket, session_id, "Missing required fields"
                    )
                    continue

                if process_manager.is_session_busy(session_id):
                    await _send_error(
                        websocket,
                        session_id,
                        "Session is busy. Cancel the current request first.",
                    )
                    continue

                # Validate project exists and resolve path first
                try:
                    project = await project_service.get_project(project_id)
                    project_path = Path(project["path"])
                except ProjectNotFoundError:
                    await _send_error(
                        websocket, session_id, "Project not found"
                    )
                    continue
                except Exception as e:
                    logger.error("Failed to resolve project %s: %s", project_id, e)
                    await _send_error(
                        websocket, session_id, "Failed to load project"
                    )
                    continue

                # Determine if this is a new session or continuation
                is_continuation = False
                try:
                    existing = await session_service.get_session(session_id)
                    # Validate session belongs to this project
                    if existing["project_id"] != project_id:
                        await _send_error(
                            websocket,
                            session_id,
                            "Session does not belong to this project",
                        )
                        continue
                    is_continuation = True

                    # First real message in a pre-created session — generate a title
                    if existing.get("message_count", 0) == 0:
                        asyncio.create_task(
                            _generate_session_title(
                                websocket=websocket,
                                session_service=session_service,
                                api_key_service=api_key_service,
                                session_id=session_id,
                                message=message,
                            )
                        )
                except SessionNotFoundError:
                    # New session — create it. Wrap in try/except to handle
                    # the race condition where two messages create the same
                    # session simultaneously.
                    try:
                        await session_service.create_session(
                            project_id=project_id,
                            name=message[:50],
                            session_id=session_id,
                        )
                    except Exception:
                        # Session was likely created by a concurrent request —
                        # treat as continuation.
                        logger.info(
                            "Session %s created concurrently, treating as continuation",
                            session_id,
                        )
                        is_continuation = True
                    else:
                        is_continuation = False
                        await websocket.send_json(
                            {
                                "type": "session_created",
                                "session_id": session_id,
                                "project_id": project_id,
                            }
                        )
                        # Generate a smart title in the background
                        asyncio.create_task(
                            _generate_session_title(
                                websocket=websocket,
                                session_service=session_service,
                                api_key_service=api_key_service,
                                session_id=session_id,
                                message=message,
                            )
                        )

                # Persist user message
                try:
                    await message_service.save_message(
                        session_id=session_id, role="user", content=message
                    )
                except Exception:
                    logger.warning("Failed to persist user message for session %s", session_id, exc_info=True)

                # Stream in a background task
                task = asyncio.create_task(
                    _stream_response(
                        websocket=websocket,
                        process_manager=process_manager,
                        message_service=message_service,
                        session_id=session_id,
                        project_id=project_id,
                        project_path=project_path,
                        message=message,
                        is_continuation=is_continuation,
                        model=data.get("model"),
                        max_budget_usd=data.get("max_budget_usd"),
                    )
                )
                running_tasks[session_id] = task

            else:
                await _send_error(
                    websocket, None, f"Unknown message type: {msg_type}"
                )

    except WebSocketDisconnect:
        pass
    finally:
        for session_id, task in running_tasks.items():
            task.cancel()
            await process_manager.cancel(session_id)


async def _stream_response(
    websocket: WebSocket,
    process_manager: ProcessManager,
    message_service: MessageService,
    session_id: str,
    project_id: str,
    project_path: Path,
    message: str,
    is_continuation: bool,
    model: str | None,
    max_budget_usd: float | None,
) -> None:
    """Background task: streams Claude's response events to the WebSocket."""
    # Accumulators for persisting the assistant message
    full_content = ""
    full_thinking = ""
    tool_uses_acc: list[dict] = []
    final_usage = None
    final_cost = None

    async def _persist_assistant():
        if full_content or full_thinking or tool_uses_acc:
            try:
                await message_service.save_message(
                    session_id=session_id,
                    role="assistant",
                    content=full_content,
                    thinking=full_thinking,
                    tool_uses=tool_uses_acc,
                    usage=final_usage,
                    cost_usd=final_cost,
                )
            except Exception:
                logger.warning(
                    "Failed to persist assistant message for session %s",
                    session_id,
                    exc_info=True,
                )

    try:
        await websocket.send_json(
            {"type": "message_start", "session_id": session_id}
        )

        async for event in process_manager.run_prompt(
            session_id=session_id,
            project_id=project_id,
            project_path=project_path,
            message=message,
            is_continuation=is_continuation,
            model=model,
            max_budget_usd=max_budget_usd,
        ):
            outbound = _event_to_json(event)
            if outbound:
                await websocket.send_json(outbound)

            # Accumulate content for persistence
            if event.type == "text_delta":
                full_content += event.data.get("text", "")
            elif event.type == "thinking_delta":
                full_thinking += event.data.get("thinking", "")
            elif event.type == "tool_use_start":
                tool_uses_acc.append({
                    "toolId": event.data.get("tool_id", ""),
                    "toolName": event.data.get("tool_name", ""),
                    "input": event.data.get("input", {}),
                    "isComplete": False,
                })
            elif event.type == "tool_result":
                tool_id = event.data.get("tool_id", "")
                for tu in tool_uses_acc:
                    if tu["toolId"] == tool_id:
                        tu["output"] = event.data.get("output", "")
                        tu["isError"] = event.data.get("is_error", False)
                        tu["isComplete"] = True
                        break
            elif event.type == "message_complete":
                final_usage = event.data.get("usage")
                final_cost = event.data.get("cost_usd")

            # When AskUserQuestion is detected, stop streaming and wait for user input.
            # The CLI blocks on stdin (PIPE) waiting for an answer it won't get,
            # so we kill the process and let the user's answer trigger a new --resume.
            if (
                event.type == "tool_use_start"
                and event.data.get("tool_name") == "AskUserQuestion"
            ):
                await process_manager.cancel(session_id)
                await _persist_assistant()
                await websocket.send_json(
                    {"type": "input_required", "session_id": session_id}
                )
                return

        # Stream completed successfully — persist
        await _persist_assistant()

    except asyncio.CancelledError:
        pass
    except Exception as e:
        logger.exception("Streaming error for session %s", session_id)
        try:
            await _send_error(
                websocket,
                session_id,
                "Something went wrong processing your message. Please try again.",
            )
        except Exception:
            pass  # WebSocket may already be closed
    finally:
        # Ensure the process is cleaned up even if the generator was
        # interrupted mid-stream (e.g. WebSocket send failure). Without
        # this, the async generator's finally block may never execute and
        # the session stays permanently "busy".
        if process_manager.is_session_busy(session_id):
            logger.warning(
                "Force-cleaning busy session %s after stream ended", session_id
            )
            await process_manager.cancel(session_id)


def _event_to_json(event: ParsedEvent) -> dict | None:
    """Convert a ParsedEvent to a JSON-serializable dict for the frontend."""
    base = {"type": event.type, "session_id": event.session_id}

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


async def _generate_session_title(
    websocket: WebSocket,
    session_service: SessionService,
    api_key_service: ApiKeyService,
    session_id: str,
    message: str,
) -> None:
    """Background task: generates a short AI title and pushes it to the client."""
    try:
        title = await generate_title(message, api_key_service)
        if not title:
            return

        await session_service.update_session(session_id, name=title)
        await websocket.send_json(
            {
                "type": "session_renamed",
                "session_id": session_id,
                "name": title,
            }
        )
    except Exception:
        logger.debug("Title generation failed for session %s", session_id, exc_info=True)


async def _send_error(
    websocket: WebSocket, session_id: str | None, error: str
) -> None:
    await websocket.send_json(
        {"type": "error", "session_id": session_id, "error": error}
    )
