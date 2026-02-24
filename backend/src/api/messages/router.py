from fastapi import APIRouter, Query, Request

from ...schemas.common import APIResponse
from ...schemas.messages import MessageListResponse

router = APIRouter(prefix="/api/messages", tags=["messages"])


@router.get("", response_model=APIResponse[MessageListResponse])
async def list_messages(
    request: Request,
    session_id: str = Query(...),
    offset: int = Query(0, ge=0),
    limit: int = Query(200, ge=1, le=500),
):
    service = request.app.state.message_service
    messages, total = await service.list_messages(session_id, offset, limit)
    return APIResponse(
        data=MessageListResponse(messages=messages, total=total)
    )
