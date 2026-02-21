from pydantic import BaseModel, Field


class ApiKeyCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    service: str = Field(..., min_length=1, max_length=50)
    env_var: str = Field(..., min_length=1, max_length=100, pattern=r"^[A-Z][A-Z0-9_]*$")
    value: str = Field(..., min_length=1)


class ApiKeyUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    service: str | None = Field(None, min_length=1, max_length=50)
    env_var: str | None = Field(None, min_length=1, max_length=100, pattern=r"^[A-Z][A-Z0-9_]*$")
    value: str | None = Field(None, min_length=1)


class ApiKeyInfo(BaseModel):
    id: str
    name: str
    service: str
    env_var: str
    masked_value: str
    created_at: str
    updated_at: str


class ApiKeyValueResponse(BaseModel):
    value: str


class ApiKeyListResponse(BaseModel):
    keys: list[ApiKeyInfo]
    total: int
