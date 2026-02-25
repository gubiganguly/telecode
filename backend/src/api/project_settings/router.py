from pathlib import Path

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from ...schemas.common import APIResponse

router = APIRouter(prefix="/api/projects/{project_id}/settings", tags=["project-settings"])


# ------------------------------------------------------------------
# Request / response schemas
# ------------------------------------------------------------------

class ClaudeMdBody(BaseModel):
    content: str


class ClaudeMdResponse(BaseModel):
    content: str


class CommandBody(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, pattern=r"^[a-z][a-z0-9-]*$")
    content: str = Field(..., min_length=1)


class CommandUpdateBody(BaseModel):
    content: str = Field(..., min_length=1)


class CommandInfo(BaseModel):
    name: str
    command: str
    description: str
    content: str


class CommandListResponse(BaseModel):
    commands: list[CommandInfo]
    total: int


class McpInfo(BaseModel):
    name: str
    command: str | None = None
    args: list[str] | None = None
    url: str | None = None


class McpListResponse(BaseModel):
    mcps: list[McpInfo]
    total: int


class ApprovalsResponse(BaseModel):
    enabled: bool | None  # None = inherit from global
    global_default: bool
    effective: bool  # resolved value


class ApprovalsBody(BaseModel):
    enabled: bool | None  # None = reset to inherit global


class EnvVarInfo(BaseModel):
    id: str
    name: str
    env_var: str
    masked_value: str
    created_at: str
    updated_at: str


class EnvVarListResponse(BaseModel):
    env_vars: list[EnvVarInfo]
    global_keys: list[str]
    excluded_credentials: list[str] = []
    total: int


class ExcludeCredentialBody(BaseModel):
    env_var: str = Field(..., min_length=1, max_length=100, pattern=r"^[A-Z][A-Z0-9_]*$")


