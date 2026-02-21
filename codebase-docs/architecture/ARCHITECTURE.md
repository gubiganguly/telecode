# Project Architecture

> Auto-generated architecture overview. Last updated: 2026-02-21
>
> Entry point for developers and AI coding agents to understand the full system.

## System Overview

**Telecode** is a remote control web app for [Claude Code](https://code.claude.com). It wraps the Claude Code CLI (`claude -p`) in a FastAPI backend, exposing it over WebSocket so a Next.js frontend can provide a full coding assistant experience from anywhere. Claude Code reads/writes files locally on the host machine while the user interacts through a web UI.

**Core idea:** User's browser → WebSocket → FastAPI backend → spawns `claude -p` subprocess → Claude edits files on the server → streams results back to the browser.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16.1 + React 19.2 + TypeScript 5 |
| State Management | Zustand 5 (with Immer middleware) |
| Animations | Framer Motion 12 |
| Styling | Tailwind CSS 4 |
| Markdown | react-markdown 10 + rehype-highlight + remark-gfm |
| Icons | Lucide React |
| Backend | Python 3.11 + FastAPI 0.115 |
| Database | SQLite (via aiosqlite, WAL mode) |
| Encryption | cryptography (Fernet) for API key storage |
| AI Title Gen | anthropic SDK (Claude Haiku) for auto-titling sessions |
| CLI Integration | Claude Code CLI (`claude -p --output-format stream-json`) |
| Real-time | WebSocket (native FastAPI/Starlette) |
| Config | pydantic-settings (env vars with `TELECODE_` prefix) |

## Project Structure

```
telecode/
├── .claude/
│   ├── CLAUDE.md                              # Project conventions
│   └── commands/
│       ├── architecture.md                    # /architecture command
│       └── api-docs.md                        # /api-docs command
│
├── backend/
│   ├── requirements.txt                       # Python dependencies
│   ├── data/
│   │   ├── telecode.db                        # SQLite database (runtime)
│   │   └── .master.key                        # Fernet encryption key (runtime, 600 perms)
│   ├── venv/                                  # Python virtual environment
│   └── src/
│       ├── main.py                            # FastAPI app, lifespan, middleware, router registration
│       ├── api/
│       │   ├── health/router.py               # GET /api/health
│       │   ├── projects/router.py             # CRUD /api/projects
│       │   ├── sessions/router.py             # CRUD /api/sessions
│       │   ├── chat/router.py                 # WS /ws/chat (WebSocket)
│       │   ├── api_keys/router.py             # CRUD /api/keys
│       │   ├── commands/router.py             # CRUD /api/commands + AI generation
│       │   ├── mcps/router.py                 # GET /api/mcps, POST /api/mcps/install
│       │   ├── files/router.py                # GET /api/projects/{id}/files (file tree)
│       │   ├── claude_md/router.py            # GET/PUT /api/claude-md
│       │   ├── mentions/router.py             # POST /api/mentions/fetch-url
│       │   └── github/router.py               # OAuth + repo operations /api/github
│       ├── schemas/
│       │   ├── common.py                      # APIResponse[T] generic wrapper
│       │   ├── projects.py                    # ProjectCreate, ProjectInfo, ProjectListResponse
│       │   ├── sessions.py                    # SessionCreate, SessionInfo, SessionListResponse
│       │   ├── chat.py                        # WebSocket message types (inbound + outbound enums)
│       │   ├── api_keys.py                    # ApiKeyCreate, ApiKeyInfo, ApiKeyListResponse
│       │   ├── commands.py                    # CommandInfo, CommandCreate, CommandGenerateRequest
│       │   ├── mcps.py                        # McpServerConfig, McpInstallRequest/Response
│       │   ├── files.py                       # FileNode, FileTreeResponse
│       │   ├── claude_md.py                   # ClaudeMdResponse, ClaudeMdUpdate
│       │   ├── mentions.py                    # UrlFetchRequest/Response
│       │   └── github.py                      # GitHubAccountInfo, CreateRepoRequest, PushRequest
│       ├── services/
│       │   ├── claude/
│       │   │   ├── process_manager.py         # Spawns/tracks/kills claude CLI subprocesses
│       │   │   ├── stream_parser.py           # Parses NDJSON stream from CLI into typed events
│       │   │   └── command_translator.py      # Maps /slash commands to natural language prompts
│       │   ├── chat/title_generator.py        # Auto-generates session titles via Anthropic API
│       │   ├── commands/command_service.py     # Custom command CRUD (filesystem) + AI generation
│       │   ├── mcps/mcp_service.py            # MCP listing + natural language install
│       │   ├── projects/project_service.py    # Project CRUD, template copying, filesystem sync, git ops
│       │   ├── sessions/session_service.py    # Session CRUD, metadata updates
│       │   ├── api_keys/api_key_service.py    # Encrypted API key storage, CRUD, env injection
│       │   ├── github/github_service.py       # GitHub OAuth, repo CRUD, token management
│       │   └── claude_md/claude_md_service.py # CLAUDE.md read/write/sync across projects
│       ├── core/
│       │   ├── config.py                      # Settings class (pydantic-settings)
│       │   ├── database.py                    # SQLite connection, schema creation (3 tables)
│       │   ├── encryption.py                  # Fernet encryption for API key values
│       │   ├── exceptions.py                  # Custom exceptions + FastAPI handlers
│       │   └── security.py                    # Auth stubs (disabled for now)
│       └── utils/
│           └── helpers.py                     # slugify()
│
├── frontend/
│   ├── package.json                           # Next.js 16 + React 19 + deps
│   ├── tsconfig.json                          # TypeScript config with path aliases
│   ├── next.config.ts                         # Next.js config
│   ├── app/
│   │   ├── layout.tsx                         # Root layout (Inter + JetBrains Mono fonts)
│   │   ├── page.tsx                           # Home → redirects to /projects
│   │   ├── globals.css                        # Tailwind directives + global styles
│   │   ├── projects/page.tsx                  # Projects listing with grid cards
│   │   ├── settings/page.tsx                  # API key management page
│   │   └── chat/[projectId]/page.tsx          # Chat interface (dynamic route)
│   ├── components/
│   │   ├── ui/                                # Primitives: button, input, dialog, badge, skeleton
│   │   ├── layout/
│   │   │   ├── app-providers.tsx              # Zustand + WebSocket provider wrapper
│   │   │   └── connection-status.tsx          # Backend connection indicator
│   │   ├── chat/                              # Chat UI (14 components)
│   │   │   ├── chat-area.tsx                  # Main chat display container
│   │   │   ├── chat-header.tsx                # Session/project info header
│   │   │   ├── chat-input.tsx                 # Message textarea with slash commands
│   │   │   ├── chat-message.tsx               # Individual message renderer
│   │   │   ├── message-list.tsx               # Scrollable message container
│   │   │   ├── markdown-renderer.tsx          # Markdown + code syntax highlighting
│   │   │   ├── thinking-block.tsx             # Collapsible thinking visualization
│   │   │   ├── tool-use-card.tsx              # Tool invocation display
│   │   │   ├── todo-card.tsx                  # TodoWrite tool progress checklist
│   │   │   ├── ask-user-question-card.tsx     # Interactive AskUserQuestion card
│   │   │   ├── typing-indicator.tsx           # Animated typing indicator
│   │   │   ├── model-selector.tsx             # Model dropdown (Opus/Sonnet/Haiku)
│   │   │   ├── slash-command-palette.tsx       # Command palette for /commands
│   │   │   └── welcome-screen.tsx             # Empty state for new sessions
│   │   ├── files/                             # File tree UI (2 components)
│   │   │   ├── file-tree-panel.tsx            # Right-side collapsible file tree panel
│   │   │   └── file-tree-node.tsx             # Recursive tree node (file/directory)
│   │   ├── projects/                          # Project UI (3 components)
│   │   │   ├── project-card.tsx               # Project card in grid
│   │   │   ├── create-project-dialog.tsx      # New project modal
│   │   │   └── empty-state.tsx                # No projects landing
│   │   ├── sessions/                          # Session UI (2 components)
│   │   │   ├── session-item.tsx               # Session list entry
│   │   │   └── session-sidebar.tsx            # Left sidebar with session list
│   │   └── settings/                          # Settings UI (10 components)
│   │       ├── settings-sidebar.tsx           # Desktop sidebar with section nav
│   │       ├── settings-tab-bar.tsx           # Mobile tab bar for section switching
│   │       ├── settings-commands-section.tsx   # Commands management section
│   │       ├── settings-api-keys-section.tsx   # API keys management section
│   │       ├── settings-mcps-section.tsx       # MCPs management section
│   │       ├── command-list.tsx               # Custom command table with actions
│   │       ├── command-create-dialog.tsx       # Create/edit command modal (+ AI gen)
│   │       ├── mcp-list.tsx                   # Installed MCP server list
│   │       ├── mcp-install-dialog.tsx         # Natural language MCP install dialog
│   │       ├── api-key-dialog.tsx             # Create/edit API key modal
│   │       └── api-key-list.tsx               # API key table with actions
│   ├── hooks/
│   │   ├── use-api-keys.ts                    # API key CRUD operations
│   │   ├── use-chat.ts                        # Chat message handling
│   │   ├── use-projects.ts                    # Project management
│   │   ├── use-sessions.ts                    # Session management
│   │   ├── use-websocket.ts                   # WebSocket connection lifecycle
│   │   ├── use-mobile.ts                      # Mobile viewport detection
│   │   ├── use-typewriter.ts                  # Typing animation effect
│   │   ├── use-thinking-phrase.ts             # Rotating thinking phrases
│   │   ├── use-commands.ts                    # Custom command CRUD operations
│   │   ├── use-mcps.ts                        # MCP listing
│   │   ├── use-slash-commands.ts              # Dynamic slash command list from API
│   │   ├── use-file-tree.ts                   # File tree data with 5s polling
│   │   ├── use-github.ts                      # GitHub OAuth status, connect/disconnect
│   │   ├── use-claude-md.ts                   # CLAUDE.md content management
│   │   ├── use-mention-resolver.ts            # Resolve @mentions to file/folder/URL content
│   │   └── use-mention-search.ts              # Search files for @mention suggestions
│   ├── lib/
│   │   ├── store.ts                           # Zustand global state (projects, sessions, chat)
│   │   ├── api.ts                             # HTTP API client (fetch-based)
│   │   ├── websocket.ts                       # WebSocket manager (singleton, auto-reconnect)
│   │   ├── constants.ts                       # URLs, models, slash commands, breakpoints
│   │   └── utils.ts                           # cn() helper (clsx + tailwind-merge)
│   ├── types/
│   │   ├── api.ts                             # API schema types (mirrors backend schemas)
│   │   ├── chat.ts                            # Chat types (messages, events, tool use)
│   │   └── mentions.ts                        # Mention types (file, folder, url)
│   └── public/                                # Static assets
│
└── codebase-docs/
    ├── architecture/
    │   ├── ARCHITECTURE.md                    # This file
    │   └── .architecture-meta.json
    └── api/
        └── .gitkeep
```

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      User's Browser (:3000)                      │
│                     Next.js 16 + React 19                        │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │  /projects   │  │  /chat/:id   │  │  /settings   │           │
│  │  (REST)      │  │  (WebSocket) │  │  (REST)      │           │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘           │
│         │                 │                  │                   │
│  ┌──────┴─────────────────┴──────────────────┴───────┐           │
│  │              Zustand Store (Immer)                 │           │
│  │  projects[] | sessions[] | messages{} | isStreaming│           │
│  └──────┬─────────────────┬──────────────────┬───────┘           │
│         │                 │                  │                   │
│  ┌──────┴───────┐  ┌──────┴───────┐  ┌──────┴───────┐           │
│  │  ApiClient   │  │  WsManager   │  │  ApiClient   │           │
│  │  (fetch)     │  │  (singleton) │  │  (fetch)     │           │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘           │
└─────────┼─────────────────┼──────────────────┼───────────────────┘
          │ HTTP            │ WS               │ HTTP
          ▼                 ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FastAPI Backend (:8000)                        │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │ /api/projects│  │ /ws/chat     │  │ /api/keys    │           │
│  │ /api/sessions│  │ (WebSocket)  │  │ /api/commands│           │
│  │ /api/files   │  │              │  │ /api/mcps    │           │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘           │
│         │                 │                  │                   │
│         ▼                 ▼                  ▼                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │ProjectService│  │ProcessManager│  │ApiKeyService │           │
│  │SessionService│  │              │  │CommandService│           │
│  │              │  │ • spawn CLI  │  │McpService    │           │
│  │ • CRUD       │  │ • parse NDJSON│ │              │           │
│  │ • copy .claude│ │ • inject keys│  │ • encrypt    │           │
│  │ • git init   │  │ • cancel     │  │ • CRUD cmds  │           │
│  │ • fs sync    │  │ • track procs│  │ • install MCP│           │
│  │ • file tree  │  │ • title gen  │  │ • AI gen     │           │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘           │
│         │                 │                  │                   │
│         └────────┬────────┘──────────────────┘                   │
│                  ▼                                                │
│         ┌──────────────┐  ┌──────────────┐                       │
│         │   SQLite DB   │  │  Encryption  │                      │
│         │  (WAL mode)   │  │  (Fernet)    │                      │
│         │  • projects   │  │              │                      │
│         │  • sessions   │  │  .master.key │                      │
│         │  • api_keys   │  │              │                      │
│         └──────────────┘  └──────────────┘                       │
│                                                                  │
│         ┌──────────────────────────────┐                         │
│         │  claude -p "<prompt>"        │                          │
│         │    --output-format stream-json│                         │
│         │    --session-id <uuid>       │                          │
│         │    --model <model-id>        │                          │
│         │    --allowedTools Read Write…│                          │
│         │    cwd=/Claude Code Projects/│                          │
│         │        <project-slug>/       │                          │
│         │  env: API keys injected      │                          │
│         └──────────────┬───────────────┘                         │
└────────────────────────┼─────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────┐
│   Local Filesystem                  │
│   ~/Claude Code Projects/           │
│   ├── project-a/                    │
│   │   ├── .claude/                  │
│   │   │   ├── CLAUDE.md             │
│   │   │   └── settings.json         │
│   │   └── (project files)           │
│   ├── project-b/                    │
│   └── .templates/                   │
│       └── .claude/                  │
│           ├── CLAUDE.md             │
│           ├── settings.json         │
│           └── commands/             │
│               └── (custom .md files)│
└─────────────────────────────────────┘
```

## Frontend Architecture

### Routing & Pages

| Route | File | Description |
|-------|------|-------------|
| `/` | `app/page.tsx` | Redirects to `/projects` |
| `/projects` | `app/projects/page.tsx` | Project listing grid with create dialog |
| `/chat/[projectId]` | `app/chat/[projectId]/page.tsx` | Chat interface with session sidebar |
| `/settings` | `app/settings/page.tsx` | Settings hub: CLAUDE.md, Commands, API Keys, MCPs, GitHub (5-section layout) |

### Components

39 components organized by domain:

- **UI primitives** (`components/ui/`): `button`, `input`, `dialog`, `badge`, `skeleton` — reusable base components
- **Layout** (`components/layout/`): `app-providers` (Zustand + WS bootstrap), `connection-status` (live connection indicator)
- **Chat** (`components/chat/`): 14 components covering the full chat experience — message rendering with markdown/syntax highlighting, thinking blocks, tool use cards, todo progress checklist, interactive question cards, model selector, slash command palette, typing indicator, welcome screen
- **Files** (`components/files/`): `file-tree-panel` (right-side collapsible panel), `file-tree-node` (recursive tree renderer)
- **Projects** (`components/projects/`): `project-card`, `create-project-dialog`, `empty-state`
- **Sessions** (`components/sessions/`): `session-sidebar` (list + create/delete/rename), `session-item`
- **Settings** (`components/settings/`): 12 components — sidebar nav, mobile tab bar, 5 section containers (CLAUDE.md, commands, API keys, MCPs, GitHub), command CRUD + AI generation, MCP install, API key management, GitHub OAuth connection

### State Management

Zustand store (`lib/store.ts`) with Immer middleware. Single global store managing:

```typescript
interface AppState {
  // Data
  projects: ProjectInfo[];          // Project list
  currentProject: ProjectInfo | null; // Active project detail
  sessions: SessionInfo[];          // Sessions for current project
  activeSessionId: string | null;   // Currently selected session
  isDraftMode: boolean;             // New-session draft mode
  selectedModel: string;            // Claude model selection
  messages: Record<string, ChatMessage[]>;  // Messages keyed by session ID
  isStreaming: Record<string, boolean>;     // Streaming state per session

  // Actions
  fetchProjects, fetchProject, createProject, deleteProject
  fetchSessions, createSession, deleteSession, renameSession, enterDraftMode
  sendMessage, cancelRequest, handleWsEvent
}
```

The store handles all WebSocket event routing — `handleWsEvent()` maps server events to state mutations (appending text deltas, tracking tool use, marking completion). Also handles `session_renamed` events for auto-generated titles.

### API Client & Data Fetching

`lib/api.ts` — fetch-based `ApiClient` class. All REST calls unwrap `APIResponse<T>` and throw on error:

```typescript
const api = new ApiClient(API_BASE_URL);  // http://localhost:8000
api.listProjects();    // GET /api/projects
api.createSession();   // POST /api/sessions
api.listApiKeys();     // GET /api/keys
api.listCommands();    // GET /api/commands
api.listMcps();        // GET /api/mcps
api.getFileTree(id);   // GET /api/projects/{id}/files
```

### WebSocket Client

`lib/websocket.ts` — singleton `WebSocketManager` connecting to `ws://localhost:8000/ws/chat`:

- Auto-reconnect with exponential backoff (1s base, 30s max, jitter)
- Ping/pong keep-alive every 25s
- Connection status observable (`connecting | connected | disconnected | reconnecting`)
- Events forwarded to Zustand store via `onEvent()` handler
- `send()` returns `false` when disconnected (store shows inline error)

### Styling

Tailwind CSS 4 with PostCSS plugin. Fonts: Inter (body) + JetBrains Mono (code). `cn()` utility via `clsx` + `tailwind-merge`. Framer Motion used throughout for page transitions, skeleton loaders, hover states, and micro-interactions.

## Backend Architecture

### API Layer

All routers in `backend/src/api/`. Services accessed via `request.app.state` (set during lifespan startup).

| Method | Path | Router | Description |
|--------|------|--------|-------------|
| `GET` | `/api/health` | `health/router.py` | CLI availability, projects dir status |
| `GET` | `/api/projects` | `projects/router.py` | List projects (paginated) |
| `POST` | `/api/projects` | `projects/router.py` | Create project (copies template, git init) |
| `GET` | `/api/projects/{id}` | `projects/router.py` | Get project details + fs metadata |
| `PATCH` | `/api/projects/{id}` | `projects/router.py` | Update name/description |
| `POST` | `/api/projects/{id}/git-init` | `projects/router.py` | Initialize git in project folder |
| `DELETE` | `/api/projects/{id}` | `projects/router.py` | Delete project (optional file + repo deletion) |
| `GET` | `/api/sessions?project_id=` | `sessions/router.py` | List sessions for a project |
| `POST` | `/api/sessions` | `sessions/router.py` | Create a new chat session |
| `GET` | `/api/sessions/{id}` | `sessions/router.py` | Get session details |
| `PATCH` | `/api/sessions/{id}` | `sessions/router.py` | Rename session |
| `DELETE` | `/api/sessions/{id}` | `sessions/router.py` | Soft-delete session |
| `WS` | `/ws/chat` | `chat/router.py` | Bidirectional chat streaming |
| `GET` | `/api/keys` | `api_keys/router.py` | List all API keys (masked values) |
| `POST` | `/api/keys` | `api_keys/router.py` | Store new API key (encrypted) |
| `GET` | `/api/keys/{id}` | `api_keys/router.py` | Get single key (masked) |
| `PATCH` | `/api/keys/{id}` | `api_keys/router.py` | Update key name/value/service |
| `DELETE` | `/api/keys/{id}` | `api_keys/router.py` | Delete API key |
| `GET` | `/api/commands` | `commands/router.py` | List all commands (built-in + custom) |
| `GET` | `/api/commands/{name}` | `commands/router.py` | Get single command |
| `POST` | `/api/commands` | `commands/router.py` | Create custom command (.md file) |
| `PUT` | `/api/commands/{name}` | `commands/router.py` | Update custom command |
| `DELETE` | `/api/commands/{name}` | `commands/router.py` | Delete custom command |
| `POST` | `/api/commands/generate` | `commands/router.py` | AI-generate command content via Claude CLI |
| `GET` | `/api/mcps` | `mcps/router.py` | List installed MCP servers |
| `POST` | `/api/mcps/install` | `mcps/router.py` | Install MCP via natural language |
| `GET` | `/api/projects/{id}/files` | `files/router.py` | Recursive file tree for a project |
| `GET` | `/api/projects/{id}/files/search` | `files/router.py` | Fuzzy file search (`?q=...`) |
| `GET` | `/api/projects/{id}/files/content` | `files/router.py` | Read file content (`?path=...`, max 50KB) |
| `GET` | `/api/projects/{id}/files/listing` | `files/router.py` | List folder contents (`?path=...`) |
| `GET` | `/api/claude-md` | `claude_md/router.py` | Get CLAUDE.md content |
| `PUT` | `/api/claude-md` | `claude_md/router.py` | Update CLAUDE.md (syncs to all projects) |
| `POST` | `/api/mentions/fetch-url` | `mentions/router.py` | Fetch URL content (SSRF-protected, max 50KB) |
| `GET` | `/api/github/auth/login` | `github/router.py` | Redirect to GitHub OAuth |
| `GET` | `/api/github/auth/callback` | `github/router.py` | OAuth callback, stores encrypted token |
| `GET` | `/api/github/status` | `github/router.py` | Check if GitHub account is connected |
| `DELETE` | `/api/github/disconnect` | `github/router.py` | Remove GitHub account |
| `POST` | `/api/github/repos` | `github/router.py` | Create GitHub repo |
| `GET` | `/api/github/repos` | `github/router.py` | List user's repos |
| `POST` | `/api/github/projects/{id}/link` | `github/router.py` | Link GitHub repo to project (set remote) |
| `POST` | `/api/github/projects/{id}/push` | `github/router.py` | Push project to linked GitHub repo |

All REST endpoints return `APIResponse[T]` (`backend/src/schemas/common.py`):
```python
{"success": true, "data": {...}, "error": null}
```

### Service Layer

| Service | File | Responsibility |
|---------|------|----------------|
| `ProjectService` | `services/projects/project_service.py` | CRUD, template `.claude/` copying, git init/push, GitHub remote, filesystem-DB sync |
| `SessionService` | `services/sessions/session_service.py` | CRUD, metadata updates after messages, soft deletes |
| `ProcessManager` | `services/claude/process_manager.py` | Spawn/track/kill `claude` subprocesses, stream parsing, API key env injection |
| `ApiKeyService` | `services/api_keys/api_key_service.py` | Encrypted key storage, CRUD, `get_decrypted_env_map()` for process injection |
| `CommandService` | `services/commands/command_service.py` | Custom command CRUD (filesystem-backed `.md` files), merges with built-in commands, AI generation via Claude CLI |
| `McpService` | `services/mcps/mcp_service.py` | Scans MCP plugin dir for `.mcp.json` configs, natural language install via `claude mcp add` |
| `generate_title()` | `services/chat/title_generator.py` | Auto-generates 2-4 word session titles via Anthropic API (Claude Haiku) |

| `GitHubService` | `services/github/github_service.py` | OAuth flow, repo CRUD/delete, encrypted token storage (single-user model) |
| `ClaudeMdService` | `services/claude_md/claude_md_service.py` | Read/write CLAUDE.md from templates dir, sync to all projects |

Services are instantiated once in `main.py` lifespan and stored on `app.state`. The 8 services registered: `ProjectService`, `SessionService`, `ProcessManager`, `ApiKeyService`, `CommandService`, `McpService`, `GitHubService`, `ClaudeMdService`.

### Data Layer

**SQLite** at `backend/data/telecode.db` (created at runtime). Four tables:

```sql
projects         (id TEXT PK, name, slug, path, description, github_repo_url, created_at, updated_at)
sessions         (id TEXT PK, project_id FK, name, last_message, message_count, is_active, created_at, updated_at)
api_keys         (id TEXT PK, name, service, env_var, encrypted_value, created_at, updated_at)
github_accounts  (id TEXT PK, github_username, github_user_id UNIQUE, avatar_url, encrypted_token, scopes, created_at, updated_at)
```

- WAL mode for concurrent reads
- Foreign keys enabled
- Indexes on `sessions.project_id` and `sessions.updated_at`
- `aiosqlite` for async access (non-blocking in the event loop)
- Session IDs are UUIDs reused as `claude --session-id` values

### Encryption (`core/encryption.py`)

API key values are encrypted at rest using Fernet symmetric encryption:

1. Master key loaded from `TELECODE_ENCRYPTION_KEY` env var, or from `backend/data/.master.key` file (auto-generated on first run, chmod 600)
2. `encrypt(plaintext) → ciphertext` / `decrypt(ciphertext) → plaintext`
3. Keys are decrypted only when injecting into Claude CLI subprocess environment via `ApiKeyService.get_decrypted_env_map()`
4. GitHub access tokens are also encrypted using the same Fernet system and stored in `github_accounts.encrypted_token`

### Authentication & Authorization

Currently **disabled** (`auth_enabled = False` in config). Stubs exist in `core/security.py`. JWT auth will be added before deploying to a remote server.

### Configuration

All settings in `core/config.py` via `pydantic-settings`. Environment variables use the `TELECODE_` prefix:

| Setting | Default | Env Var |
|---------|---------|---------|
| `projects_dir` | `~/Claude Code Projects` | `TELECODE_PROJECTS_DIR` |
| `claude_binary` | `claude` | `TELECODE_CLAUDE_BINARY` |
| `default_model` | `sonnet` | `TELECODE_DEFAULT_MODEL` |
| `max_budget_usd` | `5.0` | `TELECODE_MAX_BUDGET_USD` |
| `fallback_model` | `haiku` | `TELECODE_FALLBACK_MODEL` |
| `process_timeout_seconds` | `600` | `TELECODE_PROCESS_TIMEOUT_SECONDS` |
| `mcp_plugins_dir` | `~/.claude/plugins/marketplaces/claude-plugins-official/external_plugins` | `TELECODE_MCP_PLUGINS_DIR` |
| `cors_origins` | `["http://localhost:3000", "http://localhost:3001"]` | `TELECODE_CORS_ORIGINS` |

## Claude CLI Integration

Three modules in `services/claude/`:

### ProcessManager (`process_manager.py`)

- Maintains `dict[session_id, RunningProcess]` — one active process per session
- `run_prompt()` is an **async generator** that:
  1. Translates slash commands via `command_translator.translate()`
  2. Builds CLI args: `-p`, `--output-format stream-json`, `--verbose`, `--session-id`, `--model`, `--allowedTools`, `--max-budget-usd`
  3. Injects decrypted API keys as environment variables (via `ApiKeyService.get_decrypted_env_map()`)
  4. Spawns via `asyncio.create_subprocess_exec(cwd=project_path)`
  5. Reads stdout line-by-line → parses with `stream_parser.parse_line()` → yields `ParsedEvent`
  6. Updates session metadata on completion
- `cancel()` sets a flag + terminates the subprocess (graceful → force kill after 5s)
- `cleanup_all()` kills all processes on shutdown
- Unsets `CLAUDECODE` env var to prevent nested-session detection

### StreamParser (`stream_parser.py`)

Parses NDJSON lines from `claude --output-format stream-json` into `ParsedEvent(type, session_id, data)`.

Handles these CLI output types:
- `assistant` messages → extracts `text`, `thinking`, `tool_use`, `tool_result` content blocks
- `result` messages → maps to `message_complete` with usage/cost data
- `error` messages → maps to `error` events

### CommandTranslator (`command_translator.py`)

Maps frontend slash commands to natural language prompts since `/commands` don't work in `-p` mode:

| Command | Translated Prompt |
|---------|-------------------|
| `/commit` | "Look at staged changes and create an appropriate commit..." |
| `/review` | "Review current uncommitted changes..." |
| `/test` | "Run the test suite..." |
| `/fix` | "Fix lint errors, type errors, and test failures..." |
| `/build` | "Run the build command and fix errors..." |
| `/lint` | "Run the linter and fix all issues..." |

Frontend also defines additional commands: `/refactor`, `/docs`, `/git-status` (in `frontend/lib/constants.ts`).

Supports trailing args: `/commit fix the typo` → base prompt + "Additional context: fix the typo"

## WebSocket Protocol

**Connection:** `ws://host:8000/ws/chat`

Single WebSocket per client, all sessions multiplexed by `session_id`.

### Client → Server (`InboundMessage`)

```typescript
// Send a message
{type: "send_message", message: "...", session_id: "<uuid>", project_id: "<uuid>", model?: "claude-opus-4-6"}

// Cancel running process
{type: "cancel", session_id: "<uuid>"}

// Keep-alive
{type: "ping"}
```

### Server → Client (`OutboundEvent`)

```typescript
{type: "session_created", session_id: "...", project_id: "..."}
{type: "session_renamed", session_id: "...", name: "Auto-generated title"}
{type: "message_start", session_id: "..."}
{type: "thinking_delta", session_id: "...", thinking: "Let me check..."}
{type: "text_delta", session_id: "...", text: "Here's "}
{type: "tool_use_start", session_id: "...", tool_name: "Edit", tool_id: "...", input: {...}}
{type: "tool_result", session_id: "...", tool_id: "...", output: "...", is_error: false}
{type: "message_complete", session_id: "...", result_text: "...", usage: {...}, cost_usd: 0.05}
{type: "error", session_id?: "...", error: "...", code?: "..."}
{type: "cancelled", session_id: "..."}
{type: "pong"}
```

## API Key Management

Allows users to store third-party API keys (e.g., `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`) that get injected into Claude CLI subprocess environments:

1. User creates key via Settings page → `POST /api/keys` with name, service, env_var, value
2. Backend encrypts value with Fernet → stores `encrypted_value` in SQLite
3. When ProcessManager spawns `claude -p`, calls `ApiKeyService.get_decrypted_env_map()` → returns `{env_var: plaintext_value}`
4. Keys injected as environment variables into the subprocess
5. In frontend, values are always displayed masked (last 4 chars only)

## Project Template System

New projects are created with a standard template:

1. `ProjectService.create_project("My App")` is called
2. Slugifies name → `my-app`
3. Creates `~/Claude Code Projects/my-app/`
4. `shutil.copytree` copies `~/Claude Code Projects/.templates/.claude/` → `my-app/.claude/`
5. Runs `git init` in the new folder
6. Inserts project record into SQLite

The template contains:
- `.claude/CLAUDE.md` — project conventions (monorepo structure, frontend/backend patterns)
- `.claude/settings.json` — pre-approved permissions (Read, Write, Edit, Glob, Grep, Bash(*), etc.)

## Key Flows

### New Chat Message

1. User types message in `chat-input.tsx`, triggers `store.sendMessage()`
2. Zustand store calls `wsManager.send({type: "send_message", ...})`
3. If WS not connected → inline error message added to local state, no request sent
4. If sent → user message added to `messages[sessionId]`, `isStreaming[sessionId] = true`
5. Backend `chat/router.py` validates payload, checks session exists (creates if new)
6. Resolves project path from `project_id`
7. Spawns `asyncio.Task` → calls `ProcessManager.run_prompt()`
8. ProcessManager injects API keys as env vars, spawns `claude -p "..." --session-id <uuid> cwd=<project_path>`
9. CLI stdout streams NDJSON lines
10. Each line parsed by `StreamParser` → `ParsedEvent`
11. Events forwarded to WebSocket as JSON
12. Frontend `store.handleWsEvent()` routes each event type → appends text deltas, tracks tool use, marks completion
13. On completion, session metadata updated in DB

### Project Creation

1. User clicks "New Project" → `create-project-dialog.tsx` opens
2. `POST /api/projects` with `{"name": "My App"}`
3. Slugify → create folder → copy `.claude/` template → `git init`
4. Insert DB record → return project info
5. Frontend prepends project to store, navigates to project

### Filesystem Sync

On `GET /api/projects`, `ProjectService._sync_filesystem_to_db()` scans `~/Claude Code Projects/` for folders not yet in the DB and auto-registers them. Projects created outside the app (e.g., manually in Finder) are automatically discovered.

## Custom Slash Commands

Users can create, edit, and delete custom slash commands via the Settings page. Commands are stored as `.md` files in the template directory (`~/Claude Code Projects/.templates/.claude/commands/`).

### Architecture

- **Backend:** `CommandService` reads/writes `.md` files from the template commands directory. Merges custom commands with built-in commands (from `command_translator.py`) into a unified list.
- **Frontend:** Settings page section with `command-list.tsx` table + `command-create-dialog.tsx` modal. `use-commands.ts` hook for CRUD operations.
- **Slash command palette:** `use-slash-commands.ts` fetches the merged command list from the API at mount, replacing the hardcoded fallback in `constants.ts`.

### AI Generation

`POST /api/commands/generate` spawns `claude -p` with a meta-prompt to generate command markdown from a natural language description. Budget-capped at $1.00 per generation, 90s timeout.

### Command Names

- Pattern: `^[a-z][a-z0-9-]*$` (lowercase, hyphens allowed)
- Built-in commands cannot be overridden or deleted
- Custom commands stored at: `<templates_dir>/.claude/commands/<name>.md`

## MCP Server Management

Users can view installed MCP servers and install new ones via natural language through the Settings page.

### Listing

`McpService._scan()` reads `.mcp.json` files from the MCP plugins directory (configurable via `TELECODE_MCP_PLUGINS_DIR`). Supports both `mcpServers`-wrapped and flat configs. Extracts name, command/args (stdio) or url (SSE).

### Natural Language Install

`POST /api/mcps/install` is a two-step process:

1. **Interpret:** Spawns `claude -p` with a meta-prompt containing known MCP packages. Claude returns structured JSON (`{name, command, args}` or `{name, url}`).
2. **Execute:** Runs `claude mcp add -s user <name> -- <command> <args...>` (or `--transport sse` for URL-based MCPs).

Budget: $0.50 per interpretation, 60s timeout per step.

## File Tree

The chat interface includes a collapsible right-side panel showing the project's file tree.

- **Backend:** `GET /api/projects/{id}/files` recursively scans the project directory, returning a nested `FileNode[]` structure. Respects `.gitignore` and built-in ignore patterns (`.git`, `node_modules`, `__pycache__`, `.next`, `venv`, etc.). Max depth configurable (default 10).
- **Frontend:** `file-tree-panel.tsx` with animated open/close. `use-file-tree.ts` hook polls every 5 seconds to stay in sync with filesystem changes from Claude Code.

## Session Title Auto-Generation

When a new chat message is sent, the backend can auto-generate a 2-4 word session title using the Anthropic API directly (not via CLI):

- Uses `claude-haiku-4-5-20251001` for speed and low cost
- Looks for `ANTHROPIC_API_KEY` in stored keys (via `ApiKeyService`) or environment
- Sends a `session_renamed` WebSocket event to the frontend on success
- Fails silently if no API key is available

## Infrastructure & Deployment

### Local Development (current)
```bash
# Backend
cd backend && source venv/bin/activate && uvicorn src.main:app --reload --port 8000

# Frontend
cd frontend && npm run dev   # runs on :3000
```

### Future Server Deployment
- Deploy backend to Mac Mini / server
- Add JWT auth (stubs already in `core/security.py`)
- Configure `TELECODE_CORS_ORIGINS` for the frontend domain
- Set `TELECODE_SECRET_KEY` for token signing
- Set `TELECODE_ENCRYPTION_KEY` for API key encryption (instead of auto-generated file)
- Ensure Claude Code CLI is installed and logged in with Max subscription

## GitHub Integration

Full GitHub OAuth flow for connecting a user's GitHub account, creating repos, and pushing code.

### Architecture

- **Backend:** `GitHubService` handles OAuth (authorize → callback → token exchange), encrypts the access token with Fernet, stores in `github_accounts` table. Single-user model — only one account at a time (DELETE old before INSERT new). OAuth scope: `repo delete_repo`.
- **Frontend:** Settings → GitHub section shows connection status with avatar/username. `use-github.ts` hook manages state. Chat header shows contextual buttons:
  - **"Init Git"** — when project has no git repo (`has_git: false`)
  - **"Push to GitHub"** — when project has git but no linked repo (creates repo, links it, pushes in one flow)
  - **"Push"** — when project already has a linked GitHub repo

### Project Card Integration

- Project cards show a GitHub badge when `github_repo_url` is set
- Dropdown menu includes "Push to GitHub" for linked projects
- Delete confirmation shows "Also delete the GitHub repository" checkbox when applicable

### Push Mechanism

Push uses token-injected URLs for security — the token is injected into the remote URL only for the push command (`https://x-access-token:<token>@github.com/...`) and is never persisted in `.git/config`.

### Key Files

| File | Purpose |
|------|---------|
| `backend/src/services/github/github_service.py` | OAuth, token management, repo CRUD |
| `backend/src/api/github/router.py` | REST endpoints |
| `backend/src/schemas/github.py` | Pydantic models |
| `frontend/hooks/use-github.ts` | Connection state hook |
| `frontend/components/settings/settings-github-section.tsx` | Settings UI |
| `frontend/components/chat/chat-header.tsx` | Push/Init Git buttons |

## @Mentions System

The chat editor (Tiptap-based) supports `@file`, `@folder`, and `@url` mentions for attaching context to messages.

### Flow

1. User types `@` in the editor → `MentionSuggestionList` appears
2. `use-mention-search.ts` calls `api.searchFiles(projectId, query)` for fuzzy file matching
3. User selects a file/folder/URL mention → stored as a Tiptap node
4. On send: `use-mention-resolver.ts` resolves all mentions in parallel:
   - Files: `api.readFileContent(projectId, path)` (max 50KB, no binaries)
   - Folders: `api.readFolderListing(projectId, path)` (tree-formatted)
   - URLs: `api.fetchUrlContent(url)` (SSRF-protected, max 50KB)
5. Resolved content wrapped in `<attached_context>` XML tags
6. Prepended to the message text, sent to Claude via WebSocket
7. Chat UI shows only the raw mention labels (not the full context)

### Key Files

| File | Purpose |
|------|---------|
| `frontend/hooks/use-mention-resolver.ts` | Parallel resolution of @mentions |
| `frontend/hooks/use-mention-search.ts` | File search for suggestions |
| `frontend/components/chat/mention-suggestion-list.tsx` | Autocomplete UI |
| `frontend/types/mentions.ts` | MentionItem, MentionSuggestion, ResolvedMention |
| `backend/src/api/files/router.py` | File search, content read, folder listing |
| `backend/src/api/mentions/router.py` | URL fetch with SSRF protection |

## CLAUDE.md Management

Settings → CLAUDE.md section provides a rich editor for the project conventions file.

- **Backend:** `ClaudeMdService` reads/writes `~/Claude Code Projects/.templates/.claude/CLAUDE.md`, then syncs the content to every project's `.claude/CLAUDE.md` directory.
- **Frontend:** `use-claude-md.ts` hook + `settings-claude-md-section.tsx` component with live editing and save.
- `lastSyncCount` tracks how many projects were synced on save.

## Feature Modules

| Feature | Doc |
|---------|-----|
| GitHub Integration | See [above](#github-integration) |
| @Mentions | See [above](#mentions-system) |
| CLAUDE.md | See [above](#claudemd-management) |
