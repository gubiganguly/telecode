from pydantic import BaseModel


class FileNode(BaseModel):
    name: str
    type: str  # "file" | "directory"
    children: list["FileNode"] | None = None


class FileTreeResponse(BaseModel):
    tree: list[FileNode]
    root: str


class FileSearchResult(BaseModel):
    path: str
    name: str
    type: str  # "file" | "directory"


class FileSearchResponse(BaseModel):
    results: list[FileSearchResult]
    total: int


class FileContentResponse(BaseModel):
    path: str
    content: str
    truncated: bool
    size_bytes: int


class FolderListingResponse(BaseModel):
    path: str
    listing: str
    file_count: int
