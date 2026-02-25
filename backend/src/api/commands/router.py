from fastapi import APIRouter, Request

from ...schemas.commands import (
    CommandCreate,
    CommandGenerateRequest,
    CommandGenerateResponse,
    CommandInfo,
    CommandListResponse,
    CommandUpdate,
)
from ...schemas.common import APIResponse

router = APIRouter(prefix="/api/commands", tags=["commands"])


@router.get("", response_model=APIResponse[CommandListResponse])
async def list_commands(request: Request):
    service = request.app.state.command_service
    commands = await service.list_commands()
    return APIResponse(data=CommandListResponse(commands=commands, total=len(commands)))


@router.get("/{name}", response_model=APIResponse[CommandInfo])
async def get_command(name: str, request: Request):
    service = request.app.state.command_service
    command = await service.get_command(name)
    return APIResponse(data=command)


@router.post("", response_model=APIResponse[CommandInfo], status_code=201)
async def create_command(body: CommandCreate, request: Request):
    service = request.app.state.command_service
    command = await service.create_command(name=body.name, content=body.content)
    return APIResponse(data=command)


@router.put("/{name}", response_model=APIResponse[CommandInfo])
async def update_command(name: str, body: CommandUpdate, request: Request):
    service = request.app.state.command_service
    command = await service.update_command(name=name, content=body.content)
    return APIResponse(data=command)


@router.delete("/{name}", response_model=APIResponse[None])
async def delete_command(name: str, request: Request):
    service = request.app.state.command_service
    await service.delete_command(name)
    return APIResponse(data=None)


@router.post("/generate", response_model=APIResponse[CommandGenerateResponse])
async def generate_command(body: CommandGenerateRequest, request: Request):
    service = request.app.state.command_service
    credential_service = request.app.state.credential_service
    content = await service.generate_command(
        name=body.name,
        description=body.description,
        credential_service=credential_service,
    )
    return APIResponse(data=CommandGenerateResponse(content=content))
