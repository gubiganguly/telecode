import json
import logging
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class ParsedEvent:
    """A normalized event ready to send over WebSocket."""

    type: str
    session_id: str
    data: dict[str, Any] = field(default_factory=dict)


def parse_line(line: str, session_id: str) -> list[ParsedEvent]:
    """Parse a single NDJSON line from ``claude --output-format stream-json``.

    Returns zero or more ``ParsedEvent`` instances.
    """
    try:
        raw = json.loads(line)
    except json.JSONDecodeError:
        logger.debug("Non-JSON output from CLI (session %s): %s", session_id, line[:200])
        return []

    events: list[ParsedEvent] = []
    msg_type = raw.get("type", "")

    if msg_type == "assistant":
        events.extend(_parse_assistant(raw, session_id))
    elif msg_type == "result":
        events.append(
            ParsedEvent(
                type="message_complete",
                session_id=raw.get("session_id", session_id),
                data={
                    "result_text": raw.get("result", ""),
                    "usage": raw.get("usage"),
                    "cost_usd": raw.get("cost_usd"),
                },
            )
        )
    elif msg_type == "error":
        events.append(
            ParsedEvent(
                type="error",
                session_id=session_id,
                data={
                    "error": raw.get("message", "Unknown error"),
                    "code": raw.get("code"),
                },
            )
        )
    elif msg_type:
        # CLI sent an event type we don't handle — log for visibility
        logger.debug("Unhandled CLI event type '%s' (session %s)", msg_type, session_id)

    return events


def _parse_assistant(raw: dict, session_id: str) -> list[ParsedEvent]:
    """Parse an ``assistant`` type message from the CLI stream."""
    events: list[ParsedEvent] = []
    message = raw.get("message", {})

    # The CLI wraps content in a message object with a content array
    content_blocks = message.get("content", [])
    if isinstance(content_blocks, list):
        for block in content_blocks:
            events.extend(_parse_content_block(block, session_id))

    return events


def _parse_content_block(block: dict, session_id: str) -> list[ParsedEvent]:
    """Parse a single content block from the assistant message."""
    events: list[ParsedEvent] = []
    block_type = block.get("type", "")

    if block_type == "text":
        text = block.get("text", "")
        if text:
            events.append(
                ParsedEvent(
                    type="text_delta",
                    session_id=session_id,
                    data={"text": text},
                )
            )

    elif block_type == "thinking":
        thinking = block.get("thinking", "")
        if thinking:
            events.append(
                ParsedEvent(
                    type="thinking_delta",
                    session_id=session_id,
                    data={"thinking": thinking},
                )
            )

    elif block_type == "tool_use":
        events.append(
            ParsedEvent(
                type="tool_use_start",
                session_id=session_id,
                data={
                    "tool_name": block.get("name", ""),
                    "tool_id": block.get("id", ""),
                    "input": block.get("input", {}),
                },
            )
        )

    elif block_type == "tool_result":
        content = block.get("content", "")
        if isinstance(content, list):
            content = "\n".join(
                c.get("text", "") for c in content if c.get("type") == "text"
            )
        events.append(
            ParsedEvent(
                type="tool_result",
                session_id=session_id,
                data={
                    "tool_id": block.get("tool_use_id", ""),
                    "output": content,
                    "is_error": block.get("is_error", False),
                },
            )
        )

    return events
