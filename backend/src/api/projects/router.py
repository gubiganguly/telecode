from fastapi import APIRouter, Query, Request

from ...schemas.common import APIResponse
from ...schemas.projects import (
    ProjectCreate,
    ProjectInfo,
    ProjectListResponse,
    ProjectUpdate,
)

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("", response_model=APIResponse[ProjectListResponse])
async def list_projects(
    request: Request,
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
):
    service = request.app.state.project_service
    projects, total = await service.list_projects(offset=offset, limit=limit)
    return APIResponse(
        data=ProjectListResponse(projects=projects, total=total)
    )


@router.post("", response_model=APIResponse[ProjectInfo], status_code=201)
async def create_project(body: ProjectCreate, request: Request):
    service = request.app.state.project_service
    project = await service.create_project(
        name=body.name, description=body.description, use_template=body.use_template
    )
    return APIResponse(data=project)


@router.get("/{project_id}", response_model=APIResponse[ProjectInfo])
async def get_project(project_id: str, request: Request):
    service = request.app.state.project_service
    project = await service.get_project(project_id)
    return APIResponse(data=project)


@router.patch("/{project_id}", response_model=APIResponse[ProjectInfo])
async def update_project(
    project_id: str, body: ProjectUpdate, request: Request
):
    service = request.app.state.project_service
    project = await service.update_project(
        project_id, name=body.name, description=body.description
    )
    return APIResponse(data=project)


@router.post("/{project_id}/git-init", response_model=APIResponse[ProjectInfo])
async def git_init_project(project_id: str, request: Request):
    service = request.app.state.project_service
    project = await service.git_init(project_id)
    return APIResponse(data=project)


@router.delete("/{project_id}", response_model=APIResponse[None])
async def delete_project(
    project_id: str,
    request: Request,
    delete_files: bool = Query(False),
    delete_repo: bool = Query(False),
):
    service = request.app.state.project_service

    if delete_repo:
        project = await service.get_project(project_id)
        repo_url = project.get("github_repo_url", "")
        if repo_url:
            github_service = request.app.state.github_service
            await github_service.delete_repo(repo_url)

    await service.delete_project(project_id, delete_files=delete_files)
    return APIResponse(data=None)
