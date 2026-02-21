from pydantic import BaseModel, Field


class CommandInfo(BaseModel):
    name: str
    command: str
    description: str
    content: str
    is_builtin: bool
    source: str  # "builtin" | "custom"


class CommandCreate(BaseModel):
    name: str = Field(
        ..., min_length=1, max_length=100, pattern=r"^[a-z][a-z0-9-]*$"
    )
    content: str = Field(..., min_length=1)


class CommandUpdate(BaseModel):
    content: str = Field(..., min_length=1)


class CommandListResponse(BaseModel):
    commands: list[CommandInfo]
    total: int


class CommandGenerateRequest(BaseModel):
    name: str = Field(
        ..., min_length=1, max_length=100, pattern=r"^[a-z][a-z0-9-]*$"
    )
    description: str = Field(..., min_length=10, max_length=1000)


class CommandGenerateResponse(BaseModel):
    content: str
