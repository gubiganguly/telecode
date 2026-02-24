import logging

from fastapi import APIRouter, Request, Query
from fastapi.responses import RedirectResponse

from ...core.config import settings
from ...core.exceptions import GitHubApiError
from ...schemas.common import APIResponse
from ...schemas.github import (
    GitHubStatusResponse,
    GitHubAccountInfo,
    GitHubCreateRepoRequest,
    GitHubCreateRepoResponse,
    GitHubRepoListResponse,
    GitHubPushRequest,
    GitHubPushResponse,
    GitHubLinkRepoRequest,
)
from ...schemas.projects import ProjectInfo

logger = logging.getLogger(__name__)

# Public router — OAuth flow (no JWT required, browser navigates directly)
public_router = APIRouter(prefix="/api/github", tags=["github"])

# Protected router — everything else (JWT required)
router = APIRouter(prefix="/api/github", tags=["github"])


# --- OAuth Flow (public) ---


@public_router.get("/auth/login")
async def github_login(request: Request):
    service = request.app.state.github_service
    url = service.get_login_url()
    return RedirectResponse(url=url)


@public_router.get("/auth/callback")
async def github_callback(request: Request, code: str = Query(...)):
    service = request.app.state.github_service
    try:
        await service.exchange_code(code)
        return RedirectResponse(
            url=f"{settings.frontend_url}/settings?github=connected"
        )
    except Exception as exc:
        logger.error("GitHub OAuth callback failed: %s", exc)
        return RedirectResponse(
            url=f"{settings.frontend_url}/settings?github=error"
        )


# --- Account Management ---


@router.get("/status", response_model=APIResponse[GitHubStatusResponse])
async def github_status(request: Request):
    service = request.app.state.github_service
    account = await service.get_account()
    return APIResponse(
        data=GitHubStatusResponse(
            connected=account is not None,
            account=GitHubAccountInfo(**account) if account else None,
        )
    )


@router.delete("/disconnect", response_model=APIResponse[None])
async def github_disconnect(request: Request):
    service = request.app.state.github_service
    await service.disconnect()
    return APIResponse(data=None)


# --- Repo Operations ---


@router.post(
    "/repos",
    response_model=APIResponse[GitHubCreateRepoResponse],
    status_code=201,
)
async def create_repo(body: GitHubCreateRepoRequest, request: Request):
    service = request.app.state.github_service
    repo = await service.create_repo(
        name=body.name, description=body.description, private=body.private
    )
    return APIResponse(
        data=GitHubCreateRepoResponse(
            full_name=repo["full_name"],
            html_url=repo["html_url"],
            private=repo["private"],
        )
    )


@router.get("/repos", response_model=APIResponse[GitHubRepoListResponse])
async def list_repos(request: Request):
    service = request.app.state.github_service
    repos = await service.list_repos()
    return APIResponse(data=GitHubRepoListResponse(repos=repos))


# --- Project-Specific Git Operations ---


@router.post(
    "/projects/{project_id}/link", response_model=APIResponse[ProjectInfo]
)
async def link_repo(
    project_id: str, body: GitHubLinkRepoRequest, request: Request
):
    project_service = request.app.state.project_service
    project = await project_service.add_github_remote(
        project_id, body.repo_url
    )
    return APIResponse(data=project)


@router.post(
    "/projects/{project_id}/push",
    response_model=APIResponse[GitHubPushResponse],
)
async def push_to_github(
    project_id: str, body: GitHubPushRequest, request: Request
):
    github_service = request.app.state.github_service
    project_service = request.app.state.project_service
    token = await github_service.get_token()
    result = await project_service.push_to_github(
        project_id, token, branch=body.branch
    )
    return APIResponse(data=result)
