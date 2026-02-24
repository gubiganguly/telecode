import logging
import os
import shutil
import subprocess
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .core.config import settings
from .core.database import db
from .core.exceptions import register_exception_handlers
from .core.security import get_current_user

# Configure app-level logging so diagnostics actually appear in the console
logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)s:     %(name)s - %(message)s",
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await db.connect()

    # Seed the CasperBot system project if it doesn't exist
    async with db.conn.execute(
        "SELECT id FROM projects WHERE is_system = 1 AND name = 'CasperBot'"
    ) as cursor:
        if not await cursor.fetchone():
            app_root = str(Path(__file__).resolve().parent.parent.parent)
            now = datetime.now(timezone.utc).isoformat()
            await db.conn.execute(
                """INSERT INTO projects
                   (id, name, slug, path, description, created_at, updated_at, is_pinned, is_system)
                   VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1)""",
                (
                    str(uuid.uuid4()),
                    "CasperBot",
                    "casperbot",
                    app_root,
                    "CasperBot's own codebase",
                    now,
                    now,
                ),
            )
            await db.conn.commit()
            logger.info("Seeded CasperBot system project (path: %s)", app_root)

    # Ensure root projects directory and templates exist
    settings.projects_dir.mkdir(parents=True, exist_ok=True)
    settings.templates_dir.mkdir(parents=True, exist_ok=True)
    claude_template = settings.templates_dir / ".claude"
    if not claude_template.exists():
        claude_template.mkdir(parents=True, exist_ok=True)

    # Verify Claude CLI is available
    claude_path = shutil.which(settings.claude_binary)
    if claude_path is None:
        logger.warning(
            "Claude CLI binary '%s' not found in PATH. Chat features will fail. "
            "PATH: %s",
            settings.claude_binary,
            os.environ.get("PATH", "(not set)"),
        )
    else:
        try:
            # Run with CLAUDECODE unset to match how process_manager spawns it
            check_env = {k: v for k, v in os.environ.items() if k != "CLAUDECODE"}
            result = subprocess.run(
                [claude_path, "--version"],
                capture_output=True,
                text=True,
                timeout=10,
                env=check_env,
            )
            if result.returncode == 0:
                logger.info("Claude CLI available: %s (path: %s)", result.stdout.strip(), claude_path)
            else:
                logger.warning(
                    "Claude CLI --version exited with code %d. "
                    "stdout: %s | stderr: %s | path: %s",
                    result.returncode,
                    result.stdout.strip()[:200],
                    result.stderr.strip()[:200],
                    claude_path,
                )
        except subprocess.TimeoutExpired:
            logger.warning("Claude CLI --version timed out (path: %s)", claude_path)
        except Exception as exc:
            logger.warning("Failed to verify Claude CLI: %s (path: %s)", exc, claude_path)

    # Ensure commands template directory exists
    commands_dir = settings.templates_dir / ".claude" / "commands"
    commands_dir.mkdir(parents=True, exist_ok=True)

    # Make services available on app state
    from .services.sessions.session_service import SessionService
    from .services.projects.project_service import ProjectService
    from .services.claude.process_manager import ProcessManager
    from .services.api_keys.api_key_service import ApiKeyService
    from .services.commands.command_service import CommandService
    from .services.mcps.mcp_service import McpService
    from .services.claude_md.claude_md_service import ClaudeMdService
    from .services.github.github_service import GitHubService

    app.state.session_service = SessionService()
    app.state.project_service = ProjectService()
    app.state.api_key_service = ApiKeyService()
    app.state.command_service = CommandService()
    app.state.mcp_service = McpService()
    app.state.claude_md_service = ClaudeMdService()
    app.state.github_service = GitHubService()
    app.state.process_manager = ProcessManager(
        app.state.session_service, app.state.api_key_service
    )

    yield

    # Shutdown
    await app.state.process_manager.cleanup_all()
    await db.disconnect()


app = FastAPI(
    title="CasperBot API",
    description="Remote control API for Claude Code CLI",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)

# Routers — public (no auth)
from .api.health.router import router as health_router
from .api.auth.router import router as auth_router
from .api.github.router import public_router as github_public_router

app.include_router(health_router)
app.include_router(auth_router)
app.include_router(github_public_router)

# Routers — protected (require JWT)
from .api.projects.router import router as projects_router
from .api.sessions.router import router as sessions_router
from .api.chat.router import router as chat_router
from .api.api_keys.router import router as api_keys_router
from .api.commands.router import router as commands_router
from .api.mcps.router import router as mcps_router
from .api.files.router import router as files_router
from .api.claude_md.router import router as claude_md_router
from .api.mentions.router import router as mentions_router
from .api.github.router import router as github_router

_auth = [Depends(get_current_user)]
app.include_router(projects_router, dependencies=_auth)
app.include_router(sessions_router, dependencies=_auth)
app.include_router(chat_router)  # WebSocket handles its own auth
app.include_router(api_keys_router, dependencies=_auth)
app.include_router(commands_router, dependencies=_auth)
app.include_router(mcps_router, dependencies=_auth)
app.include_router(files_router, dependencies=_auth)
app.include_router(claude_md_router, dependencies=_auth)
app.include_router(mentions_router, dependencies=_auth)
app.include_router(github_router, dependencies=_auth)
