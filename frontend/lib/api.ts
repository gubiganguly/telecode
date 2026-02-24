import { API_BASE_URL } from "./constants";
import { getToken, clearToken } from "./auth";
import type {
  APIResponse,
  ProjectInfo,
  ProjectListResponse,
  ProjectCreate,
  ProjectUpdate,
  SessionInfo,
  SessionListResponse,
  SessionCreate,
  SessionUpdate,
  HealthStatus,
  ApiKeyInfo,
  ApiKeyListResponse,
  ApiKeyCreate,
  ApiKeyUpdate,
  ApiKeyValueResponse,
  CommandInfo,
  CommandListResponse,
  CommandCreate,
  CommandUpdate,
  CommandGenerateRequest,
  CommandGenerateResponse,
  McpListResponse,
  McpInstallRequest,
  McpInstallResponse,
  ClaudeMdResponse,
  ClaudeMdUpdate,
  FileTreeResponse,
  FileSearchResponse,
  FileContentResponse,
  FolderListingResponse,
  UrlFetchResponse,
  GitHubStatusResponse,
  GitHubCreateRepoRequest,
  GitHubCreateRepoResponse,
  GitHubRepoListResponse,
  GitHubPushResponse,
  MessageListResponse,
} from "@/types/api";

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private authHeaders(): Record<string, string> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return headers;
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      headers: { ...this.authHeaders(), ...options?.headers },
      ...options,
    });

    if (response.status === 401) {
      clearToken();
      window.location.href = "/login";
      throw new Error("Session expired");
    }

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(
        (body as APIResponse<unknown>)?.error || `Request failed: ${response.status}`
      );
    }

    const body: APIResponse<T> = await response.json();
    if (!body.success || body.data === null) {
      throw new Error(body.error || "Unknown error");
    }
    return body.data;
  }

  async getHealth(): Promise<HealthStatus> {
    const res = await fetch(`${this.baseUrl}/api/health`, {
      headers: this.authHeaders(),
    });
    return res.json();
  }

  // Projects
  async listProjects(offset = 0, limit = 50): Promise<ProjectListResponse> {
    return this.request<ProjectListResponse>(
      `/api/projects?offset=${offset}&limit=${limit}`
    );
  }

  async createProject(data: ProjectCreate): Promise<ProjectInfo> {
    return this.request<ProjectInfo>("/api/projects", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getProject(id: string): Promise<ProjectInfo> {
    return this.request<ProjectInfo>(`/api/projects/${id}`);
  }

  async updateProject(id: string, data: ProjectUpdate): Promise<ProjectInfo> {
    return this.request<ProjectInfo>(`/api/projects/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async gitInitProject(id: string): Promise<ProjectInfo> {
    return this.request<ProjectInfo>(`/api/projects/${id}/git-init`, {
      method: "POST",
    });
  }

  async deleteProject(id: string, deleteFiles = false, deleteRepo = false): Promise<void> {
    await fetch(`${this.baseUrl}/api/projects/${id}?delete_files=${deleteFiles}&delete_repo=${deleteRepo}`, {
      method: "DELETE",
      headers: this.authHeaders(),
    });
  }

  // Sessions
  async listSessions(
    projectId: string,
    offset = 0,
    limit = 50
  ): Promise<SessionListResponse> {
    return this.request<SessionListResponse>(
      `/api/sessions?project_id=${projectId}&offset=${offset}&limit=${limit}`
    );
  }

  async createSession(data: SessionCreate): Promise<SessionInfo> {
    return this.request<SessionInfo>("/api/sessions", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getSession(id: string): Promise<SessionInfo> {
    return this.request<SessionInfo>(`/api/sessions/${id}`);
  }

  async updateSession(id: string, data: SessionUpdate): Promise<SessionInfo> {
    return this.request<SessionInfo>(`/api/sessions/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async deleteSession(id: string): Promise<void> {
    await fetch(`${this.baseUrl}/api/sessions/${id}`, {
      method: "DELETE",
      headers: this.authHeaders(),
    });
  }

  // API Keys
  async listApiKeys(): Promise<ApiKeyListResponse> {
    return this.request<ApiKeyListResponse>("/api/keys");
  }

  async createApiKey(data: ApiKeyCreate): Promise<ApiKeyInfo> {
    return this.request<ApiKeyInfo>("/api/keys", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateApiKey(id: string, data: ApiKeyUpdate): Promise<ApiKeyInfo> {
    return this.request<ApiKeyInfo>(`/api/keys/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async getApiKeyValue(id: string): Promise<ApiKeyValueResponse> {
    return this.request<ApiKeyValueResponse>(`/api/keys/${id}/value`);
  }

  async deleteApiKey(id: string): Promise<void> {
    await fetch(`${this.baseUrl}/api/keys/${id}`, {
      method: "DELETE",
      headers: this.authHeaders(),
    });
  }

  // Commands
  async listCommands(): Promise<CommandListResponse> {
    return this.request<CommandListResponse>("/api/commands");
  }

  async getCommand(name: string): Promise<CommandInfo> {
    return this.request<CommandInfo>(`/api/commands/${name}`);
  }

  async createCommand(data: CommandCreate): Promise<CommandInfo> {
    return this.request<CommandInfo>("/api/commands", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateCommand(name: string, data: CommandUpdate): Promise<CommandInfo> {
    return this.request<CommandInfo>(`/api/commands/${name}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteCommand(name: string): Promise<void> {
    await fetch(`${this.baseUrl}/api/commands/${name}`, {
      method: "DELETE",
      headers: this.authHeaders(),
    });
  }

  async generateCommand(data: CommandGenerateRequest): Promise<CommandGenerateResponse> {
    return this.request<CommandGenerateResponse>("/api/commands/generate", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // MCPs
  async listMcps(): Promise<McpListResponse> {
    return this.request<McpListResponse>("/api/mcps");
  }

  async installMcp(data: McpInstallRequest): Promise<McpInstallResponse> {
    return this.request<McpInstallResponse>("/api/mcps/install", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // CLAUDE.md
  async getClaudeMd(): Promise<ClaudeMdResponse> {
    return this.request<ClaudeMdResponse>("/api/claude-md");
  }

  async updateClaudeMd(data: ClaudeMdUpdate): Promise<ClaudeMdResponse> {
    return this.request<ClaudeMdResponse>("/api/claude-md", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  // File Tree
  async getFileTree(projectId: string): Promise<FileTreeResponse> {
    return this.request<FileTreeResponse>(`/api/projects/${projectId}/files`);
  }

  // Mentions — file search, content, listing, URL fetch
  async searchFiles(projectId: string, query: string, limit = 20): Promise<FileSearchResponse> {
    return this.request<FileSearchResponse>(
      `/api/projects/${projectId}/files/search?q=${encodeURIComponent(query)}&limit=${limit}`
    );
  }

  async readFileContent(projectId: string, path: string): Promise<FileContentResponse> {
    return this.request<FileContentResponse>(
      `/api/projects/${projectId}/files/content?path=${encodeURIComponent(path)}`
    );
  }

  async readFolderListing(projectId: string, path: string): Promise<FolderListingResponse> {
    return this.request<FolderListingResponse>(
      `/api/projects/${projectId}/files/listing?path=${encodeURIComponent(path)}`
    );
  }

  async fetchUrlContent(url: string): Promise<UrlFetchResponse> {
    return this.request<UrlFetchResponse>("/api/mentions/fetch-url", {
      method: "POST",
      body: JSON.stringify({ url }),
    });
  }

  // GitHub
  async getGitHubStatus(): Promise<GitHubStatusResponse> {
    return this.request<GitHubStatusResponse>("/api/github/status");
  }

  getGitHubLoginUrl(): string {
    return `${this.baseUrl}/api/github/auth/login`;
  }

  async disconnectGitHub(): Promise<void> {
    await fetch(`${this.baseUrl}/api/github/disconnect`, {
      method: "DELETE",
      headers: this.authHeaders(),
    });
  }

  async createGitHubRepo(data: GitHubCreateRepoRequest): Promise<GitHubCreateRepoResponse> {
    return this.request<GitHubCreateRepoResponse>("/api/github/repos", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async listGitHubRepos(): Promise<GitHubRepoListResponse> {
    return this.request<GitHubRepoListResponse>("/api/github/repos");
  }

  async linkGitHubRepo(projectId: string, repoUrl: string): Promise<ProjectInfo> {
    return this.request<ProjectInfo>(`/api/github/projects/${projectId}/link`, {
      method: "POST",
      body: JSON.stringify({ repo_url: repoUrl }),
    });
  }

  // Messages
  async listMessages(sessionId: string, offset = 0, limit = 200): Promise<MessageListResponse> {
    return this.request<MessageListResponse>(
      `/api/messages?session_id=${sessionId}&offset=${offset}&limit=${limit}`
    );
  }

  async pushToGitHub(projectId: string, branch?: string): Promise<GitHubPushResponse> {
    return this.request<GitHubPushResponse>(`/api/github/projects/${projectId}/push`, {
      method: "POST",
      body: JSON.stringify({ branch }),
    });
  }
}

export const api = new ApiClient(API_BASE_URL);
