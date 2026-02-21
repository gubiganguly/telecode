from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


class TelecodeError(Exception):
    status_code: int = 500

    def __init__(self, message: str) -> None:
        self.message = message
        super().__init__(message)


class ProjectNotFoundError(TelecodeError):
    status_code = 404


class ProjectAlreadyExistsError(TelecodeError):
    status_code = 409


class SessionNotFoundError(TelecodeError):
    status_code = 404


class SessionBusyError(TelecodeError):
    status_code = 409


class ApiKeyNotFoundError(TelecodeError):
    status_code = 404


class CommandNotFoundError(TelecodeError):
    status_code = 404


class CommandConflictError(TelecodeError):
    status_code = 409


class CommandGenerationError(TelecodeError):
    status_code = 422


class McpInstallError(TelecodeError):
    status_code = 422


class McpNotFoundError(TelecodeError):
    status_code = 404


class GitHubNotConnectedError(TelecodeError):
    status_code = 401


class GitHubApiError(TelecodeError):
    status_code = 502


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(TelecodeError)
    async def telecode_error_handler(
        request: Request, exc: TelecodeError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={"success": False, "data": None, "error": exc.message},
        )
