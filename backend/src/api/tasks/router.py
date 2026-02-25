from fastapi import APIRouter, Request

from ...schemas.common import APIResponse
from ...schemas.tasks import TaskListResponse

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


@router.get("", response_model=APIResponse[TaskListResponse])
async def list_tasks(request: Request):
    """List all active and recently completed background tasks."""
    task_manager = request.app.state.task_manager
    tasks = task_manager.list_active()
    return APIResponse(data=TaskListResponse(tasks=tasks, total=len(tasks)))


@router.post("/{session_id}/cancel", response_model=APIResponse[dict])
async def cancel_task(session_id: str, request: Request):
    """Cancel a running background task."""
    task_manager = request.app.state.task_manager
    cancelled = await task_manager.cancel_task(session_id)
    if not cancelled:
        return APIResponse(success=False, error="No running task found for this session")
    return APIResponse(data={"session_id": session_id, "cancelled": True})
