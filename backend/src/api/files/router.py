import asyncio
import os
from pathlib import Path

from fastapi import APIRouter, Query, Request

from fastapi import HTTPException

from ...schemas.common import APIResponse
from ...schemas.files import (
    FileNode,
    FileTreeResponse,
    FileSearchResult,
    FileSearchResponse,
    FileContentResponse,
    FolderListingResponse,
)

router = APIRouter(prefix="/api/projects", tags=["files"])

# Patterns to always skip (dirs and files that add noise)
IGNORED_DIRS = {
    ".git",
    "node_modules",
    "__pycache__",
    ".next",
    ".cache",
    "venv",
    ".venv",
    "env",
    ".env",
    "dist",
    "build",
    ".turbo",
    ".vercel",
    ".output",
    "coverage",
    ".mypy_cache",
    ".pytest_cache",
    ".ruff_cache",
    "egg-info",
}

IGNORED_FILES = {
    ".DS_Store",
    "Thumbs.db",
    "desktop.ini",
}


def _parse_gitignore(project_path: Path) -> set[str]:
    """Read .gitignore and return a set of top-level directory names to skip."""
    gitignore = project_path / ".gitignore"
    extra: set[str] = set()
    if not gitignore.exists():
        return extra
    for line in gitignore.read_text(errors="replace").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        # Simple heuristic: entries like "node_modules/" or "dist"
        name = line.rstrip("/").lstrip("/")
        if name and "/" not in name and "*" not in name:
            extra.add(name)
    return extra


def _build_tree(root: Path, ignored_dirs: set[str], max_depth: int = 10) -> list[FileNode]:
    """Walk the directory tree and return a sorted list of FileNode objects."""
    nodes: list[FileNode] = []

    try:
        entries = sorted(os.scandir(root), key=lambda e: (not e.is_dir(), e.name.lower()))
    except PermissionError:
        return nodes

    for entry in entries:
        if entry.name in IGNORED_FILES:
            continue

        if entry.is_dir(follow_symlinks=False):
            if entry.name in ignored_dirs or entry.name.startswith("."):
                continue
            children = _build_tree(Path(entry.path), ignored_dirs, max_depth - 1) if max_depth > 0 else []
            nodes.append(FileNode(name=entry.name, type="directory", children=children))
        elif entry.is_file(follow_symlinks=False):
            nodes.append(FileNode(name=entry.name, type="file"))

    return nodes


@router.get("/{project_id}/files", response_model=APIResponse[FileTreeResponse])
async def get_file_tree(
    project_id: str,
    request: Request,
    max_depth: int = Query(10, ge=1, le=20),
):
    service = request.app.state.project_service
    project = await service.get_project(project_id)
    project_path = Path(project["path"])

    loop = asyncio.get_event_loop()

    def _scan() -> list[FileNode]:
        extra_ignored = _parse_gitignore(project_path)
        all_ignored = IGNORED_DIRS | extra_ignored
        return _build_tree(project_path, all_ignored, max_depth)

    tree = await loop.run_in_executor(None, _scan)
    return APIResponse(data=FileTreeResponse(tree=tree, root=str(project_path)))


# ---------------------------------------------------------------------------
# Helpers for flattening and searching
# ---------------------------------------------------------------------------

BINARY_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".ico", ".svg", ".webp",
    ".mp3", ".mp4", ".wav", ".ogg", ".webm", ".avi", ".mov",
    ".zip", ".tar", ".gz", ".bz2", ".7z", ".rar",
    ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
    ".exe", ".dll", ".so", ".dylib", ".bin", ".dat",
    ".woff", ".woff2", ".ttf", ".eot", ".otf",
    ".pyc", ".pyo", ".class", ".o", ".obj",
}


def _flatten_tree(
    root: Path,
    ignored_dirs: set[str],
    prefix: str = "",
    max_depth: int = 15,
) -> list[tuple[str, str, str]]:
    """Return a flat list of (relative_path, name, type) tuples."""
    results: list[tuple[str, str, str]] = []
    try:
        entries = sorted(os.scandir(root), key=lambda e: (not e.is_dir(), e.name.lower()))
    except PermissionError:
        return results

    for entry in entries:
        if entry.name in IGNORED_FILES:
            continue
        rel = f"{prefix}{entry.name}" if prefix else entry.name

        if entry.is_dir(follow_symlinks=False):
            if entry.name in ignored_dirs or entry.name.startswith("."):
                continue
            results.append((rel, entry.name, "directory"))
            if max_depth > 0:
                results.extend(
                    _flatten_tree(Path(entry.path), ignored_dirs, f"{rel}/", max_depth - 1)
                )
        elif entry.is_file(follow_symlinks=False):
            results.append((rel, entry.name, "file"))

    return results


