from fastapi import APIRouter, Request

from ...schemas.common import APIResponse
from ...schemas.mcps import McpCredentialInstall, McpInstallRequest, McpInstallResponse, McpListResponse

router = APIRouter(prefix="/api/mcps", tags=["mcps"])


@router.get("", response_model=APIResponse[McpListResponse])
async def list_mcps(request: Request):
    service = request.app.state.mcp_service
    mcps = await service.list_mcps()
    return APIResponse(data=McpListResponse(mcps=mcps, total=len(mcps)))


@router.post("/install", response_model=APIResponse[McpInstallResponse])
async def install_mcp(body: McpInstallRequest, request: Request):
    service = request.app.state.mcp_service
    credential_service = request.app.state.credential_service
    result = await service.install_mcp(
        query=body.query,
        credential_service=credential_service,
    )
    return APIResponse(data=McpInstallResponse(**result))


@router.post("/install-credential", response_model=APIResponse[None], status_code=201)
async def install_mcp_credential(body: McpCredentialInstall, request: Request):
    """Save a credential required by an MCP server."""
    credential_service = request.app.state.credential_service
    await credential_service.create_key(
        name=body.name,
        service=body.service,
        env_var=body.env_var,
        value=body.value,
    )
    return APIResponse(data=None)
