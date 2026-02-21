from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field


# -- Inbound (frontend -> backend) --


class ChatMessageType(str, Enum):
    SEND_MESSAGE = "send_message"
    CANCEL = "cancel"
    PING = "ping"


class SendMessagePayload(BaseModel):
    type: Literal["send_message"] = "send_message"
    message: str = Field(..., min_length=1)
    session_id: str
    project_id: str
    model: str | None = None
    max_budget_usd: float | None = None


class CancelPayload(BaseModel):
    type: Literal["cancel"] = "cancel"
    session_id: str


class PingPayload(BaseModel):
    type: Literal["ping"] = "ping"


# -- Outbound (backend -> frontend) --


class OutboundEventType(str, Enum):
    TEXT_DELTA = "text_delta"
    THINKING_DELTA = "thinking_delta"
    TOOL_USE_START = "tool_use_start"
    TOOL_USE_DELTA = "tool_use_delta"
    TOOL_RESULT = "tool_result"
    MESSAGE_START = "message_start"
    MESSAGE_COMPLETE = "message_complete"
    ERROR = "error"
    CANCELLED = "cancelled"
    PONG = "pong"
    SESSION_CREATED = "session_created"
