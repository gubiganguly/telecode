from pydantic import BaseModel, Field


class UrlFetchRequest(BaseModel):
    url: str = Field(..., min_length=1)


class UrlFetchResponse(BaseModel):
    url: str
    content: str
    title: str
    truncated: bool
