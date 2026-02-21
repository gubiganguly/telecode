from fastapi import APIRouter, Request

from ...schemas.common import APIResponse
from ...schemas.mcps import McpInstallRequest, McpInstallResponse, McpListResponse

router = APIRouter(prefix="/api/mcps", tags=["mcps"])


@router.get("", response_model=APIResponse[McpListResponse])
async def list_mcps(request: Request):
    service = request.app.state.mcp_service
    mcps = await service.list_mcps()
    return APIResponse(data=McpListResponse(mcps=mcps, total=len(mcps)))


@router.post("/install", response_model=APIResponse[McpInstallResponse])
async def install_mcp(body: McpInstallRequest, request: Request):
    service = request.app.state.mcp_service
    api_key_service = request.app.state.api_key_service
    result = await service.install_mcp(
        query=body.query,
        api_key_service=api_key_service,
    )
    return APIResponse(data=McpInstallResponse(**result))
