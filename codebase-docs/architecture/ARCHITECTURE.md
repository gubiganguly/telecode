# CasperBot — Architecture

> Auto-generated architecture overview. Last updated: 2026-02-23
>
> Entry point for developers and AI coding agents to understand the full system.

## System Overview

**CasperBot** is a web-based remote control for [Claude Code](https://code.claude.com). It wraps the Claude Code CLI (`claude -p`) in a FastAPI backend, exposing it over WebSocket so a Next.js frontend can provide a full coding assistant experience from any device — phone, tablet, or laptop.

**Core idea:** User's browser → WebSocket → FastAPI backend → spawns `claude -p` subprocess → Claude edits files on the server → streams results back to the browser.

**Deployment model:** Single-user, self-hosted. Runs on a personal Mac (Mini/Pro/Studio) exposed to the internet via Cloudflare Tunnel, protected by password-based JWT auth. Auto-starts on boot via macOS launchd.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript (strict) |
| State | Zustand 5 + Immer |
| UI | Tailwind CSS 4, Framer Motion 12, Lucide icons |
| Editor | Tiptap (rich text input with @mentions) |
| Markdown | react-markdown + rehype-highlight + remark-gfm |
| Backend | Python 3.11+, FastAPI 0.115, Uvicorn |
| Database | SQLite (WAL mode) via aiosqlite |
| Auth | JWT (HS256) via PyJWT |
| Encryption | Fernet (cryptography) for API keys at rest |
| AI Titles | Anthropic SDK (Claude Haiku) for session auto-titling |
| CLI | Claude Code CLI (`claude -p --output-format stream-json`) |
| Config | pydantic-settings (env vars with `CASPERBOT_` prefix) |
| Tunnel | Cloudflare Tunnel (cloudflared) |
| Service | macOS launchd for auto-start on boot |

## Project Structure

```
casperbot/
├── frontend/                   # Next.js app
│   ├── app/                    # App Router pages
│   │   ├── page.tsx            # Root → redirects to /projects
│   │   ├── layout.tsx          # Root layout (fonts, providers, AuthGuard)
│   │   ├── login/page.tsx      # Password login
│   │   ├── projects/page.tsx   # Project list + create
│   │   ├── chat/[projectId]/page.tsx  # Main chat interface
│   │   └── settings/page.tsx   # API keys, commands, MCPs, GitHub, CLAUDE.md
│   ├── components/
│   │   ├── ui/                 # Base primitives (Button, Input, Dialog, Badge, Skeleton)
│   │   ├── layout/             # AppProviders (Zustand + WS), ConnectionStatus
│   │   ├── auth/               # AuthGuard (route protection)
│   │   ├── chat/               # 15 components: ChatArea, ChatInput, MessageList, MarkdownRenderer,
│   │   │                       #   ToolUseCard, ThinkingBlock, TodoCard, AskUserQuestionCard,
│   │   │                       #   TypingIndicator, ModelSelector, SlashCommandPalette,
│   │   │                       #   MentionSuggestionList, MentionChip, WelcomeScreen, ChatHeader
│   │   ├── projects/           # ProjectCard, CreateProjectDialog, EmptyState
│   │   ├── sessions/           # SessionSidebar, SessionItem
│   │   ├── files/              # FileTreePanel, FileTreeNode
│   │   └── settings/           # 12 components: sidebar, tab bar, 5 section containers,
│   │                           #   command/API key/MCP CRUD dialogs, GitHub section
│   ├── hooks/                  # 16 custom hooks (useChat, useWebSocket, useMentions, etc.)
│   ├── lib/                    # Core utilities
│   │   ├── store.ts            # Zustand global state
│   │   ├── websocket.ts        # WebSocket manager singleton
│   │   ├── api.ts              # REST API client (with JWT auth headers)
│   │   ├── auth.ts             # JWT token helpers (localStorage)
│   │   └── constants.ts        # Models, URLs, slash commands
│   └── types/                  # TypeScript interfaces (api.ts, chat.ts, mentions.ts)
│
├── backend/
│   ├── src/
│   │   ├── main.py             # FastAPI app, lifespan, CORS, router registration, auth deps
│   │   ├── api/                # Route handlers
│   │   │   ├── auth/           # POST /api/auth/login (no auth required)
│   │   │   ├── health/         # GET /api/health (no auth required)
│   │   │   ├── chat/           # WebSocket /ws/chat (token in query param)
│   │   │   ├── projects/       # CRUD /api/projects (JWT protected)
│   │   │   ├── sessions/       # CRUD /api/sessions (JWT protected)
│   │   │   ├── api_keys/       # CRUD /api/keys (JWT protected)
│   │   │   ├── commands/       # CRUD /api/commands (JWT protected)
│   │   │   ├── mcps/           # GET/POST /api/mcps (JWT protected)
│   │   │   ├── files/          # File tree, search, content (JWT protected)
│   │   │   ├── mentions/       # URL fetch, SSRF-protected (JWT protected)
│   │   │   ├── claude_md/      # GET/PUT /api/claude-md (JWT protected)
│   │   │   └── github/         # OAuth + repo operations (mixed auth)
│   │   ├── services/           # Business logic (8 services)
│   │   │   ├── claude/         # ProcessManager, StreamParser, CommandTranslator
│   │   │   ├── projects/       # ProjectService
│   │   │   ├── sessions/       # SessionService
│   │   │   ├── api_keys/       # ApiKeyService (encrypted storage)
│   │   │   ├── commands/       # CommandService
│   │   │   ├── mcps/           # McpService
│   │   │   ├── chat/           # TitleGenerator
│   │   │   ├── claude_md/      # ClaudeMdService
│   │   │   └── github/         # GitHubService (OAuth, repos)
│   │   ├── schemas/            # Pydantic v2 models (12 files)
│   │   ├── core/               # Config, database, security, encryption, exceptions
│   │   └── utils/helpers.py    # slugify()
│   ├── data/                   # SQLite DB + master key (gitignored)
│   └── requirements.txt
│
├── service/                    # macOS launchd auto-start
│   ├── com.casperbot.plist      # Service definition (template with __CASPERBOT_DIR__)
│   ├── install.sh              # Register with launchctl
│   └── uninstall.sh            # Unregister
│
├── start.sh                    # Start all services (backend + frontend + tunnel)
├── stop.sh                     # Stop all services
├── status.sh                   # Check what's running
├── setup.sh                    # Interactive first-time setup
├── .env.production             # Production env vars (gitignored)
├── .env.production.example     # Template for env vars
└── codebase-docs/              # Auto-generated docs
    └── architecture/
        └── ARCHITECTURE.md     # This file
```

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Client (Browser/Phone)                     │
│                     Next.js 16 + React 19                    │
│                                                               │
│  ┌──────────┐  ┌──────────────────┐  ┌───────────┐          │
│  │  /login   │  │  /chat/[id]      │  │ /settings │          │
│  │  (REST)   │  │  (WS + REST)     │  │ (REST)    │          │
│  └────┬──────┘  └───────┬──────────┘  └─────┬─────┘          │
│       │                 │                    │                │
│  ┌────┴─────────────────┴────────────────────┴──────┐        │
│  │              Zustand Store (Immer)                 │        │
│  │  projects[] | sessions[] | messages{} | isStreaming│        │
│  └────┬─────────────────┬────────────────────┬──────┘        │
│       │                 │                    │                │
│  ┌────┴───────┐  ┌──────┴───────┐  ┌────────┴──────┐        │
│  │ ApiClient  │  │ WsManager    │  │ AuthGuard     │        │
│  │ (fetch)    │  │ (singleton)  │  │ (JWT check)   │        │
│  └────┬───────┘  └──────┬───────┘  └───────────────┘        │
└───────┼─────────────────┼────────────────────────────────────┘
        │ HTTPS           │ WSS
        ▼                 ▼
┌───────────────────────────────┐
│     Cloudflare Tunnel         │
│     casperbot.net             │
│                               │
│  /api/* → localhost:8000      │
│  /ws/*  → localhost:8000      │
│  /*     → localhost:3000      │
└───────────┬───────────────────┘
            │
┌───────────┼─────────────────────────────────────────────────┐
│           │          FastAPI Backend (:8000)                  │
│           ▼                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ Auth Router  │  │ Chat Router  │  │ REST Routers │       │
│  │ (login)      │  │ (WebSocket)  │  │ (CRUD)       │       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │
│         │                 │                  │                │
│  ┌──────┴───────┐  ┌──────┴───────┐  ┌──────┴───────┐       │
│  │ Security     │  │ProcessManager│  │ Services     │       │
│  │ (JWT/PyJWT)  │  │              │  │              │       │
│  └──────────────┘  │ • spawn CLI  │  │ • Projects   │       │
│                    │ • parse JSON │  │ • Sessions   │       │
│                    │ • inject keys│  │ • API Keys   │       │
│                    │ • cancel     │  │ • Commands   │       │
│                    └──────┬───────┘  │ • GitHub     │       │
│                           │          └──────┬───────┘       │
│                           ▼                 │                │
│                    ┌──────────────┐  ┌──────┴───────┐       │
│                    │ claude CLI   │  │   SQLite DB   │       │
│                    │ subprocess   │  │   (WAL mode)  │       │
│                    └──────────────┘  └──────────────┘       │
└──────────────────────────────────────────────────────────────┘
```

## Authentication & Authorization

JWT-based auth protects all endpoints except health check and login.

### Flow

```
User → POST /api/auth/login { password }
    ↓ compare against CASPERBOT_AUTH_PASSWORD env var
Backend → create_access_token() → JWT (HS256, 30d expiry)
    ↓
Frontend → localStorage.setItem('casperbot_token', jwt)
    ↓
All REST requests → Authorization: Bearer <jwt>
WebSocket → wss://domain/ws/chat?token=<jwt>
```

### Implementation

| Component | File | What it does |
|-----------|------|-------------|
| JWT creation/verification | `backend/src/core/security.py` | `create_access_token()`, `verify_token()`, `get_current_user()` dependency |
| Login endpoint | `backend/src/api/auth/router.py` | `POST /api/auth/login` — validates password, returns JWT |
| Route protection | `backend/src/main.py` | `dependencies=[Depends(get_current_user)]` on protected routers |
| WebSocket auth | `backend/src/api/chat/router.py` | `authenticate_websocket(token)` before accepting connection |
| Token storage | `frontend/lib/auth.ts` | `getToken()`, `setToken()`, `clearToken()`, `isAuthenticated()` |
| Auth guard | `frontend/components/auth/auth-guard.tsx` | Redirects to `/login` if no valid token |
| API auth headers | `frontend/lib/api.ts` | `authHeaders()` adds Bearer token to all requests |
| WS auth | `frontend/lib/websocket.ts` | Appends `?token=` to WS URL; handles 1008 close code |

### Auth rules

- **Public:** `GET /api/health`, `POST /api/auth/login`, GitHub OAuth callback
- **JWT required:** All other REST endpoints (applied via router dependency)
- **WebSocket:** Token in query param, validated before `accept()`. Close code 1008 on failure.
- **Frontend:** `AuthGuard` wraps all routes. Login page is public. No token → no WebSocket connection.

## Frontend Architecture

### Routing & Pages

| Route | File | Description |
|-------|------|-------------|
| `/` | `app/page.tsx` | Redirects to `/projects` |
| `/login` | `app/login/page.tsx` | Password login, stores JWT, connects WebSocket |
| `/projects` | `app/projects/page.tsx` | Project listing grid with create dialog |
| `/chat/[projectId]` | `app/chat/[projectId]/page.tsx` | Chat interface with session sidebar + file tree |
| `/settings` | `app/settings/page.tsx` | 5-section settings: API Keys, Commands, MCPs, GitHub, CLAUDE.md |

### State Management

Zustand + Immer via `lib/store.ts`:

```typescript
interface AppState {
  // Data
  projects: ProjectInfo[];
  currentProject: ProjectInfo | null;
  sessions: SessionInfo[];
  activeSessionId: string | null;
  isDraftMode: boolean;
  selectedModel: string;
  messages: Record<string, ChatMessage[]>;
  isStreaming: Record<string, boolean>;

  // Actions
  fetchProjects, createProject, deleteProject
  fetchSessions, createSession, deleteSession, renameSession
  sendMessage, cancelRequest, handleWsEvent
}
```

`handleWsEvent()` routes all WebSocket events to state mutations — appending text deltas, tracking tool use, marking completion, handling session creation/rename.

### WebSocket Client

`lib/websocket.ts` — singleton `WebSocketManager`:
- Connects to `WS_URL` with JWT in query param
- Exponential backoff reconnection (1s base → 30s max, with jitter)
- Ping/pong keepalive every 25s
- Close code 1008 → clear token, redirect to `/login`
- No token → stays disconnected (avoids redirect loop)
- After login, `wsManager.connect()` called explicitly

### API Client

`lib/api.ts` — `ApiClient` class:
- All REST calls use relative paths (`/api/...`) proxied by Next.js rewrites to backend
- JWT Bearer token automatically attached via `authHeaders()`
- 401 → clear token, redirect to `/login`

### Styling

- Tailwind CSS 4 with CSS variables for dark theme
- Framer Motion for page transitions, typewriter streaming, micro-interactions
- Fonts: Inter (UI) + JetBrains Mono (code)
- Mobile-first: responsive sidebar drawer, tab bar on mobile

## Backend Architecture

### API Layer

All routers in `src/api/<feature>/router.py`. Auth applied at router level in `main.py`:

```python
# Public
app.include_router(health_router)
app.include_router(auth_router)

# Protected (JWT dependency)
app.include_router(projects_router, dependencies=[Depends(get_current_user)])
app.include_router(sessions_router, dependencies=[Depends(get_current_user)])
# ... all other routers

# WebSocket (handles its own auth)
app.include_router(chat_router)
```

### Full Endpoint Table

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/health` | No | CLI availability, projects dir status |
| `POST` | `/api/auth/login` | No | Password → JWT token |
| `GET/POST` | `/api/projects` | JWT | List / create projects |
| `GET/PATCH/DELETE` | `/api/projects/{id}` | JWT | Get / update / delete project |
| `POST` | `/api/projects/{id}/git-init` | JWT | Initialize git |
| `GET` | `/api/projects/{id}/files` | JWT | Recursive file tree |
| `GET` | `/api/projects/{id}/files/search` | JWT | Fuzzy file search |
| `GET` | `/api/projects/{id}/files/content` | JWT | Read file (max 50KB) |
| `GET` | `/api/projects/{id}/files/listing` | JWT | List folder contents |
| `GET/POST` | `/api/sessions` | JWT | List / create sessions |
| `GET/PATCH/DELETE` | `/api/sessions/{id}` | JWT | Get / rename / delete session |
| `WS` | `/ws/chat` | Token | Bidirectional chat streaming |
| `GET/POST` | `/api/keys` | JWT | List / create API keys |
| `GET/PATCH/DELETE` | `/api/keys/{id}` | JWT | Get / update / delete key |
| `GET` | `/api/keys/{id}/value` | JWT | Decrypt key value |
| `GET/POST` | `/api/commands` | JWT | List / create commands |
| `GET/PUT/DELETE` | `/api/commands/{name}` | JWT | Get / update / delete command |
| `POST` | `/api/commands/generate` | JWT | AI-generate command |
| `GET` | `/api/mcps` | JWT | List MCP servers |
| `POST` | `/api/mcps/install` | JWT | Install MCP via NL |
| `GET/PUT` | `/api/claude-md` | JWT | Read / update CLAUDE.md |
| `POST` | `/api/mentions/fetch-url` | JWT | Fetch URL (SSRF-protected) |
| `GET` | `/api/github/auth/login` | No | Redirect to GitHub OAuth |
| `GET` | `/api/github/auth/callback` | No | OAuth callback |
| `GET` | `/api/github/status` | JWT | GitHub connection status |
| `DELETE` | `/api/github/disconnect` | JWT | Revoke GitHub token |
| `GET/POST` | `/api/github/repos` | JWT | List / create repos |
| `POST` | `/api/github/projects/{id}/link` | JWT | Link repo to project |
| `POST` | `/api/github/projects/{id}/push` | JWT | Push to GitHub |

All REST endpoints return `APIResponse[T]`: `{"success": true, "data": {...}, "error": null}`

### Service Layer

| Service | File | Responsibility |
|---------|------|----------------|
| `ProcessManager` | `services/claude/process_manager.py` | Spawn/track/kill `claude` subprocesses, stream parsing, API key env injection |
| `StreamParser` | `services/claude/stream_parser.py` | Parse NDJSON from CLI into typed events |
| `CommandTranslator` | `services/claude/command_translator.py` | Map `/slash` commands to NL prompts |
| `ProjectService` | `services/projects/project_service.py` | CRUD, template copying, git init, filesystem-DB sync |
| `SessionService` | `services/sessions/session_service.py` | CRUD, metadata updates after messages |
| `ApiKeyService` | `services/api_keys/api_key_service.py` | Encrypted key storage, env injection |
| `CommandService` | `services/commands/command_service.py` | Custom command CRUD (filesystem .md files) |
| `McpService` | `services/mcps/mcp_service.py` | MCP plugin discovery + NL install |
| `GitHubService` | `services/github/github_service.py` | OAuth, token management, repo CRUD |
| `ClaudeMdService` | `services/claude_md/claude_md_service.py` | CLAUDE.md read/write/sync |
| `generate_title()` | `services/chat/title_generator.py` | AI-generated session titles |

### Data Layer

SQLite at `backend/data/casperbot.db`. Four tables:

```sql
projects        (id TEXT PK, name, slug, path, description, github_repo_url, created_at, updated_at)
sessions        (id TEXT PK, project_id FK, name, last_message, message_count, is_active, created_at, updated_at)
api_keys        (id TEXT PK, name, service, env_var, encrypted_value, created_at, updated_at)
github_accounts (id TEXT PK, github_username, github_user_id UNIQUE, avatar_url, encrypted_token, scopes, ...)
```

WAL mode, foreign keys enabled, async via aiosqlite. Session IDs are UUIDs reused as `claude --session-id` values.

### Claude CLI Integration

Three modules in `services/claude/`:

**ProcessManager** spawns Claude as a subprocess:
```
claude -p --output-format stream-json --session-id <uuid> --model <model> --max-budget-usd 5.0 [--resume]
```
- Working directory: project folder
- Environment: OS env + decrypted API keys
- Stdin: message text
- Stdout: NDJSON parsed line-by-line → `ParsedEvent` → WebSocket events
- Supports cancel (SIGTERM → SIGKILL after 5s) and timeout (600s)

**StreamParser** handles CLI output types: `assistant` (text, thinking, tool_use, tool_result), `result` (completion with usage/cost), `error`.

**CommandTranslator** converts `/slash` commands to natural language prompts (since `/commands` don't work in `-p` mode).

## WebSocket Protocol

Single WebSocket per client at `/ws/chat`. All sessions multiplexed by `session_id`.

### Client → Server

```json
{"type": "send_message", "session_id": "...", "project_id": "...", "message": "...", "model": "claude-opus-4-6"}
{"type": "cancel", "session_id": "..."}
{"type": "ping"}
```

### Server → Client (streaming)

```json
{"type": "message_start", "session_id": "..."}
{"type": "text_delta", "session_id": "...", "text": "Hello"}
{"type": "thinking_delta", "session_id": "...", "thinking": "Let me..."}
{"type": "tool_use_start", "session_id": "...", "tool_name": "Read", "tool_id": "...", "input": {...}}
{"type": "tool_result", "session_id": "...", "tool_id": "...", "output": "...", "is_error": false}
{"type": "message_complete", "session_id": "...", "result_text": "...", "usage": {...}, "cost_usd": 0.05}
{"type": "session_created", "session_id": "...", "project_id": "..."}
{"type": "session_renamed", "session_id": "...", "name": "AI Title"}
{"type": "input_required", "session_id": "..."}
{"type": "error", "session_id": "...", "error": "..."}
{"type": "cancelled", "session_id": "..."}
{"type": "pong"}
```

## Key Flows

### Chat Message Flow

```
User types message → store.sendMessage()
    → wsManager.send({type: "send_message", ...})
    → Backend: chat_websocket() receives message
    → Background task: ProcessManager.run_prompt()
    → Spawn: claude -p --output-format stream-json --session-id <uuid>
    → Read stdout line-by-line (NDJSON)
    → Parse → websocket.send_json(event) for each event
    → Frontend: handleWsEvent() → update store
    → React re-renders with streaming text, tool cards, thinking blocks
    → message_complete → isStreaming = false
```

### @Mention Resolution

```
User types @filename → suggestion dropdown → selects file
    → On send: useMentionResolver resolves each mention
    → @file → api.readFileContent() | @folder → api.readFolderListing() | @url → api.fetchUrlContent()
    → Wrapped in <attached_context> XML → prepended to message
    → Sent to Claude with full context
```

### API Key Injection

```
User stores API key → encrypted with Fernet → stored in DB
    → User sends message → ProcessManager.run_prompt()
    → ApiKeyService.get_decrypted_env_map() → {ENV_VAR: plaintext}
    → Injected as subprocess environment variables
    → Claude CLI reads from environment
```

## Infrastructure & Deployment

### Cloudflare Tunnel

All traffic routed through `cloudflared`:

```yaml
# ~/.cloudflared/config.yml
ingress:
  - hostname: casperbot.net
    path: /ws/*
    service: http://localhost:8000     # WebSocket → backend
  - hostname: casperbot.net
    path: /api/*
    service: http://localhost:8000     # API → backend
  - hostname: casperbot.net
    service: http://localhost:3000     # Everything else → frontend
  - service: http_status:404
```

### Scripts

| Script | Purpose |
|--------|---------|
| `setup.sh` | Interactive first-time setup: installs deps, prompts for domain/password, generates JWT secret |
| `start.sh` | Loads env, kills stale processes, starts backend/frontend/tunnel with health checks |
| `stop.sh` | Kills all services by PID + port fallback |
| `status.sh` | Shows which services are running and responding |
| `service/install.sh` | Registers launchd service for auto-start on boot |
| `service/uninstall.sh` | Removes launchd service |

### Environment Variables

**Backend (`CASPERBOT_` prefix):**

| Variable | Purpose | Default |
|----------|---------|---------|
| `CASPERBOT_AUTH_PASSWORD` | Login password | (required) |
| `CASPERBOT_AUTH_SECRET` | JWT signing key (HS256) | (required) |
| `CASPERBOT_AUTH_TOKEN_EXPIRY_HOURS` | Token lifetime | 720 (30 days) |
| `CASPERBOT_CORS_ORIGINS` | Allowed origins (comma-separated) | `http://localhost:3000,http://localhost:3001` |
| `CASPERBOT_PROJECTS_DIR` | Projects root directory | `~/Claude Code Projects` |
| `CASPERBOT_DEFAULT_MODEL` | Default Claude model | `sonnet` |
| `CASPERBOT_MAX_BUDGET_USD` | Budget per request | 5.0 |
| `CASPERBOT_PROCESS_TIMEOUT_SECONDS` | CLI timeout | 600 |
| `CASPERBOT_GITHUB_CLIENT_ID` | GitHub OAuth app ID | (optional) |
| `CASPERBOT_GITHUB_CLIENT_SECRET` | GitHub OAuth app secret | (optional) |

**Frontend (build-time, baked into JS bundle):**

| Variable | Purpose | Default |
|----------|---------|---------|
| `NEXT_PUBLIC_WS_URL` | WebSocket URL | `ws://localhost:8000/ws/chat` |
| `NEXT_PUBLIC_API_URL` | API base URL | `""` (relative paths, proxied by Next.js) |

### launchd Service

Auto-starts CasperBot on macOS boot:

```bash
./service/install.sh      # Install and start
./service/uninstall.sh    # Remove

# Manual control
launchctl kickstart -k gui/$(id -u)/com.casperbot  # Restart
launchctl print gui/$(id -u)/com.casperbot          # Status
```

## Security

| Concern | Mitigation |
|---------|-----------|
| Authentication | Password-based JWT with 30-day configurable expiry |
| REST protection | Bearer token validated on all non-public endpoints |
| WebSocket protection | Token in query param, validated before accept(); 1008 close on failure |
| API key storage | Fernet encryption at rest; master key in `data/.master.key` (chmod 600) |
| SSRF | URL fetch blocks private IPs and localhost |
| Path traversal | File endpoints resolve paths and validate containment within project dir |
| Input validation | Pydantic models on all request bodies |
| CORS | Configurable allowed origins |
| GitHub tokens | Encrypted with Fernet, injected only during push (never persisted in .git) |

## Feature Modules

| Feature | Section |
|---------|---------|
| Authentication | [Authentication & Authorization](#authentication--authorization) |
| Chat / Claude CLI | [Claude CLI Integration](#claude-cli-integration) |
| WebSocket Protocol | [WebSocket Protocol](#websocket-protocol) |
| @Mentions | [Key Flows > @Mention Resolution](#mention-resolution) |
| GitHub Integration | Covered in API endpoints + GitHubService |
| Deployment | [Infrastructure & Deployment](#infrastructure--deployment) |
