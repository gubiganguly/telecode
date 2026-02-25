"""REST endpoints for managing live project previews."""

from __future__ import annotations

import asyncio
from pathlib import Path

from fastapi import APIRouter, Query, Request

from ...core.database import db
from ...core.exceptions import ProjectNotFoundError
from ...schemas.preview import PreviewDetection, PreviewInfo, PreviewLogsResponse

router = APIRouter(prefix="/api/preview", tags=["preview"])


async def _resolve_project(project_id: str) -> dict:
    """Look up a project by ID, raising 404 if not found."""
    async with db.conn.execute(
        "SELECT id, slug, path FROM projects WHERE id = ?", (project_id,)
    ) as cur:
        row = await cur.fetchone()
    if not row:
        raise ProjectNotFoundError(f"Project not found: {project_id}")
    return dict(row)


@router.get("/{project_id}/detect")
async def detect_preview(project_id: str, request: Request) -> dict:
    """Check if a project supports live preview."""
    project = await _resolve_project(project_id)
    svc = request.app.state.preview_service

    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(
        None, svc.detect, Path(project["path"])
    )

    return {
        "success": True,
        "data": PreviewDetection(
            supported=result.supported,
            framework=result.framework,
            needs_install=result.needs_install,
        ).model_dump(),
        "error": None,
    }


@router.post("/{project_id}/start")
async def start_preview(project_id: str, request: Request) -> dict:
    """Start the dev server for a project."""
    project = await _resolve_project(project_id)
    svc = request.app.state.preview_service

    info = await svc.start(
        project_id=project_id,
        project_path=Path(project["path"]),
        slug=project["slug"],
    )

    return {
        "success": True,
        "data": PreviewInfo(**info).model_dump(),
        "error": None,
    }


@router.post("/{project_id}/stop")
async def stop_preview(project_id: str, request: Request) -> dict:
    """Stop the running preview for a project."""
    await _resolve_project(project_id)
    svc = request.app.state.preview_service
    await svc.stop(project_id)
    return {"success": True, "data": None, "error": None}


@router.get("/{project_id}/status")
async def preview_status(project_id: str, request: Request) -> dict:
    """Get the current preview status for a project."""
    project = await _resolve_project(project_id)
    svc = request.app.state.preview_service
    info = await svc.status(project_id, project["slug"])

    return {
        "success": True,
        "data": PreviewInfo(**info).model_dump() if info else None,
        "error": None,
    }


@router.get("/{project_id}/logs")
async def preview_logs(
    project_id: str,
    request: Request,
    since_line: int = Query(0, ge=0),
) -> dict:
    """Get dev server log output."""
    await _resolve_project(project_id)
    svc = request.app.state.preview_service
    lines, total = svc.get_logs(project_id, since_line)

    return {
        "success": True,
        "data": PreviewLogsResponse(logs=lines, total_lines=total).model_dump(),
        "error": None,
    }
