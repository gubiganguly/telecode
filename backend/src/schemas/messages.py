from pydantic import BaseModel


class MessageInfo(BaseModel):
    id: str
    session_id: str
    role: str
    content: str
    thinking: str
    tool_uses: list[dict]
    usage: dict | None
    cost_usd: float | None
    created_at: str


class MessageListResponse(BaseModel):
    messages: list[MessageInfo]
    total: int
