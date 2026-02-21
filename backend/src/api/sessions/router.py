from fastapi import APIRouter, Query, Request

from ...schemas.common import APIResponse
from ...schemas.sessions import (
    SessionCreate,
    SessionInfo,
    SessionListResponse,
    SessionUpdate,
)

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


@router.get("", response_model=APIResponse[SessionListResponse])
async def list_sessions(
    request: Request,
    project_id: str = Query(...),
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
):
    service = request.app.state.session_service
    sessions, total = await service.list_sessions(project_id, offset, limit)
    return APIResponse(
        data=SessionListResponse(sessions=sessions, total=total)
    )


@router.post("", response_model=APIResponse[SessionInfo], status_code=201)
async def create_session(body: SessionCreate, request: Request):
    service = request.app.state.session_service
    session = await service.create_session(
        project_id=body.project_id, name=body.name
    )
    return APIResponse(data=session)


@router.get("/{session_id}", response_model=APIResponse[SessionInfo])
async def get_session(session_id: str, request: Request):
    service = request.app.state.session_service
    session = await service.get_session(session_id)
    return APIResponse(data=session)


@router.patch("/{session_id}", response_model=APIResponse[SessionInfo])
async def update_session(
    session_id: str, body: SessionUpdate, request: Request
):
    service = request.app.state.session_service
    session = await service.update_session(session_id, name=body.name)
    return APIResponse(data=session)


@router.delete("/{session_id}", response_model=APIResponse[None])
async def delete_session(session_id: str, request: Request):
    service = request.app.state.session_service
    await service.delete_session(session_id)
    return APIResponse(data=None)