class EnvVarCreateBody(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    env_var: str = Field(..., min_length=1, max_length=100, pattern=r"^[A-Z][A-Z0-9_]*$")
    value: str = Field(..., min_length=1)


class EnvVarUpdateBody(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    env_var: str | None = Field(None, min_length=1, max_length=100, pattern=r"^[A-Z][A-Z0-9_]*$")
    value: str | None = Field(None, min_length=1)


# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------

async def _resolve_project(request: Request, project_id: str) -> tuple:
    """Look up project and return (service, project_path)."""
    from ...services.project_settings.project_settings_service import ProjectSettingsService

    project_service = request.app.state.project_service
    project = await project_service.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    project_path = Path(project["path"])
    if not project_path.is_dir():
        raise HTTPException(status_code=404, detail="Project directory not found")
    return ProjectSettingsService(), project_path, project_id


# ------------------------------------------------------------------
# CLAUDE.md
# ------------------------------------------------------------------

@router.get("/claude-md", response_model=APIResponse[ClaudeMdResponse])
async def get_claude_md(project_id: str, request: Request):
    svc, project_path, _ = await _resolve_project(request, project_id)
    content = await svc.get_claude_md(project_path)
    return APIResponse(data=ClaudeMdResponse(content=content))


@router.put("/claude-md", response_model=APIResponse[ClaudeMdResponse])
async def update_claude_md(project_id: str, body: ClaudeMdBody, request: Request):
    svc, project_path, _ = await _resolve_project(request, project_id)
    await svc.update_claude_md(project_path, body.content)
    return APIResponse(data=ClaudeMdResponse(content=body.content))


# ------------------------------------------------------------------
# Commands
# ------------------------------------------------------------------

@router.get("/commands", response_model=APIResponse[CommandListResponse])
async def list_commands(project_id: str, request: Request):
    svc, project_path, _ = await _resolve_project(request, project_id)
    commands = await svc.list_commands(project_path)
    return APIResponse(data=CommandListResponse(commands=commands, total=len(commands)))


@router.post("/commands", response_model=APIResponse[CommandInfo], status_code=201)
async def create_command(project_id: str, body: CommandBody, request: Request):
    svc, project_path, _ = await _resolve_project(request, project_id)
    try:
        command = await svc.create_command(project_path, body.name, body.content)
    except FileExistsError as e:
        raise HTTPException(status_code=409, detail=str(e))
    return APIResponse(data=command)


@router.put("/commands/{name}", response_model=APIResponse[CommandInfo])
async def update_command(project_id: str, name: str, body: CommandUpdateBody, request: Request):
    svc, project_path, _ = await _resolve_project(request, project_id)
    try:
        command = await svc.update_command(project_path, name, body.content)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return APIResponse(data=command)


@router.delete("/commands/{name}", response_model=APIResponse[None])
async def delete_command(project_id: str, name: str, request: Request):
    svc, project_path, _ = await _resolve_project(request, project_id)
    try:
        await svc.delete_command(project_path, name)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return APIResponse(data=None)


# ------------------------------------------------------------------
# MCPs
# ------------------------------------------------------------------

@router.get("/mcps", response_model=APIResponse[McpListResponse])
async def list_mcps(project_id: str, request: Request):
    svc, project_path, _ = await _resolve_project(request, project_id)
    mcps = await svc.list_mcps(project_path)
    return APIResponse(data=McpListResponse(mcps=mcps, total=len(mcps)))


# ------------------------------------------------------------------
# Approvals (project-level override)
# ------------------------------------------------------------------

@router.get("/approvals", response_model=APIResponse[ApprovalsResponse])
async def get_approvals(project_id: str, request: Request):
    svc, _, pid = await _resolve_project(request, project_id)
    raw = await svc.get_approvals_raw(pid)
    global_default = await svc.get_global_approvals()
    effective = await svc.resolve_approvals(pid)
    return APIResponse(data=ApprovalsResponse(
        enabled=raw,
        global_default=global_default,
        effective=effective,
    ))


@router.put("/approvals", response_model=APIResponse[ApprovalsResponse])
async def update_approvals(project_id: str, body: ApprovalsBody, request: Request):
    svc, _, pid = await _resolve_project(request, project_id)
    await svc.set_approvals(pid, body.enabled)
    global_default = await svc.get_global_approvals()
    effective = await svc.resolve_approvals(pid)
    return APIResponse(data=ApprovalsResponse(
        enabled=body.enabled,
        global_default=global_default,
        effective=effective,
    ))


# ------------------------------------------------------------------
# Environment Variables (project-scoped)
# ------------------------------------------------------------------

@router.get("/env-vars", response_model=APIResponse[EnvVarListResponse])
async def list_env_vars(project_id: str, request: Request):
    svc, _, pid = await _resolve_project(request, project_id)
    env_vars = await svc.list_env_vars(pid)
    global_keys = await svc.get_global_env_var_names()
    excluded = await svc.list_excluded_credentials(pid)
    return APIResponse(data=EnvVarListResponse(
        env_vars=env_vars, global_keys=global_keys,
        excluded_credentials=excluded, total=len(env_vars)
    ))


@router.post("/env-vars", response_model=APIResponse[EnvVarInfo], status_code=201)
async def create_env_var(project_id: str, body: EnvVarCreateBody, request: Request):
    svc, _, pid = await _resolve_project(request, project_id)
    try:
        env_var = await svc.create_env_var(pid, body.name, body.env_var, body.value)
    except Exception as e:
        if "UNIQUE constraint" in str(e):
            raise HTTPException(status_code=409, detail=f"Env var '{body.env_var}' already exists for this project")
        raise
    return APIResponse(data=env_var)


@router.put("/env-vars/{env_var_id}", response_model=APIResponse[EnvVarInfo])
async def update_env_var(project_id: str, env_var_id: str, body: EnvVarUpdateBody, request: Request):
    svc, _, _ = await _resolve_project(request, project_id)
    try:
        env_var = await svc.update_env_var(
            env_var_id, name=body.name, env_var=body.env_var, value=body.value
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return APIResponse(data=env_var)


@router.delete("/env-vars/{env_var_id}", response_model=APIResponse[None])
async def delete_env_var(project_id: str, env_var_id: str, request: Request):
    svc, _, _ = await _resolve_project(request, project_id)
    try:
        await svc.delete_env_var(env_var_id)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return APIResponse(data=None)


# ------------------------------------------------------------------
# Credential Exclusions (per-project)
# ------------------------------------------------------------------

@router.post("/excluded-credentials", response_model=APIResponse[None], status_code=201)
async def exclude_credential(project_id: str, body: ExcludeCredentialBody, request: Request):
    svc, _, pid = await _resolve_project(request, project_id)
    await svc.exclude_credential(pid, body.env_var)
    return APIResponse(data=None)


@router.delete("/excluded-credentials/{env_var}", response_model=APIResponse[None])
async def include_credential(project_id: str, env_var: str, request: Request):
    svc, _, pid = await _resolve_project(request, project_id)
    await svc.include_credential(pid, env_var)
    return APIResponse(data=None)
