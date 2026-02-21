from pydantic import BaseModel, Field


class McpServerConfig(BaseModel):
    name: str
    command: str | None = None
    args: list[str] | None = None
    url: str | None = None


class McpListResponse(BaseModel):
    mcps: list[McpServerConfig]
    total: int


class McpInstallRequest(BaseModel):
    query: str = Field(..., min_length=3, max_length=500)


class McpInstallResponse(BaseModel):
    success: bool
    name: str
    message: str
    command_executed: str
