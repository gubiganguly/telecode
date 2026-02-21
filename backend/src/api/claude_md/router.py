from fastapi import APIRouter, Request

from ...schemas.common import APIResponse
from ...schemas.claude_md import ClaudeMdResponse, ClaudeMdUpdate

router = APIRouter(prefix="/api/claude-md", tags=["claude-md"])


@router.get("", response_model=APIResponse[ClaudeMdResponse])
async def get_claude_md(request: Request):
    service = request.app.state.claude_md_service
    result = await service.get_claude_md()
    return APIResponse(data=ClaudeMdResponse(**result))


@router.put("", response_model=APIResponse[ClaudeMdResponse])
async def update_claude_md(body: ClaudeMdUpdate, request: Request):
    service = request.app.state.claude_md_service
    result = await service.update_claude_md(content=body.content)
    return APIResponse(data=ClaudeMdResponse(**result))
