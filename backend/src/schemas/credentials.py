from pydantic import BaseModel, Field


class CredentialCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    service: str = Field(..., min_length=1, max_length=50)
    env_var: str = Field(..., min_length=1, max_length=100, pattern=r"^[A-Z][A-Z0-9_]*$")
    value: str = Field(..., min_length=1)


class CredentialUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    service: str | None = Field(None, min_length=1, max_length=50)
    env_var: str | None = Field(None, min_length=1, max_length=100, pattern=r"^[A-Z][A-Z0-9_]*$")
    value: str | None = Field(None, min_length=1)


class CredentialInfo(BaseModel):
    id: str
    name: str
    service: str
    env_var: str
    masked_value: str
    created_at: str
    updated_at: str


class CredentialValueResponse(BaseModel):
    value: str


class CredentialListResponse(BaseModel):
    credentials: list[CredentialInfo]
    total: int
