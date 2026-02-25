from datetime import datetime

from pydantic import BaseModel, Field


class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: str = Field(default="", max_length=500)
    use_template: bool = True


class ProjectUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    description: str | None = Field(None, max_length=500)


class PreviewDetection(BaseModel):
    supported: bool
    framework: str | None = None
    needs_install: bool = False
    subdir: str | None = None


class ProjectInfo(BaseModel):
    id: str
    name: str
    slug: str
    path: str
    description: str
    created_at: str
    updated_at: str
    file_count: int | None = None
    has_git: bool | None = None
    git_branch: str | None = None
    github_repo_url: str = ""
    is_pinned: bool = False
    is_system: bool = False
    preview: PreviewDetection | None = None


class ProjectListResponse(BaseModel):
    projects: list[ProjectInfo]
    total: int
