"""Auto-detect project framework and generate appropriate start commands."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class DetectionResult:
    supported: bool
    framework: str | None = None  # "nextjs", "vite", "cra", "fastapi", "flask", "static"
    start_cmd: list[str] = field(default_factory=list)
    install_cmd: list[str] | None = None
    needs_install: bool = False
    port_env: bool = False  # True if port is set via PORT env var instead of CLI flag
    subdir: str | None = None  # Subdirectory containing the framework (e.g. "frontend")


# Common subdirectory names to scan for monorepo layouts
_SUBDIRS = ["frontend", "client", "web", "app", "backend", "server", "api", "src"]


def detect(project_path: Path) -> DetectionResult:
    """Scan a project directory and return framework detection results.

    First checks the project root, then scans common subdirectories for
    monorepo layouts (e.g. ``frontend/``, ``backend/``).

    The ``{port}`` placeholder in ``start_cmd`` is substituted at start time.
    """
    # Try root first
    result = _detect_in(project_path)
    if result.supported:
        return result

    # Scan common subdirectories
    for subdir in _SUBDIRS:
        sub_path = project_path / subdir
        if sub_path.is_dir():
            result = _detect_in(sub_path)
            if result.supported:
                result.subdir = subdir
                return result

    return DetectionResult(supported=False)


def _detect_in(scan_path: Path) -> DetectionResult:
    """Detect framework within a single directory."""
    pkg_json = scan_path / "package.json"

    # --- Node.js projects ---
    if pkg_json.exists():
        try:
            pkg = json.loads(pkg_json.read_text())
        except (json.JSONDecodeError, OSError):
            return DetectionResult(supported=False)

        deps = {
            *pkg.get("dependencies", {}).keys(),
            *pkg.get("devDependencies", {}).keys(),
        }
        scripts = pkg.get("scripts", {})
        needs_install = not (scan_path / "node_modules").is_dir()
        install_cmd = ["npm", "install"] if needs_install else None

        if "next" in deps:
            return DetectionResult(
                supported=True,
                framework="nextjs",
                start_cmd=["npm", "run", "dev", "--", "-p", "{port}"],
                install_cmd=install_cmd,
                needs_install=needs_install,
            )

        if "vite" in deps:
            return DetectionResult(
                supported=True,
                framework="vite",
                start_cmd=["npm", "run", "dev", "--", "--port", "{port}"],
                install_cmd=install_cmd,
                needs_install=needs_install,
            )

        if "react-scripts" in deps:
            return DetectionResult(
                supported=True,
                framework="cra",
                start_cmd=["npm", "start"],
                install_cmd=install_cmd,
                needs_install=needs_install,
                port_env=True,
            )

        # Generic Node project with a dev or start script
        if "dev" in scripts:
            return DetectionResult(
                supported=True,
                framework="node",
                start_cmd=["npm", "run", "dev"],
                install_cmd=install_cmd,
                needs_install=needs_install,
                port_env=True,
            )
        if "start" in scripts:
            return DetectionResult(
                supported=True,
                framework="node",
                start_cmd=["npm", "start"],
                install_cmd=install_cmd,
                needs_install=needs_install,
                port_env=True,
            )

    # --- Python projects ---
    requirements = scan_path / "requirements.txt"
    pyproject = scan_path / "pyproject.toml"
    req_text = ""
    if requirements.exists():
        try:
            req_text = requirements.read_text().lower()
        except OSError:
            pass
    elif pyproject.exists():
        try:
            req_text = pyproject.read_text().lower()
        except OSError:
            pass

    if req_text:
        if "fastapi" in req_text:
            # Try to find the main app module
            app_module = _find_fastapi_app(scan_path)
            return DetectionResult(
                supported=True,
                framework="fastapi",
                start_cmd=[
                    "uvicorn", app_module, "--port", "{port}", "--reload",
                ],
            )
        if "flask" in req_text:
            return DetectionResult(
                supported=True,
                framework="flask",
                start_cmd=["flask", "run", "--port", "{port}"],
            )

    # --- Static HTML ---
    if (scan_path / "index.html").exists():
        return DetectionResult(
            supported=True,
            framework="static",
            start_cmd=["python", "-m", "http.server", "{port}"],
        )

    return DetectionResult(supported=False)


def _find_fastapi_app(project_path: Path) -> str:
    """Try to locate the FastAPI app entry point."""
    # Check common patterns
    for candidate in [
        "src/main.py",
        "main.py",
        "app/main.py",
        "app.py",
        "src/app.py",
    ]:
        full = project_path / candidate
        if full.exists():
            try:
                content = full.read_text()
            except OSError:
                continue
            if "FastAPI" in content or "fastapi" in content:
                module = candidate.removesuffix(".py").replace("/", ".")
                # Try to detect the variable name
                if "app = FastAPI" in content or "app=FastAPI" in content:
                    return f"{module}:app"
                # Default to :app
                return f"{module}:app"
    return "main:app"
