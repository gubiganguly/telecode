from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Telecode"
    debug: bool = False
    host: str = "0.0.0.0"
    port: int = 8000

    # Paths
    projects_dir: Path = Path.home() / "Claude Code Projects"
    templates_dir: Path = Path.home() / "Claude Code Projects" / ".templates"
    database_path: Path = (
        Path(__file__).resolve().parent.parent.parent / "data" / "telecode.db"
    )

    # MCP plugins
    mcp_plugins_dir: Path = (
        Path.home() / ".claude" / "plugins" / "marketplaces"
        / "claude-plugins-official" / "external_plugins"
    )

    # Claude CLI
    claude_binary: str = "claude"
    default_model: str = "sonnet"
    max_budget_usd: float = 5.0
    fallback_model: str = "haiku"
    process_timeout_seconds: int = 600

    # Auth
    auth_enabled: bool = True
    auth_password: str = ""  # Set via TELECODE_AUTH_PASSWORD
    auth_secret: str = ""  # Set via TELECODE_AUTH_SECRET (JWT signing key)
    auth_token_expiry_hours: int = 720  # 30 days

    # GitHub OAuth — register one OAuth App at github.com/settings/developers
    # and set these via env vars or .env (users never need to touch this)
    github_client_id: str = ""
    github_client_secret: str = ""
    github_callback_url: str = "http://localhost:8000/api/github/auth/callback"
    frontend_url: str = "http://localhost:3000"

    # CORS
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:3001"]

    model_config = {"env_prefix": "TELECODE_", "env_file": ".env"}


settings = Settings()
