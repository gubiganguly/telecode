from pydantic import BaseModel, Field


class ClaudeMdResponse(BaseModel):
    content: str
    synced_projects: int = 0


class ClaudeMdUpdate(BaseModel):
    content: str = Field(..., min_length=0, max_length=50000)