def _fuzzy_match(query: str, items: list[tuple[str, str, str]], limit: int) -> list[FileSearchResult]:
    """Simple fuzzy matching: exact prefix > path contains > name contains."""
    q = query.lower()
    if not q:
        # No query — return first N items
        return [FileSearchResult(path=p, name=n, type=t) for p, n, t in items[:limit]]

    scored: list[tuple[int, str, str, str]] = []
    for path, name, typ in items:
        pl = path.lower()
        nl = name.lower()
        if nl.startswith(q):
            scored.append((0, path, name, typ))
        elif pl.startswith(q):
            scored.append((1, path, name, typ))
        elif q in nl:
            scored.append((2, path, name, typ))
        elif q in pl:
            scored.append((3, path, name, typ))

    scored.sort(key=lambda x: x[0])
    return [FileSearchResult(path=p, name=n, type=t) for _, p, n, t in scored[:limit]]


def _build_listing(root: Path, ignored_dirs: set[str], prefix: str = "", max_depth: int = 2) -> tuple[list[str], int]:
    """Build a tree-formatted listing string and count files."""
    lines: list[str] = []
    count = 0
    try:
        entries = sorted(os.scandir(root), key=lambda e: (not e.is_dir(), e.name.lower()))
    except PermissionError:
        return lines, count

    for entry in entries:
        if entry.name in IGNORED_FILES:
            continue
        if entry.is_dir(follow_symlinks=False):
            if entry.name in ignored_dirs or entry.name.startswith("."):
                continue
            lines.append(f"{prefix}{entry.name}/")
            if max_depth > 0:
                child_lines, child_count = _build_listing(
                    Path(entry.path), ignored_dirs, prefix + "  ", max_depth - 1
                )
                lines.extend(child_lines)
                count += child_count
        elif entry.is_file(follow_symlinks=False):
            lines.append(f"{prefix}{entry.name}")
            count += 1

    return lines, count


# ---------------------------------------------------------------------------
# File search endpoint
# ---------------------------------------------------------------------------

@router.get("/{project_id}/files/search", response_model=APIResponse[FileSearchResponse])
async def search_files(
    project_id: str,
    request: Request,
    q: str = Query("", max_length=200),
    limit: int = Query(20, ge=1, le=50),
):
    service = request.app.state.project_service
    project = await service.get_project(project_id)
    project_path = Path(project["path"])

    loop = asyncio.get_event_loop()

    def _search() -> FileSearchResponse:
        extra_ignored = _parse_gitignore(project_path)
        all_ignored = IGNORED_DIRS | extra_ignored
        flat = _flatten_tree(project_path, all_ignored)
        results = _fuzzy_match(q, flat, limit)
        return FileSearchResponse(results=results, total=len(results))

    data = await loop.run_in_executor(None, _search)
    return APIResponse(data=data)


# ---------------------------------------------------------------------------
# File content endpoint
# ---------------------------------------------------------------------------

@router.get("/{project_id}/files/content", response_model=APIResponse[FileContentResponse])
async def read_file_content(
    project_id: str,
    request: Request,
    path: str = Query(..., min_length=1),
    max_size: int = Query(50000, ge=1000, le=200000),
):
    service = request.app.state.project_service
    project = await service.get_project(project_id)
    project_path = Path(project["path"])

    target = (project_path / path).resolve()
    # Security: prevent path traversal
    if not target.is_relative_to(project_path.resolve()):
        raise HTTPException(status_code=400, detail="Path is outside project directory")

    if not target.is_file():
        raise HTTPException(status_code=404, detail="File not found")

    # Refuse binary files
    if target.suffix.lower() in BINARY_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Cannot read binary file")

    loop = asyncio.get_event_loop()

    def _read() -> FileContentResponse:
        size = target.stat().st_size
        truncated = size > max_size
        content = target.read_text(errors="replace")
        if truncated:
            content = content[:max_size]
        return FileContentResponse(
            path=path,
            content=content,
            truncated=truncated,
            size_bytes=size,
        )

    data = await loop.run_in_executor(None, _read)
    return APIResponse(data=data)


# ---------------------------------------------------------------------------
# Folder listing endpoint
# ---------------------------------------------------------------------------

@router.get("/{project_id}/files/listing", response_model=APIResponse[FolderListingResponse])
async def list_folder(
    project_id: str,
    request: Request,
    path: str = Query("", min_length=0),
    max_depth: int = Query(2, ge=1, le=5),
):
    service = request.app.state.project_service
    project = await service.get_project(project_id)
    project_path = Path(project["path"])

    target = (project_path / path).resolve() if path else project_path.resolve()
    # Security: prevent path traversal
    if not target.is_relative_to(project_path.resolve()):
        raise HTTPException(status_code=400, detail="Path is outside project directory")

    if not target.is_dir():
        raise HTTPException(status_code=404, detail="Directory not found")

    loop = asyncio.get_event_loop()

    def _list() -> FolderListingResponse:
        extra_ignored = _parse_gitignore(project_path)
        all_ignored = IGNORED_DIRS | extra_ignored
        lines, count = _build_listing(target, all_ignored, max_depth=max_depth)
        return FolderListingResponse(
            path=path or ".",
            listing="\n".join(lines),
            file_count=count,
        )

    data = await loop.run_in_executor(None, _list)
    return APIResponse(data=data)
