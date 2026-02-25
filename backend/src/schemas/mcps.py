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


class MissingCredential(BaseModel):
    env_var: str
    name: str
    description: str


class McpInstallResponse(BaseModel):
    success: bool
    name: str
    message: str
    command_executed: str
    missing_credentials: list[MissingCredential] = []


class McpCredentialInstall(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    service: str = Field(..., min_length=1, max_length=50)
    env_var: str = Field(..., min_length=1, max_length=100, pattern=r"^[A-Z][A-Z0-9_]*$")
    value: str = Field(..., min_length=1)
