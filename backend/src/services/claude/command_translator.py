import re
from pathlib import Path

from ...core.config import settings


COMMANDS: dict[str, str] = {
    "/commit": (
        "Look at the current staged changes (git diff --cached) and unstaged changes. "
        "Create an appropriate git commit with a clear, descriptive commit message. "
        "Stage relevant files first if needed."
    ),
    "/review": (
        "Review the current uncommitted changes in this project. "
        "Provide feedback on code quality, potential bugs, and improvements. "
        "Be specific and reference line numbers."
    ),
    "/test": (
        "Look at the project structure and run the test suite. "
        "If tests fail, analyze the failures and suggest fixes."
    ),
    "/fix": (
        "Look at the current lint errors, type errors, and test failures in this project. "
        "Fix all issues you find."
    ),
    "/build": (
        "Run the build command for this project and fix any errors that occur."
    ),
    "/lint": (
        "Run the linter for this project, analyze the output, and fix all linting issues."
    ),
    "/refactor": (
        "Analyze the current codebase and suggest refactoring improvements. "
        "Focus on code duplication, complexity, and adherence to best practices."
    ),
    "/docs": (
        "Generate or update documentation for the project. "
        "Look at public APIs, functions, and modules that lack adequate documentation."
    ),
    "/git-status": (
        "Run git status and git log --oneline -10 and summarize the current state "
        "of the repository."
    ),
}


def translate(message: str) -> str:
    """Translate a slash command to a natural language prompt for `claude -p`.

    If the message starts with a known slash command, returns the mapped prompt.
    Unknown commands or regular messages are passed through unchanged.
    Supports trailing args: ``/commit fix the typo`` appends extra context.
    """
    stripped = message.strip()
    if not stripped.startswith("/"):
        return message

    match = re.match(r"^(/[\w-]+)(?:\s+(.+))?$", stripped, re.DOTALL)
    if not match:
        return message

    command = match.group(1).lower()
    extra_context = match.group(2) or ""

    base_prompt = COMMANDS.get(command)
    if base_prompt is None:
        base_prompt = _read_custom_command(command)
    if base_prompt is None:
        return message

    if extra_context:
        return f"{base_prompt}\n\nAdditional context: {extra_context}"
    return base_prompt


def _read_custom_command(command: str) -> str | None:
    """Read a custom command .md file from the templates directory."""
    name = command.lstrip("/")
    cmd_file = settings.templates_dir / ".claude" / "commands" / f"{name}.md"
    if cmd_file.is_file():
        return cmd_file.read_text(encoding="utf-8").strip()
    return None
