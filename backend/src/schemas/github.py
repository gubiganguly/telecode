from pydantic import BaseModel, Field


class GitHubAccountInfo(BaseModel):
    id: str
    github_username: str
    avatar_url: str
    created_at: str


class GitHubStatusResponse(BaseModel):
    connected: bool
    account: GitHubAccountInfo | None = None


class GitHubCreateRepoRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: str = Field(default="", max_length=500)
    private: bool = True


class GitHubCreateRepoResponse(BaseModel):
    full_name: str
    html_url: str
    private: bool


class GitHubRepoInfo(BaseModel):
    full_name: str
    html_url: str
    private: bool
    description: str


class GitHubRepoListResponse(BaseModel):
    repos: list[GitHubRepoInfo]


class GitHubPushRequest(BaseModel):
    branch: str | None = None


class GitHubPushResponse(BaseModel):
    branch: str
    output: str


class GitHubLinkRepoRequest(BaseModel):
    repo_url: str = Field(..., min_length=1)
