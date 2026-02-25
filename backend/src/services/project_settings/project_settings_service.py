import asyncio
import json
import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path

from ...core.database import db
from ...core.encryption import encrypt, decrypt

logger = logging.getLogger(__name__)


def _extract_description(content: str) -> str:
    """Extract a short description from markdown content."""
    for line in content.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith(("#", ">", "```", "|", "---")):
            continue
        return stripped[:120]
    return ""


class ProjectSettingsService:
    """Manages project-scoped settings: CLAUDE.md, commands, MCPs, approvals."""

    # ------------------------------------------------------------------
    # CLAUDE.md
    # ------------------------------------------------------------------

    async def get_claude_md(self, project_path: Path) -> str:
        loop = asyncio.get_event_loop()

        def _read() -> str:
            md_file = project_path / ".claude" / "CLAUDE.md"
            if md_file.is_file():
                return md_file.read_text(encoding="utf-8")
            return ""

        return await loop.run_in_executor(None, _read)

    async def update_claude_md(self, project_path: Path, content: str) -> None:
        loop = asyncio.get_event_loop()

        def _write() -> None:
            claude_dir = project_path / ".claude"
            claude_dir.mkdir(parents=True, exist_ok=True)
            (claude_dir / "CLAUDE.md").write_text(content, encoding="utf-8")

        await loop.run_in_executor(None, _write)

    # ------------------------------------------------------------------
    # Slash Commands (project-scoped)
    # ------------------------------------------------------------------

    async def list_commands(self, project_path: Path) -> list[dict]:
        loop = asyncio.get_event_loop()

        def _scan() -> list[dict]:
            cmds_dir = project_path / ".claude" / "commands"
            if not cmds_dir.is_dir():
                return []
            results: list[dict] = []
            for md_file in sorted(cmds_dir.iterdir()):
                if not md_file.suffix == ".md" or not md_file.is_file():
                    continue
                name = md_file.stem
                content = md_file.read_text(encoding="utf-8")
                results.append({
                    "name": name,
                    "command": f"/{name}",
                    "description": _extract_description(content),
                    "content": content,
                })
            return results

        return await loop.run_in_executor(None, _scan)

    async def get_command(self, project_path: Path, name: str) -> dict | None:
        loop = asyncio.get_event_loop()

        def _read() -> dict | None:
            md_file = project_path / ".claude" / "commands" / f"{name}.md"
            if not md_file.is_file():
                return None
            content = md_file.read_text(encoding="utf-8")
            return {
                "name": name,
                "command": f"/{name}",
                "description": _extract_description(content),
                "content": content,
            }

        return await loop.run_in_executor(None, _read)

    async def create_command(
        self, project_path: Path, name: str, content: str
    ) -> dict:
        loop = asyncio.get_event_loop()

        def _write() -> None:
            cmds_dir = project_path / ".claude" / "commands"
            cmds_dir.mkdir(parents=True, exist_ok=True)
            target = cmds_dir / f"{name}.md"
            if target.exists():
                raise FileExistsError(f"Command '{name}' already exists")
            target.write_text(content, encoding="utf-8")

        await loop.run_in_executor(None, _write)
        return {
            "name": name,
            "command": f"/{name}",
            "description": _extract_description(content),
            "content": content,
        }

    async def update_command(
        self, project_path: Path, name: str, content: str
    ) -> dict:
        loop = asyncio.get_event_loop()

        def _write() -> None:
            md_file = project_path / ".claude" / "commands" / f"{name}.md"
            if not md_file.is_file():
                raise FileNotFoundError(f"Command '{name}' not found")
            md_file.write_text(content, encoding="utf-8")

        await loop.run_in_executor(None, _write)
        return {
            "name": name,
            "command": f"/{name}",
            "description": _extract_description(content),
            "content": content,
        }

    async def delete_command(self, project_path: Path, name: str) -> None:
        loop = asyncio.get_event_loop()

        def _delete() -> None:
            md_file = project_path / ".claude" / "commands" / f"{name}.md"
            if not md_file.is_file():
                raise FileNotFoundError(f"Command '{name}' not found")
            md_file.unlink()

        await loop.run_in_executor(None, _delete)

    # ------------------------------------------------------------------
    # MCPs (project-scoped)
    # ------------------------------------------------------------------

    async def list_mcps(self, project_path: Path) -> list[dict]:
        loop = asyncio.get_event_loop()

        def _scan() -> list[dict]:
            results: list[dict] = []
            # Claude CLI stores project-scoped MCPs in .mcp.json at project root
            mcp_file = project_path / ".mcp.json"
            if not mcp_file.is_file():
                return results
            try:
                data = json.loads(mcp_file.read_text(encoding="utf-8"))
                servers = data.get("mcpServers", data)
                if not isinstance(servers, dict):
                    return results
                for name, config in servers.items():
                    mcp: dict = {"name": name}
                    if "command" in config:
                        mcp["command"] = config["command"]
                        mcp["args"] = config.get("args", [])
                    elif "url" in config:
                        mcp["url"] = config["url"]
                    results.append(mcp)
            except (json.JSONDecodeError, KeyError, TypeError):
                logger.warning("Failed to parse project MCP config: %s", mcp_file)
            return results

        return await loop.run_in_executor(None, _scan)

    # ------------------------------------------------------------------
    # Approvals toggle (project-level)
    # ------------------------------------------------------------------

    async def get_approvals_raw(self, project_id: str) -> bool | None:
        """Return the project-level override: True, False, or None (inherit)."""
        async with db.conn.execute(
            "SELECT approvals_enabled FROM projects WHERE id = ?", (project_id,)
        ) as cursor:
            row = await cursor.fetchone()
            if row is None:
                return None
            val = row["approvals_enabled"]
            if val is None:
                return None
            return bool(val)

    async def set_approvals(self, project_id: str, enabled: bool | None) -> None:
        """Set project-level override. None = inherit from global."""
        val = None if enabled is None else (1 if enabled else 0)
        await db.conn.execute(
            "UPDATE projects SET approvals_enabled = ? WHERE id = ?",
            (val, project_id),
        )
        await db.conn.commit()

    async def resolve_approvals(self, project_id: str) -> bool:
        """Resolve effective approvals: project override → global default → False."""
        project_val = await self.get_approvals_raw(project_id)
        if project_val is not None:
            return project_val
        return await self.get_global_approvals()

    # ------------------------------------------------------------------
    # Global approvals setting
    # ------------------------------------------------------------------

    async def get_global_approvals(self) -> bool:
        async with db.conn.execute(
            "SELECT value FROM settings WHERE key = 'approvals_enabled'"
        ) as cursor:
            row = await cursor.fetchone()
            if row is None:
                return False
            return row["value"] == "1"

    async def set_global_approvals(self, enabled: bool) -> None:
        await db.conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES ('approvals_enabled', ?)",
            ("1" if enabled else "0",),
        )
        await db.conn.commit()

    # ------------------------------------------------------------------
    # Environment Variables (project-scoped)
    # ------------------------------------------------------------------

    @staticmethod
    def _mask_value(encrypted_val: str) -> str:
        """Decrypt and mask a value, showing only the last 4 characters."""
        try:
            plaintext = decrypt(encrypted_val)
            if len(plaintext) <= 4:
                return "*" * len(plaintext)
            return "*" * (len(plaintext) - 4) + plaintext[-4:]
        except Exception:
            return "****"

    async def list_env_vars(self, project_id: str) -> list[dict]:
        async with db.conn.execute(
            "SELECT * FROM project_env_vars WHERE project_id = ? ORDER BY env_var",
            (project_id,),
        ) as cursor:
            rows = await cursor.fetchall()
        return [
            {
                "id": row["id"],
                "name": row["name"],
                "env_var": row["env_var"],
                "masked_value": self._mask_value(row["encrypted_value"]),
                "created_at": row["created_at"],
                "updated_at": row["updated_at"],
            }
            for row in rows
        ]

    async def create_env_var(
        self, project_id: str, name: str, env_var: str, value: str
    ) -> dict:
        var_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        encrypted = encrypt(value)
        await db.conn.execute(
            """INSERT INTO project_env_vars
               (id, project_id, name, env_var, encrypted_value, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (var_id, project_id, name, env_var, encrypted, now, now),
        )
        await db.conn.commit()
        return {
            "id": var_id,
            "name": name,
            "env_var": env_var,
            "masked_value": self._mask_value(encrypted),
            "created_at": now,
            "updated_at": now,
        }

    async def update_env_var(
        self,
        env_var_id: str,
        name: str | None = None,
        env_var: str | None = None,
        value: str | None = None,
    ) -> dict:
        async with db.conn.execute(
            "SELECT * FROM project_env_vars WHERE id = ?", (env_var_id,)
        ) as cursor:
            row = await cursor.fetchone()
        if not row:
            raise FileNotFoundError(f"Env var not found: {env_var_id}")

        updates: list[str] = []
        params: list[str] = []
        if name is not None:
            updates.append("name = ?")
            params.append(name)
        if env_var is not None:
            updates.append("env_var = ?")
            params.append(env_var)
        if value is not None:
            updates.append("encrypted_value = ?")
            params.append(encrypt(value))
        now = datetime.now(timezone.utc).isoformat()
        updates.append("updated_at = ?")
        params.append(now)
        params.append(env_var_id)

        await db.conn.execute(
            f"UPDATE project_env_vars SET {', '.join(updates)} WHERE id = ?",
            tuple(params),
        )
        await db.conn.commit()

        # Re-fetch
        async with db.conn.execute(
            "SELECT * FROM project_env_vars WHERE id = ?", (env_var_id,)
        ) as cursor:
            row = await cursor.fetchone()
        return {
            "id": row["id"],
            "name": row["name"],
            "env_var": row["env_var"],
            "masked_value": self._mask_value(row["encrypted_value"]),
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
        }

    async def delete_env_var(self, env_var_id: str) -> None:
        result = await db.conn.execute(
            "DELETE FROM project_env_vars WHERE id = ?", (env_var_id,)
        )
        await db.conn.commit()
        if result.rowcount == 0:
            raise FileNotFoundError(f"Env var not found: {env_var_id}")

    async def get_decrypted_env_map(self, project_id: str) -> dict[str, str]:
        """Return {env_var: decrypted_value} for project-scoped env vars."""
        async with db.conn.execute(
            "SELECT env_var, encrypted_value FROM project_env_vars WHERE project_id = ?",
            (project_id,),
        ) as cursor:
            rows = await cursor.fetchall()
        return {row["env_var"]: decrypt(row["encrypted_value"]) for row in rows}

    async def get_global_env_var_names(self) -> list[str]:
        """Return list of env_var names from the global credentials table."""
        async with db.conn.execute(
            "SELECT env_var FROM credentials ORDER BY env_var"
        ) as cursor:
            rows = await cursor.fetchall()
        return [row["env_var"] for row in rows]

    # ------------------------------------------------------------------
    # Credential Exclusions (per-project)
    # ------------------------------------------------------------------

    async def list_excluded_credentials(self, project_id: str) -> list[str]:
        """Return list of env_var names excluded for this project."""
        async with db.conn.execute(
            "SELECT env_var FROM project_excluded_credentials WHERE project_id = ? ORDER BY env_var",
            (project_id,),
        ) as cursor:
            rows = await cursor.fetchall()
        return [row["env_var"] for row in rows]

    async def exclude_credential(self, project_id: str, env_var: str) -> None:
        """Exclude a global credential from this project."""
        now = datetime.now(timezone.utc).isoformat()
        await db.conn.execute(
            """INSERT OR IGNORE INTO project_excluded_credentials
               (id, project_id, env_var, created_at)
               VALUES (?, ?, ?, ?)""",
            (str(uuid.uuid4()), project_id, env_var, now),
        )
        await db.conn.commit()

    async def include_credential(self, project_id: str, env_var: str) -> None:
        """Remove exclusion, re-inheriting the global credential."""
        await db.conn.execute(
            "DELETE FROM project_excluded_credentials WHERE project_id = ? AND env_var = ?",
            (project_id, env_var),
        )
        await db.conn.commit()
