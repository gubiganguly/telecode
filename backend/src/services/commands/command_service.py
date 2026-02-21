import asyncio
import logging
import os
import shutil
from pathlib import Path

from ...core.config import settings
from ...core.exceptions import CommandConflictError, CommandGenerationError, CommandNotFoundError
from ..claude.command_translator import COMMANDS

logger = logging.getLogger(__name__)


def _extract_description(content: str) -> str:
    """Extract a short description from markdown content.

    Skips heading lines and blank lines, returns the first content line
    truncated to 120 characters.
    """
    for line in content.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        if stripped.startswith(">"):
            # Skip blockquotes (often meta notes)
            continue
        if stripped.startswith("```"):
            continue
        if stripped.startswith("|"):
            continue
        if stripped.startswith("---"):
            continue
        return stripped[:120]
    return ""


def _builtin_names() -> set[str]:
    """Return the set of built-in command names (without slash)."""
    return {cmd.lstrip("/") for cmd in COMMANDS}


class CommandService:
    @property
    def _commands_dir(self) -> Path:
        return settings.templates_dir / ".claude" / "commands"

    async def _sync_command_to_projects(
        self, name: str, content: str | None = None
    ) -> None:
        """Sync a command file to all existing project directories.

        If content is provided, writes/overwrites the file.
        If content is None, deletes the file (if it exists).
        """
        loop = asyncio.get_event_loop()

        def _do_sync() -> None:
            projects_dir = settings.projects_dir
            if not projects_dir.is_dir():
                return

            for entry in projects_dir.iterdir():
                # Skip hidden dirs (.templates, etc.) and non-directories
                if entry.name.startswith(".") or not entry.is_dir():
                    continue

                cmds_dir = entry / ".claude" / "commands"
                target = cmds_dir / f"{name}.md"

                if content is not None:
                    cmds_dir.mkdir(parents=True, exist_ok=True)
                    target.write_text(content, encoding="utf-8")
                else:
                    if target.is_file():
                        target.unlink()

        try:
            await loop.run_in_executor(None, _do_sync)
        except Exception:
            logger.warning(
                "Failed to sync command '%s' to projects", name, exc_info=True
            )

    def _list_builtin(self) -> list[dict]:
        results = []
        for cmd, prompt in COMMANDS.items():
            name = cmd.lstrip("/")
            results.append(
                {
                    "name": name,
                    "command": cmd,
                    "description": prompt[:120],
                    "content": prompt,
                    "is_builtin": True,
                    "source": "builtin",
                }
            )
        return results

    async def list_commands(self) -> list[dict]:
        loop = asyncio.get_event_loop()

        def _scan() -> list[dict]:
            results: list[dict] = []
            cmds_dir = self._commands_dir
            if not cmds_dir.is_dir():
                return results
            builtin = _builtin_names()
            for md_file in sorted(cmds_dir.iterdir()):
                if not md_file.suffix == ".md" or not md_file.is_file():
                    continue
                name = md_file.stem
                if name in builtin:
                    # Custom file overrides built-in description but we keep
                    # it separate — skip, will be merged below
                    pass
                content = md_file.read_text(encoding="utf-8")
                results.append(
                    {
                        "name": name,
                        "command": f"/{name}",
                        "description": _extract_description(content),
                        "content": content,
                        "is_builtin": False,
                        "source": "custom",
                    }
                )
            return results

        custom = await loop.run_in_executor(None, _scan)

        # Merge: built-ins first, then custom (excluding duplicates)
        custom_names = {c["name"] for c in custom}
        builtin = [b for b in self._list_builtin() if b["name"] not in custom_names]
        all_commands = sorted(builtin + custom, key=lambda c: c["name"])
        return all_commands

    async def get_command(self, name: str) -> dict:
        # Check custom first
        md_file = self._commands_dir / f"{name}.md"
        if md_file.is_file():
            content = await asyncio.get_event_loop().run_in_executor(
                None, lambda: md_file.read_text(encoding="utf-8")
            )
            return {
                "name": name,
                "command": f"/{name}",
                "description": _extract_description(content),
                "content": content,
                "is_builtin": False,
                "source": "custom",
            }

        # Check built-in
        cmd_key = f"/{name}"
        if cmd_key in COMMANDS:
            prompt = COMMANDS[cmd_key]
            return {
                "name": name,
                "command": cmd_key,
                "description": prompt[:120],
                "content": prompt,
                "is_builtin": True,
                "source": "builtin",
            }

        raise CommandNotFoundError(f"Command not found: {name}")

    async def create_command(self, name: str, content: str) -> dict:
        if f"/{name}" in COMMANDS:
            raise CommandConflictError(
                f"Cannot create command '{name}': conflicts with built-in command"
            )

        md_file = self._commands_dir / f"{name}.md"
        if md_file.exists():
            raise CommandConflictError(
                f"Command '{name}' already exists"
            )

        self._commands_dir.mkdir(parents=True, exist_ok=True)
        await asyncio.get_event_loop().run_in_executor(
            None, lambda: md_file.write_text(content, encoding="utf-8")
        )

        await self._sync_command_to_projects(name, content)

        return {
            "name": name,
            "command": f"/{name}",
            "description": _extract_description(content),
            "content": content,
            "is_builtin": False,
            "source": "custom",
        }

    async def update_command(self, name: str, content: str) -> dict:
        md_file = self._commands_dir / f"{name}.md"
        if not md_file.is_file():
            if f"/{name}" in COMMANDS:
                raise CommandConflictError(
                    f"Cannot edit built-in command '{name}'"
                )
            raise CommandNotFoundError(f"Command not found: {name}")

        await asyncio.get_event_loop().run_in_executor(
            None, lambda: md_file.write_text(content, encoding="utf-8")
        )

        await self._sync_command_to_projects(name, content)

        return {
            "name": name,
            "command": f"/{name}",
            "description": _extract_description(content),
            "content": content,
            "is_builtin": False,
            "source": "custom",
        }

    async def delete_command(self, name: str) -> None:
        if f"/{name}" in COMMANDS:
            raise CommandConflictError(
                f"Cannot delete built-in command '{name}'"
            )

        md_file = self._commands_dir / f"{name}.md"
        if not md_file.is_file():
            raise CommandNotFoundError(f"Command not found: {name}")

        await asyncio.get_event_loop().run_in_executor(None, md_file.unlink)
        await self._sync_command_to_projects(name, content=None)

    async def generate_command(
        self, name: str, description: str, api_key_service: object
    ) -> str:
        """Use Claude CLI to generate command content from a description."""
        claude_path = shutil.which(settings.claude_binary)
        if claude_path is None:
            raise CommandGenerationError(
                "Claude CLI is not available. Ensure it's installed and in your PATH."
            )

        meta_prompt = (
            f"You are generating a custom slash command .md file for Claude Code CLI.\n"
            f"The command name is: /{name}\n"
            f"The user wants a command that: {description}\n\n"
            f"Generate a markdown file following this pattern:\n"
            f"1. Start with a heading: # /{name} Command\n"
            f"2. Describe what the command does\n"
            f"3. Include ## Arguments Received section with `$ARGUMENTS` placeholder\n"
            f"4. Include step-by-step instructions for Claude on how to execute this command\n"
            f"5. Include output format and guidelines sections\n\n"
            f"Return ONLY the markdown content. No code fences wrapping the output."
        )

        env = {k: v for k, v in os.environ.items() if k != "CLAUDECODE"}
        try:
            key_map = await api_key_service.get_decrypted_env_map()
            env.update(key_map)
        except Exception:
            logger.warning("Failed to load API keys for generation", exc_info=True)

        cmd = [
            claude_path,
            "-p",
            meta_prompt,
            "--output-format",
            "text",
            "--model",
            settings.default_model,
            "--max-budget-usd",
            "1.0",
        ]

        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env=env,
        )

        try:
            stdout, stderr = await asyncio.wait_for(
                process.communicate(), timeout=90
            )
        except asyncio.TimeoutError:
            process.kill()
            await process.wait()
            raise CommandGenerationError(
                "Command generation timed out after 90 seconds. "
                "The AI model may be overloaded — try again."
            )

        if process.returncode != 0:
            error_text = stderr.decode("utf-8", errors="replace").strip()[:500]
            if "api key" in error_text.lower() or "unauthorized" in error_text.lower():
                raise CommandGenerationError(
                    "API authentication failed. Check your API keys in Settings."
                )
            raise CommandGenerationError(f"Generation failed: {error_text}")

        output = stdout.decode("utf-8", errors="replace").strip()
        if not output:
            raise CommandGenerationError(
                "AI returned empty content. Try a more descriptive prompt."
            )
        return output
