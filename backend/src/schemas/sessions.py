from pydantic import BaseModel, Field


class SessionCreate(BaseModel):
    project_id: str
    name: str = Field(default="New Chat", max_length=200)


class SessionUpdate(BaseModel):
    name: str | None = Field(None, max_length=200)


class SessionInfo(BaseModel):
    id: str
    project_id: str
    name: str
    created_at: str
    updated_at: str
    last_message: str
    message_count: int
    is_active: bool


class SessionListResponse(BaseModel):
    sessions: list[SessionInfo]
    total: int
