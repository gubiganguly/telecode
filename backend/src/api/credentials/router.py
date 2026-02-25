from fastapi import APIRouter, Request

from ...schemas.credentials import (
    CredentialCreate,
    CredentialInfo,
    CredentialListResponse,
    CredentialUpdate,
    CredentialValueResponse,
)
from ...schemas.common import APIResponse

router = APIRouter(prefix="/api/credentials", tags=["credentials"])


@router.get("", response_model=APIResponse[CredentialListResponse])
async def list_credentials(request: Request):
    service = request.app.state.credential_service
    credentials, total = await service.list_keys()
    return APIResponse(data=CredentialListResponse(credentials=credentials, total=total))


@router.post("", response_model=APIResponse[CredentialInfo], status_code=201)
async def create_credential(body: CredentialCreate, request: Request):
    service = request.app.state.credential_service
    key = await service.create_key(
        name=body.name,
        service=body.service,
        env_var=body.env_var,
        value=body.value,
    )
    return APIResponse(data=key)


@router.get("/{key_id}", response_model=APIResponse[CredentialInfo])
async def get_credential(key_id: str, request: Request):
    service = request.app.state.credential_service
    key = await service.get_key(key_id)
    return APIResponse(data=key)


@router.get("/{key_id}/value", response_model=APIResponse[CredentialValueResponse])
async def get_credential_value(key_id: str, request: Request):
    service = request.app.state.credential_service
    value = await service.get_decrypted_value(key_id)
    return APIResponse(data=CredentialValueResponse(value=value))


@router.patch("/{key_id}", response_model=APIResponse[CredentialInfo])
async def update_credential(key_id: str, body: CredentialUpdate, request: Request):
    service = request.app.state.credential_service
    key = await service.update_key(
        key_id,
        name=body.name,
        service=body.service,
        env_var=body.env_var,
        value=body.value,
    )
    return APIResponse(data=key)


@router.delete("/{key_id}", response_model=APIResponse[None])
async def delete_credential(key_id: str, request: Request):
    service = request.app.state.credential_service
    await service.delete_key(key_id)
    return APIResponse(data=None)
