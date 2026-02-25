from pydantic import BaseModel


class TaskInfo(BaseModel):
    session_id: str
    project_id: str
    status: str  # running | completed | cancelled | error | waiting_for_input
    started_at: str
    completed_at: str | None
    event_count: int
    subscriber_count: int
    elapsed_seconds: float


class TaskListResponse(BaseModel):
    tasks: list[TaskInfo]
    total: int
