from fastapi import APIRouter
from pydantic import BaseModel

from ...schemas.common import APIResponse
from ...services.project_settings.project_settings_service import ProjectSettingsService

router = APIRouter(prefix="/api/settings", tags=["settings"])


class GlobalApprovalsResponse(BaseModel):
    enabled: bool


class GlobalApprovalsBody(BaseModel):
    enabled: bool


@router.get("/approvals", response_model=APIResponse[GlobalApprovalsResponse])
async def get_global_approvals():
    svc = ProjectSettingsService()
    enabled = await svc.get_global_approvals()
    return APIResponse(data=GlobalApprovalsResponse(enabled=enabled))


@router.put("/approvals", response_model=APIResponse[GlobalApprovalsResponse])
async def update_global_approvals(body: GlobalApprovalsBody):
    svc = ProjectSettingsService()
    await svc.set_global_approvals(body.enabled)
    return APIResponse(data=GlobalApprovalsResponse(enabled=body.enabled))
