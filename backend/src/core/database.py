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
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
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

CREATE TABLE IF NOT EXISTS api_keys (
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
