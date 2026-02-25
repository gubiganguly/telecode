import json
from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "CasperBot"
    debug: bool = False
    host: str = "0.0.0.0"
    port: int = 8000

    # Paths
    projects_dir: Path = Path.home() / "Claude Code Projects"
    templates_dir: Path = Path.home() / "Claude Code Projects" / ".templates"
    database_path: Path = (
        Path(__file__).resolve().parent.parent.parent / "data" / "casperbot.db"
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
    process_timeout_seconds: int = 1200

    # Background tasks
    max_concurrent_tasks: int = 5
    task_buffer_ttl_seconds: int = 3600  # 1 hour — keep completed buffers for replay

    # Auth
    auth_enabled: bool = True
    auth_password: str = ""  # Set via CASPERBOT_AUTH_PASSWORD
    auth_secret: str = ""  # Set via CASPERBOT_AUTH_SECRET (JWT signing key)
    auth_token_expiry_hours: int = 720  # 30 days

    # GitHub OAuth — register one OAuth App at github.com/settings/developers
    # and set these via env vars or .env (users never need to touch this)
    github_client_id: str = ""
    github_client_secret: str = ""
    github_callback_url: str = "http://localhost:8000/api/github/auth/callback"
    frontend_url: str = "http://localhost:3000"

    # CORS — plain string, parsed into a list by get_cors_origins()
    cors_origins: str = "http://localhost:3000,http://localhost:3001"

    # Live preview
    preview_port_start: int = 4000
    preview_port_end: int = 4999
    preview_caddy_admin_url: str = "http://localhost:2019"
    preview_domain: str = "casperbot.net"
    preview_caddy_listen_port: int = 9000
    preview_auto_stop_minutes: int = 60

    def get_cors_origins(self) -> list[str]:
        v = self.cors_origins.strip()
        if v.startswith("["):
            return json.loads(v)
        return [origin.strip() for origin in v.split(",") if origin.strip()]

    model_config = {"env_prefix": "CASPERBOT_", "env_file": ".env"}


settings = Settings()
