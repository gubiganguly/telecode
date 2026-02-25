from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


class CasperBotError(Exception):
    status_code: int = 500

    def __init__(self, message: str) -> None:
        self.message = message
        super().__init__(message)


class ProjectNotFoundError(CasperBotError):
    status_code = 404


class ProjectAlreadyExistsError(CasperBotError):
    status_code = 409


class SessionNotFoundError(CasperBotError):
    status_code = 404


class SessionBusyError(CasperBotError):
    status_code = 409


class CredentialNotFoundError(CasperBotError):
    status_code = 404


class CommandNotFoundError(CasperBotError):
    status_code = 404


class CommandConflictError(CasperBotError):
    status_code = 409


class CommandGenerationError(CasperBotError):
    status_code = 422


class McpInstallError(CasperBotError):
    status_code = 422


class McpNotFoundError(CasperBotError):
    status_code = 404


class GitHubNotConnectedError(CasperBotError):
    status_code = 401


class GitHubApiError(CasperBotError):
    status_code = 502


class SystemProjectError(CasperBotError):
    status_code = 403


class PreviewNotFoundError(CasperBotError):
    status_code = 404


class PreviewAlreadyRunningError(CasperBotError):
    status_code = 409


class PreviewStartError(CasperBotError):
    status_code = 500


class PreviewNotSupportedError(CasperBotError):
    status_code = 422


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(CasperBotError)
    async def casperbot_error_handler(
        request: Request, exc: CasperBotError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={"success": False, "data": None, "error": exc.message},
        )
