import aiosqlite

from .config import settings

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS projects (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    slug        TEXT NOT NULL UNIQUE,
    path        TEXT NOT NULL UNIQUE,
    description TEXT DEFAULT '',
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
    is_pinned   INTEGER DEFAULT 0,
    is_system   INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sessions (
    id            TEXT PRIMARY KEY,
    project_id    TEXT NOT NULL,
    name          TEXT NOT NULL DEFAULT 'New Chat',
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
    last_message  TEXT DEFAULT '',
    message_count INTEGER DEFAULT 0,
    is_active     INTEGER DEFAULT 1,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_project_id ON sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_sessions_updated_at ON sessions(updated_at);

CREATE TABLE IF NOT EXISTS messages (
    id          TEXT PRIMARY KEY,
    session_id  TEXT NOT NULL,
    role        TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
    content     TEXT NOT NULL DEFAULT '',
    thinking    TEXT NOT NULL DEFAULT '',
    tool_uses   TEXT NOT NULL DEFAULT '[]',
    usage       TEXT DEFAULT NULL,
    cost_usd    REAL DEFAULT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);

CREATE TABLE IF NOT EXISTS credentials (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    service         TEXT NOT NULL,
    env_var         TEXT NOT NULL UNIQUE,
    encrypted_value TEXT NOT NULL,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS github_accounts (
    id                TEXT PRIMARY KEY,
    github_username   TEXT NOT NULL,
    github_user_id    INTEGER NOT NULL UNIQUE,
    avatar_url        TEXT DEFAULT '',
    encrypted_token   TEXT NOT NULL,
    scopes            TEXT DEFAULT '',
    created_at        TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
"""


class Database:
    def __init__(self) -> None:
        self._connection: aiosqlite.Connection | None = None

    async def connect(self) -> None:
        settings.database_path.parent.mkdir(parents=True, exist_ok=True)
        self._connection = await aiosqlite.connect(str(settings.database_path))
        self._connection.row_factory = aiosqlite.Row
        await self._connection.execute("PRAGMA journal_mode=WAL")
        await self._connection.execute("PRAGMA foreign_keys=ON")
        await self._connection.executescript(SCHEMA_SQL)
        await self._connection.commit()

        # Migration: add github_repo_url column to projects if missing
        try:
            await self._connection.execute(
                "ALTER TABLE projects ADD COLUMN github_repo_url TEXT DEFAULT ''"
            )
            await self._connection.commit()
        except Exception:
            pass  # Column already exists

        # Migration: add is_pinned column to projects if missing
        try:
            await self._connection.execute(
                "ALTER TABLE projects ADD COLUMN is_pinned INTEGER DEFAULT 0"
            )
            await self._connection.commit()
        except Exception:
            pass  # Column already exists

        # Migration: add is_system column to projects if missing
        try:
            await self._connection.execute(
                "ALTER TABLE projects ADD COLUMN is_system INTEGER DEFAULT 0"
            )
            await self._connection.commit()
        except Exception:
            pass  # Column already exists

        # Migration: add approvals_enabled column to projects if missing
        # NULL = inherit from global setting, 0 = force off, 1 = force on
        try:
            await self._connection.execute(
                "ALTER TABLE projects ADD COLUMN approvals_enabled INTEGER DEFAULT NULL"
            )
            await self._connection.commit()
        except Exception:
            pass  # Column already exists

        # Migration: reset approvals_enabled=0 to NULL (inherit global)
        # so existing projects follow the global default
        try:
            await self._connection.execute(
                "UPDATE projects SET approvals_enabled = NULL WHERE approvals_enabled = 0"
            )
            await self._connection.commit()
        except Exception:
            pass

        # Migration: create settings table for global app settings
        await self._connection.executescript("""
            CREATE TABLE IF NOT EXISTS settings (
                key   TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
        """)
        await self._connection.commit()

        # Migration: rename api_keys table to credentials
        try:
            await self._connection.execute(
                "ALTER TABLE api_keys RENAME TO credentials"
            )
            await self._connection.commit()
        except Exception:
            pass  # Table already renamed or doesn't exist

        # Migration: create project_env_vars table for project-scoped env variables
        await self._connection.executescript("""
            CREATE TABLE IF NOT EXISTS project_env_vars (
                id              TEXT PRIMARY KEY,
                project_id      TEXT NOT NULL,
                name            TEXT NOT NULL,
                env_var         TEXT NOT NULL,
                encrypted_value TEXT NOT NULL,
                created_at      TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
                UNIQUE(project_id, env_var)
            );
        """)
        await self._connection.commit()

        # Migration: create project_excluded_credentials table
        await self._connection.executescript("""
            CREATE TABLE IF NOT EXISTS project_excluded_credentials (
                id          TEXT PRIMARY KEY,
                project_id  TEXT NOT NULL,
                env_var     TEXT NOT NULL,
                created_at  TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
                UNIQUE(project_id, env_var)
            );
        """)
        await self._connection.commit()

        # Migration: create previews table for live preview port allocations
        await self._connection.executescript("""
            CREATE TABLE IF NOT EXISTS previews (
                project_id  TEXT PRIMARY KEY,
                port        INTEGER NOT NULL UNIQUE,
                framework   TEXT NOT NULL,
                start_cmd   TEXT NOT NULL,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
            );
        """)
        await self._connection.commit()

    async def disconnect(self) -> None:
        if self._connection:
            await self._connection.close()
            self._connection = None

    @property
    def conn(self) -> aiosqlite.Connection:
        if self._connection is None:
            raise RuntimeError("Database not connected")
        return self._connection


db = Database()
