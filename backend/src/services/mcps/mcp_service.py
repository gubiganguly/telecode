import asyncio
import json
import logging
import os
import re
import shutil

from ...core.config import settings
from ...core.exceptions import McpInstallError, McpNotFoundError

logger = logging.getLogger(__name__)


class McpService:
    async def list_mcps(self) -> list[dict]:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._scan)

    def _scan(self) -> list[dict]:
        plugins_dir = settings.mcp_plugins_dir
        if not plugins_dir.is_dir():
            return []

        results: list[dict] = []
        for subdir in sorted(plugins_dir.iterdir()):
            if not subdir.is_dir():
                continue
            mcp_json = subdir / ".mcp.json"
            if not mcp_json.is_file():
                continue
            try:
                data = json.loads(mcp_json.read_text(encoding="utf-8"))
                # Normalize: some configs wrap in "mcpServers"
                if "mcpServers" in data:
                    data = data["mcpServers"]

                for name, config in data.items():
                    mcp: dict = {"name": name}
                    if "command" in config:
                        mcp["command"] = config["command"]
                        mcp["args"] = config.get("args", [])
                    elif "url" in config:
                        mcp["url"] = config["url"]
                    results.append(mcp)
            except (json.JSONDecodeError, KeyError, TypeError):
                logger.warning("Failed to parse MCP config: %s", mcp_json)
                continue

        return results

    # ------------------------------------------------------------------
    # MCP Installation via natural language
    # ------------------------------------------------------------------

    async def install_mcp(self, query: str, api_key_service: object) -> dict:
        """Two-step install: interpret natural language → execute claude mcp add."""
        claude_path = shutil.which(settings.claude_binary)
        if claude_path is None:
            raise McpInstallError(
                f"Claude CLI binary '{settings.claude_binary}' not found in PATH. "
                "Ensure Claude Code CLI is installed."
            )

        env = {k: v for k, v in os.environ.items() if k != "CLAUDECODE"}
        try:
            key_map = await api_key_service.get_decrypted_env_map()
            env.update(key_map)
        except Exception:
            logger.warning("Failed to load API keys for MCP install", exc_info=True)

        mcp_config = await self._interpret_mcp_query(claude_path, query, env)
        return await self._execute_mcp_add(claude_path, mcp_config, env)

    async def _interpret_mcp_query(
        self, claude_path: str, query: str, env: dict
    ) -> dict:
        """Use claude -p to convert natural language to structured MCP config."""
        meta_prompt = (
            "You are a helper that converts natural language MCP (Model Context Protocol) "
            "server installation requests into structured data.\n\n"
            "Based on the user's request, determine:\n"
            "1. The server name (short identifier)\n"
            "2. The command to run (typically 'npx')\n"
            "3. The arguments (package name and flags)\n\n"
            "Common MCPs:\n"
            "- context7: npx -y @upstash/context7-mcp\n"
            "- playwright: npx -y @anthropic/mcp-playwright\n"
            "- filesystem: npx -y @anthropic/mcp-filesystem\n"
            "- github: npx -y @anthropic/mcp-github\n"
            "- slack: npx -y @anthropic/mcp-slack\n"
            "- brave-search: npx -y brave-search-mcp\n"
            "- postgres: npx -y @anthropic/mcp-postgres\n"
            "- memory: npx -y @anthropic/mcp-memory\n"
            "- sequential-thinking: npx -y @anthropic/mcp-sequential-thinking\n"
            "- puppeteer: npx -y @anthropic/mcp-puppeteer\n"
            "- fetch: npx -y @anthropic/mcp-fetch\n"
            "- firebase: npx -y firebase-tools@latest mcp\n"
            "- asana (SSE URL): https://mcp.asana.com/sse\n\n"
            "Respond with ONLY a JSON object (no markdown fences, no extra text):\n"
            '{"name": "server-name", "command": "npx", "args": ["-y", "package-name"]}\n\n'
            "For SSE/URL-based MCPs, respond with:\n"
            '{"name": "server-name", "url": "https://..."}\n\n'
            "If you cannot determine what MCP the user wants, respond with:\n"
            '{"error": "Could not determine which MCP server you want. '
            'Try being more specific, e.g. \'add the context7 mcp\'."}\n\n'
            f"User request: {query}"
        )

        cmd = [
            claude_path, "-p", meta_prompt,
            "--output-format", "text",
            "--model", settings.default_model,
            "--max-budget-usd", "0.5",
        ]

        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env=env,
        )

        try:
            stdout, stderr = await asyncio.wait_for(
                process.communicate(), timeout=60
            )
        except asyncio.TimeoutError:
            process.kill()
            await process.wait()
            raise McpInstallError(
                "MCP interpretation timed out. Please try again."
            )

        if process.returncode != 0:
            error_text = stderr.decode("utf-8", errors="replace").strip()[:500]
            raise McpInstallError(
                f"Failed to interpret MCP request: {error_text}"
            )

        raw = stdout.decode("utf-8", errors="replace").strip()

        # Parse JSON from response
        try:
            result = json.loads(raw)
        except json.JSONDecodeError:
            match = re.search(r"\{[^}]+\}", raw)
            if match:
                try:
                    result = json.loads(match.group())
                except json.JSONDecodeError:
                    raise McpInstallError(
                        "Could not understand MCP request. "
                        "Try being more specific (e.g. 'add the context7 mcp')."
                    )
            else:
                raise McpInstallError(
                    "Could not understand MCP request. "
                    "Try being more specific (e.g. 'add the context7 mcp')."
                )

        if "error" in result:
            raise McpNotFoundError(result["error"])

        if "name" not in result:
            raise McpInstallError(
                "AI returned incomplete MCP config. "
                "Try being more specific."
            )

        # Must have either command+args or url
        if "command" not in result and "url" not in result:
            raise McpInstallError(
                "AI returned incomplete MCP config (no command or url). "
                "Try being more specific."
            )

        return result

    async def _execute_mcp_add(
        self, claude_path: str, mcp_config: dict, env: dict
    ) -> dict:
        """Execute `claude mcp add` subprocess."""
        name = mcp_config["name"]

        if "url" in mcp_config:
            # SSE-based MCP
            cmd = [
                claude_path, "mcp", "add",
                "-s", "user",
                "--transport", "sse",
                name,
                mcp_config["url"],
            ]
        else:
            # stdio-based MCP
            command = mcp_config["command"]
            args = mcp_config.get("args", [])
            cmd = [
                claude_path, "mcp", "add",
                "-s", "user",
                name,
                "--",
                command,
                *args,
            ]

        cmd_str = " ".join(cmd)
        logger.info("Installing MCP: %s", cmd_str)

        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env=env,
        )

        try:
            stdout, stderr = await asyncio.wait_for(
                process.communicate(), timeout=60
            )
        except asyncio.TimeoutError:
            process.kill()
            await process.wait()
            raise McpInstallError(
                "MCP installation timed out after 60 seconds."
            )

        stdout_text = stdout.decode("utf-8", errors="replace").strip()
        stderr_text = stderr.decode("utf-8", errors="replace").strip()

        if process.returncode != 0:
            combined = f"{stdout_text} {stderr_text}".lower()
            if "not found" in combined or "no such" in combined:
                raise McpNotFoundError(
                    f"MCP server '{name}' could not be found. "
                    "Check the name and try again."
                )
            raise McpInstallError(
                f"Installation failed: "
                f"{stderr_text[:300] or stdout_text[:300]}"
            )

        return {
            "success": True,
            "name": name,
            "message": f"Successfully installed MCP server '{name}'",
            "command_executed": cmd_str,
        }
