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
  CredentialInfo,
  CredentialListResponse,
  CredentialCreate,
  CredentialUpdate,
  CredentialValueResponse,
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
  ProjectClaudeMdResponse,
  ProjectCommandInfo,
  ProjectCommandListResponse,
  ProjectMcpListResponse,
  ProjectApprovalsResponse,
  ProjectEnvVar,
  ProjectEnvVarsResponse,
  GlobalApprovalsResponse,
  TaskListResponse,
  PreviewInfo,
  PreviewLogsResponse,
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

  // Credentials
  async listCredentials(): Promise<CredentialListResponse> {
    return this.request<CredentialListResponse>("/api/credentials");
  }

  async createCredential(data: CredentialCreate): Promise<CredentialInfo> {
    return this.request<CredentialInfo>("/api/credentials", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateCredential(id: string, data: CredentialUpdate): Promise<CredentialInfo> {
    return this.request<CredentialInfo>(`/api/credentials/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async getCredentialValue(id: string): Promise<CredentialValueResponse> {
    return this.request<CredentialValueResponse>(`/api/credentials/${id}/value`);
  }

  async deleteCredential(id: string): Promise<void> {
    await fetch(`${this.baseUrl}/api/credentials/${id}`, {
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

  // Project Settings
  async getProjectClaudeMd(projectId: string): Promise<ProjectClaudeMdResponse> {
    return this.request<ProjectClaudeMdResponse>(
      `/api/projects/${projectId}/settings/claude-md`
    );
  }

  async updateProjectClaudeMd(projectId: string, content: string): Promise<ProjectClaudeMdResponse> {
    return this.request<ProjectClaudeMdResponse>(
      `/api/projects/${projectId}/settings/claude-md`,
      { method: "PUT", body: JSON.stringify({ content }) }
    );
  }

  async getProjectCommands(projectId: string): Promise<ProjectCommandListResponse> {
    return this.request<ProjectCommandListResponse>(
      `/api/projects/${projectId}/settings/commands`
    );
  }

  async createProjectCommand(projectId: string, name: string, content: string): Promise<ProjectCommandInfo> {
    return this.request<ProjectCommandInfo>(
      `/api/projects/${projectId}/settings/commands`,
      { method: "POST", body: JSON.stringify({ name, content }) }
    );
  }

  async updateProjectCommand(projectId: string, name: string, content: string): Promise<ProjectCommandInfo> {
    return this.request<ProjectCommandInfo>(
      `/api/projects/${projectId}/settings/commands/${name}`,
      { method: "PUT", body: JSON.stringify({ content }) }
    );
  }

  async deleteProjectCommand(projectId: string, name: string): Promise<void> {
    await fetch(`${this.baseUrl}/api/projects/${projectId}/settings/commands/${name}`, {
      method: "DELETE",
      headers: this.authHeaders(),
    });
  }

  async getProjectMcps(projectId: string): Promise<ProjectMcpListResponse> {
    return this.request<ProjectMcpListResponse>(
      `/api/projects/${projectId}/settings/mcps`
    );
  }

  async getProjectApprovals(projectId: string): Promise<ProjectApprovalsResponse> {
    return this.request<ProjectApprovalsResponse>(
      `/api/projects/${projectId}/settings/approvals`
    );
  }

  async updateProjectApprovals(projectId: string, enabled: boolean | null): Promise<ProjectApprovalsResponse> {
    return this.request<ProjectApprovalsResponse>(
      `/api/projects/${projectId}/settings/approvals`,
      { method: "PUT", body: JSON.stringify({ enabled }) }
    );
  }

  // Project Env Vars
  async getProjectEnvVars(projectId: string): Promise<ProjectEnvVarsResponse> {
    return this.request<ProjectEnvVarsResponse>(
      `/api/projects/${projectId}/settings/env-vars`
    );
  }

  async createProjectEnvVar(projectId: string, name: string, env_var: string, value: string): Promise<ProjectEnvVar> {
    return this.request<ProjectEnvVar>(
      `/api/projects/${projectId}/settings/env-vars`,
      { method: "POST", body: JSON.stringify({ name, env_var, value }) }
    );
  }

  async updateProjectEnvVar(projectId: string, envVarId: string, data: { name?: string; env_var?: string; value?: string }): Promise<ProjectEnvVar> {
    return this.request<ProjectEnvVar>(
      `/api/projects/${projectId}/settings/env-vars/${envVarId}`,
      { method: "PUT", body: JSON.stringify(data) }
    );
  }

  async deleteProjectEnvVar(projectId: string, envVarId: string): Promise<void> {
    await fetch(`${this.baseUrl}/api/projects/${projectId}/settings/env-vars/${envVarId}`, {
      method: "DELETE",
      headers: this.authHeaders(),
    });
  }

  // Global Settings
  async getGlobalApprovals(): Promise<GlobalApprovalsResponse> {
    return this.request<GlobalApprovalsResponse>("/api/settings/approvals");
  }

  async updateGlobalApprovals(enabled: boolean): Promise<GlobalApprovalsResponse> {
    return this.request<GlobalApprovalsResponse>("/api/settings/approvals", {
      method: "PUT",
      body: JSON.stringify({ enabled }),
    });
  }

  // Credential exclusion (per-project)
  async excludeCredential(projectId: string, envVar: string): Promise<void> {
    await this.request(`/api/projects/${projectId}/settings/excluded-credentials`, {
      method: "POST",
      body: JSON.stringify({ env_var: envVar }),
    });
  }

  async includeCredential(projectId: string, envVar: string): Promise<void> {
    await this.request(`/api/projects/${projectId}/settings/excluded-credentials/${envVar}`, {
      method: "DELETE",
    });
  }

  // Background Tasks
  async listActiveTasks(): Promise<TaskListResponse> {
    return this.request<TaskListResponse>("/api/tasks");
  }

  async cancelTask(sessionId: string): Promise<void> {
    await this.request(`/api/tasks/${sessionId}/cancel`, { method: "POST" });
  }

  // MCP credential installation
  async installMcpCredential(data: { name: string; service: string; env_var: string; value: string }): Promise<void> {
    await this.request("/api/mcps/install-credential", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // Live Preview
  async startPreview(projectId: string): Promise<PreviewInfo> {
    return this.request<PreviewInfo>(`/api/preview/${projectId}/start`, {
      method: "POST",
    });
  }

  async stopPreview(projectId: string): Promise<void> {
    await this.request(`/api/preview/${projectId}/stop`, { method: "POST" });
  }

  async getPreviewStatus(projectId: string): Promise<PreviewInfo | null> {
    const response = await fetch(`${this.baseUrl}/api/preview/${projectId}/status`, {
      headers: this.authHeaders(),
    });
    if (!response.ok) return null;
    const body = await response.json();
    return body.data ?? null;
  }

  async getPreviewLogs(projectId: string, sinceLine: number = 0): Promise<PreviewLogsResponse> {
    return this.request<PreviewLogsResponse>(
      `/api/preview/${projectId}/logs?since_line=${sinceLine}`
    );
  }
}

export const api = new ApiClient(API_BASE_URL);
