export interface APIResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export interface PreviewDetection {
  supported: boolean;
  framework: string | null;
  needs_install: boolean;
  subdir: string | null;
}

export interface PreviewInfo {
  project_id: string;
  port: number;
  framework: string | null;
  status: "running" | "stopped" | "error";
  url: string | null;
  started_at: string | null;
  error: string | null;
}

export interface PreviewLogsResponse {
  logs: string[];
  total_lines: number;
}

export interface ProjectInfo {
  id: string;
  name: string;
  slug: string;
  path: string;
  description: string;
  created_at: string;
  updated_at: string;
  file_count: number | null;
  has_git: boolean | null;
  git_branch: string | null;
  github_repo_url: string;
  is_pinned: boolean;
  is_system: boolean;
  preview?: PreviewDetection | null;
}

export interface ProjectListResponse {
  projects: ProjectInfo[];
  total: number;
}

export interface ProjectCreate {
  name: string;
  description?: string;
  use_template?: boolean;
}

export interface ProjectUpdate {
  name?: string;
  description?: string;
}

export interface SessionInfo {
  id: string;
  project_id: string;
  name: string;
  created_at: string;
  updated_at: string;
  last_message: string;
  message_count: number;
  is_active: boolean;
}

export interface SessionListResponse {
  sessions: SessionInfo[];
  total: number;
}

export interface SessionCreate {
  project_id: string;
  name?: string;
}

export interface SessionUpdate {
  name?: string;
}

export interface HealthStatus {
  status: string;
  claude_cli_available: boolean;
  claude_cli_path: string | null;
  projects_dir_exists: boolean;
  projects_dir: string;
  version: string;
}

// Credentials
export interface CredentialInfo {
  id: string;
  name: string;
  service: string;
  env_var: string;
  masked_value: string;
  created_at: string;
  updated_at: string;
}

export interface CredentialValueResponse {
  value: string;
}

export interface CredentialListResponse {
  credentials: CredentialInfo[];
  total: number;
}

export interface CredentialCreate {
  name: string;
  service: string;
  env_var: string;
  value: string;
}

export interface CredentialUpdate {
  name?: string;
  service?: string;
  env_var?: string;
  value?: string;
}

export interface MissingCredential {
  env_var: string;
  name: string;
  description: string;
}

// Slash Commands
export interface CommandInfo {
  name: string;
  command: string;
  description: string;
  content: string;
  is_builtin: boolean;
  source: "builtin" | "custom";
}

export interface CommandCreate {
  name: string;
  content: string;
}

export interface CommandUpdate {
  content: string;
}

export interface CommandListResponse {
  commands: CommandInfo[];
  total: number;
}

export interface CommandGenerateRequest {
  name: string;
  description: string;
}

export interface CommandGenerateResponse {
  content: string;
}

// File Tree
export interface FileNode {
  name: string;
  type: "file" | "directory";
  children?: FileNode[];
}

export interface FileTreeResponse {
  tree: FileNode[];
  root: string;
}

// File Search & Content (for @mentions)
export interface FileSearchResult {
  path: string;
  name: string;
  type: "file" | "directory";
}

export interface FileSearchResponse {
  results: FileSearchResult[];
  total: number;
}

export interface FileContentResponse {
  path: string;
  content: string;
  truncated: boolean;
  size_bytes: number;
}

export interface FolderListingResponse {
  path: string;
  listing: string;
  file_count: number;
}

export interface UrlFetchResponse {
  url: string;
  content: string;
  title: string;
  truncated: boolean;
}

// MCPs
export interface McpServerConfig {
  name: string;
  command: string | null;
  args: string[] | null;
  url: string | null;
}

export interface McpListResponse {
  mcps: McpServerConfig[];
  total: number;
}

export interface McpInstallRequest {
  query: string;
}

export interface McpInstallResponse {
  success: boolean;
  name: string;
  message: string;
  command_executed: string;
  missing_credentials: MissingCredential[];
}

// CLAUDE.md
export interface ClaudeMdResponse {
  content: string;
  synced_projects: number;
}

export interface ClaudeMdUpdate {
  content: string;
}

// GitHub
export interface GitHubAccountInfo {
  id: string;
  github_username: string;
  avatar_url: string;
  created_at: string;
}

export interface GitHubStatusResponse {
  connected: boolean;
  account: GitHubAccountInfo | null;
}

export interface GitHubCreateRepoRequest {
  name: string;
  description?: string;
  private?: boolean;
}

export interface GitHubCreateRepoResponse {
  full_name: string;
  html_url: string;
  private: boolean;
}

export interface GitHubRepoInfo {
  full_name: string;
  html_url: string;
  private: boolean;
  description: string;
}

export interface GitHubRepoListResponse {
  repos: GitHubRepoInfo[];
}

export interface GitHubPushResponse {
  branch: string;
  output: string;
}

export interface GitHubLinkRepoRequest {
  repo_url: string;
}

// Project Settings
export interface ProjectClaudeMdResponse {
  content: string;
}

export interface ProjectCommandInfo {
  name: string;
  command: string;
  description: string;
  content: string;
}

export interface ProjectCommandListResponse {
  commands: ProjectCommandInfo[];
  total: number;
}

export interface ProjectMcpListResponse {
  mcps: McpServerConfig[];
  total: number;
}

export interface ProjectApprovalsResponse {
  enabled: boolean | null; // null = inherit from global
  global_default: boolean;
  effective: boolean;
}

// Project Env Vars
export interface ProjectEnvVar {
  id: string;
  name: string;
  env_var: string;
  masked_value: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectEnvVarsResponse {
  env_vars: ProjectEnvVar[];
  global_keys: string[];
  excluded_credentials: string[];
  total: number;
}

// Global Settings
export interface GlobalApprovalsResponse {
  enabled: boolean;
}

// Background Tasks
export interface TaskInfo {
  session_id: string;
  project_id: string;
  status: "running" | "completed" | "cancelled" | "error" | "waiting_for_input";
  started_at: string;
  completed_at: string | null;
  event_count: number;
  subscriber_count: number;
  elapsed_seconds: number;
}

export interface TaskListResponse {
  tasks: TaskInfo[];
  total: number;
}

// Messages
export interface MessageInfo {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  thinking: string;
  tool_uses: {
    toolId: string;
    toolName: string;
    input: Record<string, unknown>;
    output?: string;
    isError?: boolean;
    isComplete?: boolean;
  }[];
  usage: Record<string, number> | null;
  cost_usd: number | null;
  created_at: string;
}

export interface MessageListResponse {
  messages: MessageInfo[];
  total: number;
}
