import asyncio
import shutil
import subprocess
import uuid
from datetime import datetime, timezone
from pathlib import Path

from ...core.config import settings
from ...core.database import db
from ...core.exceptions import ProjectAlreadyExistsError, ProjectNotFoundError, SystemProjectError
from ...utils.helpers import slugify


class ProjectService:
    async def list_projects(
        self, offset: int = 0, limit: int = 50
    ) -> tuple[list[dict], int]:
        await self._sync_filesystem_to_db()

        async with db.conn.execute(
            "SELECT * FROM projects ORDER BY is_pinned DESC, updated_at DESC LIMIT ? OFFSET ?",
            (limit, offset),
        ) as cursor:
            rows = await cursor.fetchall()

        async with db.conn.execute("SELECT COUNT(*) FROM projects") as cursor:
            total = (await cursor.fetchone())[0]

        projects = [dict(row) for row in rows]
        enriched = await asyncio.gather(
            *[self._enrich_project(p) for p in projects]
        )
        return enriched, total

    async def create_project(self, name: str, description: str = "") -> dict:
        slug = slugify(name)
        project_path = settings.projects_dir / slug

        if project_path.exists():
            raise ProjectAlreadyExistsError(
                f"Project folder already exists: {slug}"
            )

        async with db.conn.execute(
            "SELECT id FROM projects WHERE slug = ?", (slug,)
        ) as cursor:
            if await cursor.fetchone():
                raise ProjectAlreadyExistsError(
                    f"Project slug already in use: {slug}"
                )

        project_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()

        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, self._create_project_folder, project_path)

        await db.conn.execute(
            """INSERT INTO projects (id, name, slug, path, description, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (project_id, name, slug, str(project_path), description, now, now),
        )
        await db.conn.commit()

        return {
            "id": project_id,
            "name": name,
            "slug": slug,
            "path": str(project_path),
            "description": description,
            "created_at": now,
            "updated_at": now,
        }

    async def get_project(self, project_id: str) -> dict:
        async with db.conn.execute(
            "SELECT * FROM projects WHERE id = ?", (project_id,)
        ) as cursor:
            row = await cursor.fetchone()
        if not row:
            raise ProjectNotFoundError(f"Project not found: {project_id}")
        return await self._enrich_project(dict(row))

    async def update_project(
        self,
        project_id: str,
        name: str | None = None,
        description: str | None = None,
    ) -> dict:
        await self.get_project(project_id)

        updates: list[str] = []
        params: list[str] = []
        if name is not None:
            updates.append("name = ?")
            params.append(name)
        if description is not None:
            updates.append("description = ?")
            params.append(description)

        if not updates:
            return await self.get_project(project_id)

        updates.append("updated_at = ?")
        params.append(datetime.now(timezone.utc).isoformat())
        params.append(project_id)

        await db.conn.execute(
            f"UPDATE projects SET {', '.join(updates)} WHERE id = ?",
            tuple(params),
        )
        await db.conn.commit()
        return await self.get_project(project_id)

    async def delete_project(
        self, project_id: str, delete_files: bool = False
    ) -> None:
        project = await self.get_project(project_id)

        if project.get("is_system"):
            raise SystemProjectError("Cannot delete a system project")

        if delete_files:
            project_path = Path(project["path"])
            if project_path.exists():
                loop = asyncio.get_event_loop()
                await loop.run_in_executor(
                    None, shutil.rmtree, str(project_path)
                )

        await db.conn.execute("DELETE FROM projects WHERE id = ?", (project_id,))
        await db.conn.commit()

    async def git_init(self, project_id: str) -> dict:
        project = await self.get_project(project_id)
        project_path = Path(project["path"])

        if (project_path / ".git").is_dir():
            return project  # Already a git repo

        loop = asyncio.get_event_loop()

        def _init() -> None:
            result = subprocess.run(
                ["git", "init"],
                cwd=str(project_path),
                capture_output=True,
                text=True,
            )
            if result.returncode != 0:
                raise RuntimeError(f"git init failed: {result.stderr}")

        await loop.run_in_executor(None, _init)
        return await self.get_project(project_id)

    def _create_project_folder(self, project_path: Path) -> None:
        """Synchronous: create project dir, copy .claude/ template, git init."""
        project_path.mkdir(parents=True)

        template_claude_dir = settings.templates_dir / ".claude"
        if template_claude_dir.exists():
            shutil.copytree(
                str(template_claude_dir),
                str(project_path / ".claude"),
            )

        subprocess.run(
            ["git", "init"],
            cwd=str(project_path),
            capture_output=True,
            check=False,
        )

    async def add_github_remote(self, project_id: str, repo_url: str) -> dict:
        project = await self.get_project(project_id)
        project_path = Path(project["path"])

        loop = asyncio.get_event_loop()

        def _set_remote() -> None:
            subprocess.run(
                ["git", "remote", "remove", "origin"],
                cwd=str(project_path),
                capture_output=True,
                check=False,
            )
            result = subprocess.run(
                ["git", "remote", "add", "origin", repo_url],
                cwd=str(project_path),
                capture_output=True,
                text=True,
            )
            if result.returncode != 0:
                raise RuntimeError(f"git remote add failed: {result.stderr}")

        await loop.run_in_executor(None, _set_remote)

        now = datetime.now(timezone.utc).isoformat()
        await db.conn.execute(
            "UPDATE projects SET github_repo_url = ?, updated_at = ? WHERE id = ?",
            (repo_url, now, project_id),
        )
        await db.conn.commit()
        return await self.get_project(project_id)

    async def push_to_github(
        self, project_id: str, github_token: str, branch: str | None = None
    ) -> dict:
        project = await self.get_project(project_id)
        project_path = Path(project["path"])

        loop = asyncio.get_event_loop()

        def _push() -> dict:
            nonlocal branch

            # Detect current branch
            if not branch:
                result = subprocess.run(
                    ["git", "rev-parse", "--abbrev-ref", "HEAD"],
                    cwd=str(project_path),
                    capture_output=True,
                    text=True,
                )
                branch = result.stdout.strip() or "main"

            # Check if there are any commits
            result = subprocess.run(
                ["git", "rev-list", "--count", "HEAD"],
                cwd=str(project_path),
                capture_output=True,
                text=True,
            )
            has_commits = result.returncode == 0 and int(
                result.stdout.strip() or "0"
            ) > 0

            if not has_commits:
                subprocess.run(
                    ["git", "add", "-A"],
                    cwd=str(project_path),
                    capture_output=True,
                    check=True,
                )
                subprocess.run(
                    ["git", "commit", "-m", "Initial commit"],
                    cwd=str(project_path),
                    capture_output=True,
                    check=True,
                )

            # Get remote URL and inject token for this push only
            remote_result = subprocess.run(
                ["git", "remote", "get-url", "origin"],
                cwd=str(project_path),
                capture_output=True,
                text=True,
            )
            if remote_result.returncode != 0:
                raise RuntimeError("No remote 'origin' configured")

            remote_url = remote_result.stdout.strip()
            if remote_url.startswith("https://"):
                auth_url = remote_url.replace(
                    "https://", f"https://x-access-token:{github_token}@"
                )
            else:
                auth_url = remote_url

            result = subprocess.run(
                ["git", "push", auth_url, branch, "--set-upstream"],
                cwd=str(project_path),
                capture_output=True,
                text=True,
                timeout=60,
            )
            if result.returncode != 0:
                raise RuntimeError(f"Push failed: {result.stderr}")

            return {"branch": branch, "output": result.stdout + result.stderr}

        return await loop.run_in_executor(None, _push)

    async def _enrich_project(self, project: dict) -> dict:
        path = Path(project["path"])
        if not path.exists():
            project["file_count"] = None
            project["has_git"] = False
            project["git_branch"] = None
            return project

        loop = asyncio.get_event_loop()

        def _get_info() -> tuple[int, bool, str | None]:
            file_count = sum(
                1
                for f in path.rglob("*")
                if f.is_file() and ".git" not in f.parts
            )
            has_git = (path / ".git").is_dir()
            git_branch = None
            if has_git:
                head_file = path / ".git" / "HEAD"
                if head_file.exists():
                    content = head_file.read_text().strip()
                    if content.startswith("ref: refs/heads/"):
                        git_branch = content.removeprefix("ref: refs/heads/")
            return file_count, has_git, git_branch

        file_count, has_git, git_branch = await loop.run_in_executor(
            None, _get_info
        )
        project["file_count"] = file_count
        project["has_git"] = has_git
        project["git_branch"] = git_branch
        project["github_repo_url"] = project.get("github_repo_url", "")
        project["is_pinned"] = bool(project.get("is_pinned", 0))
        project["is_system"] = bool(project.get("is_system", 0))
        return project

    async def _sync_filesystem_to_db(self) -> None:
        """Register any project folders on disk that aren't in the DB yet."""
        if not settings.projects_dir.exists():
            return

        loop = asyncio.get_event_loop()

        def _scan() -> list[Path]:
            return [
                item
                for item in settings.projects_dir.iterdir()
                if item.is_dir() and not item.name.startswith(".")
            ]

        folders = await loop.run_in_executor(None, _scan)

        for folder in folders:
            async with db.conn.execute(
                "SELECT id FROM projects WHERE slug = ?", (folder.name,)
            ) as cursor:
                if await cursor.fetchone():
                    continue

            project_id = str(uuid.uuid4())
            now = datetime.now(timezone.utc).isoformat()
            await db.conn.execute(
                """INSERT INTO projects (id, name, slug, path, description, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (
                    project_id,
                    folder.name,
                    folder.name,
                    str(folder),
                    "",
                    now,
                    now,
                ),
            )
        await db.conn.commit()
