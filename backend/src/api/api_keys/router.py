from fastapi import APIRouter, Request

from ...schemas.api_keys import (
    ApiKeyCreate,
    ApiKeyInfo,
    ApiKeyListResponse,
    ApiKeyUpdate,
    ApiKeyValueResponse,
)
from ...schemas.common import APIResponse

router = APIRouter(prefix="/api/keys", tags=["api-keys"])


@router.get("", response_model=APIResponse[ApiKeyListResponse])
async def list_keys(request: Request):
    service = request.app.state.api_key_service
    keys, total = await service.list_keys()
    return APIResponse(data=ApiKeyListResponse(keys=keys, total=total))


@router.post("", response_model=APIResponse[ApiKeyInfo], status_code=201)
async def create_key(body: ApiKeyCreate, request: Request):
    service = request.app.state.api_key_service
    key = await service.create_key(
        name=body.name,
        service=body.service,
        env_var=body.env_var,
        value=body.value,
    )
    return APIResponse(data=key)


@router.get("/{key_id}", response_model=APIResponse[ApiKeyInfo])
async def get_key(key_id: str, request: Request):
    service = request.app.state.api_key_service
    key = await service.get_key(key_id)
    return APIResponse(data=key)


@router.get("/{key_id}/value", response_model=APIResponse[ApiKeyValueResponse])
async def get_key_value(key_id: str, request: Request):
    service = request.app.state.api_key_service
    value = await service.get_decrypted_value(key_id)
    return APIResponse(data=ApiKeyValueResponse(value=value))


@router.patch("/{key_id}", response_model=APIResponse[ApiKeyInfo])
async def update_key(key_id: str, body: ApiKeyUpdate, request: Request):
    service = request.app.state.api_key_service
    key = await service.update_key(
        key_id,
        name=body.name,
        service=body.service,
        env_var=body.env_var,
        value=body.value,
    )
    return APIResponse(data=key)


@router.delete("/{key_id}", response_model=APIResponse[None])
async def delete_key(key_id: str, request: Request):
    service = request.app.state.api_key_service
    await service.delete_key(key_id)
    return APIResponse(data=None)
