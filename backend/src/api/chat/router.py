import asyncio
import json
import logging
from pathlib import Path

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query

from ...core.exceptions import ProjectNotFoundError, SessionNotFoundError
from ...core.security import authenticate_websocket
from ...schemas.chat import ChatMessageType
from ...services.credentials.credential_service import CredentialService
from ...services.chat.title_generator import generate_title
from ...services.projects.project_service import ProjectService
from ...services.sessions.session_service import SessionService
from ...services.messages.message_service import MessageService
from ...services.tasks.task_manager import TaskManager

logger = logging.getLogger(__name__)

router = APIRouter()


@router.websocket("/ws/chat")
async def chat_websocket(websocket: WebSocket, token: str = Query(default="")):
    """WebSocket endpoint for bidirectional chat with Claude.

    Protocol:
    - Client sends JSON: send_message, cancel, subscribe, unsubscribe, or ping
    - Server sends JSON events: text_delta, thinking_delta, tool_use_start, etc.
    """
    if not await authenticate_websocket(token):
        await websocket.accept()
        await websocket.close(code=1008, reason="Unauthorized")
        return

    await websocket.accept()

    task_manager: TaskManager = websocket.app.state.task_manager
    session_service: SessionService = websocket.app.state.session_service
    project_service: ProjectService = websocket.app.state.project_service
    credential_service: CredentialService = websocket.app.state.credential_service
    message_service: MessageService = websocket.app.state.message_service

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

            elif msg_type == ChatMessageType.SUBSCRIBE:
                session_id = data.get("session_id")
                if not session_id:
                    continue
                subscribed = await task_manager.subscribe(session_id, websocket)
                if subscribed:
                    replay = task_manager.get_replay(session_id)
                    if replay:
                        events, is_complete = replay
                        await websocket.send_json({
                            "type": "task_replay",
                            "session_id": session_id,
                            "events": events,
                            "is_complete": is_complete,
                        })

            elif msg_type == ChatMessageType.UNSUBSCRIBE:
                session_id = data.get("session_id")
                if session_id:
                    await task_manager.unsubscribe(session_id, websocket)

            elif msg_type == ChatMessageType.CANCEL:
                session_id = data.get("session_id")
                if session_id:
                    await task_manager.cancel_task(session_id)
                    # cancelled event is broadcast by task_manager to all subscribers

            elif msg_type == ChatMessageType.SEND_MESSAGE:
                session_id = data.get("session_id", "")
                project_id = data.get("project_id", "")
                message = data.get("message", "")

                logger.info(
                    "send_message: project_id=%s session_id=%s msg_len=%d",
                    project_id, session_id, len(message),
                )

                if not message or not session_id or not project_id:
                    logger.warning(
                        "send_message missing fields: message=%s session_id=%s project_id=%s",
                        bool(message), bool(session_id), bool(project_id),
                    )
                    await _send_error(
                        websocket, session_id, "Missing required fields"
                    )
                    continue

                if task_manager.is_task_running(session_id):
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
                    logger.warning(
                        "Project not found in DB: project_id=%s", project_id
                    )
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
                                task_manager=task_manager,
                                websocket=websocket,
                                session_service=session_service,
                                credential_service=credential_service,
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
                                task_manager=task_manager,
                                websocket=websocket,
                                session_service=session_service,
                                credential_service=credential_service,
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

                # Start background task (decoupled from this WebSocket)
                try:
                    await task_manager.start_task(
                        session_id=session_id,
                        project_id=project_id,
                        project_path=project_path,
                        message=message,
                        is_continuation=is_continuation,
                        model=data.get("model"),
                        max_budget_usd=data.get("max_budget_usd"),
                    )
                    # Auto-subscribe the sender to the task
                    await task_manager.subscribe(session_id, websocket)
                except RuntimeError as e:
                    await _send_error(websocket, session_id, str(e))

            else:
                await _send_error(
                    websocket, None, f"Unknown message type: {msg_type}"
                )

    except WebSocketDisconnect:
        pass
    finally:
        # CRITICAL: don't cancel tasks — just unsubscribe this WebSocket.
        # Tasks keep running in the background.
        await task_manager.unsubscribe_all(websocket)


async def _generate_session_title(
    task_manager: TaskManager,
    websocket: WebSocket,
    session_service: SessionService,
    credential_service: CredentialService,
    session_id: str,
    message: str,
) -> None:
    """Background task: generates a short AI title and pushes it to the client."""
    try:
        title = await generate_title(message, credential_service)
        if not title:
            return

        await session_service.update_session(session_id, name=title)
        event = {
            "type": "session_renamed",
            "session_id": session_id,
            "name": title,
        }
        # Broadcast to all subscribers of this task (if task exists)
        await task_manager.broadcast_to_task(session_id, event)
        # Also send directly to this websocket in case it's not subscribed yet
        try:
            await websocket.send_json(event)
        except Exception:
            pass  # WebSocket may be closed
    except Exception:
        logger.debug("Title generation failed for session %s", session_id, exc_info=True)


async def _send_error(
    websocket: WebSocket, session_id: str | None, error: str
) -> None:
    await websocket.send_json(
        {"type": "error", "session_id": session_id, "error": error}
    )
