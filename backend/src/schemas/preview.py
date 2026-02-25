from pydantic import BaseModel


class PreviewDetection(BaseModel):
    supported: bool
    framework: str | None = None
    needs_install: bool = False
    subdir: str | None = None


class PreviewInfo(BaseModel):
    project_id: str
    port: int
    framework: str | None
    status: str  # "running", "stopped", "error"
    url: str | None = None
    started_at: str | None = None
    error: str | None = None


class PreviewLogsResponse(BaseModel):
    logs: list[str]
    total_lines: int
