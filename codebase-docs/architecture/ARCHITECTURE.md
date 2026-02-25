# CasperBot — Architecture

> Auto-generated architecture overview. Last updated: 2026-02-24 (incremental: 563dc98)
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
| Speech | Web Speech API (browser-native, via `useSpeechRecognition` hook) |
| Markdown | react-markdown + rehype-highlight + remark-gfm |
| Backend | Python 3.11+, FastAPI 0.115, Uvicorn |
| Database | SQLite (WAL mode) via aiosqlite |
| Auth | JWT (HS256) via PyJWT |
| Encryption | Fernet (cryptography) for credentials at rest |
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
│   │   ├── settings/page.tsx   # Credentials, commands, MCPs, approvals, GitHub, CLAUDE.md
│   │   └── help/page.tsx       # Help & documentation pages
│   ├── components/
│   │   ├── ui/                 # Base primitives (Button, Input, Textarea, Dialog, Badge, Skeleton, Switch)
│   │   ├── layout/             # AppProviders (Zustand + WS), ConnectionStatus
│   │   ├── auth/               # AuthGuard (route protection)
│   │   ├── chat/               # 19 components: ChatArea, ChatEditor, ChatInput, ChatMessage,
│   │   │                       #   MessageList, MarkdownRenderer, ToolUseCard, ThinkingBlock,
│   │   │                       #   TodoCard, AskUserQuestionCard, PlanCard, EnterPlanCard,
│   │   │                       #   TypingIndicator, ModelSelector, SlashCommandPalette,
│   │   │                       #   MentionSuggestionList, MentionChip, WelcomeScreen, ChatHeader
│   │   ├── tasks/              # ActiveTasksIndicator (header badge + dropdown for background tasks)
│   │   ├── projects/           # ProjectCard, CreateProjectDialog, EmptyState
│   │   ├── sessions/           # SessionSidebar, SessionItem
│   │   ├── files/              # FileTreePanel, FileTreeNode
│   │   ├── settings/           # Sidebar, tab bar, section containers,
│   │   │                       #   credential/command/MCP dialogs, GitHub section, approvals
│   │   ├── project-settings/   # ProjectSettingsDrawer + 5 tabs: CLAUDE.md, Commands,
│   │   │                       #   MCPs, Env Vars (with credential exclusion toggles), Approvals
│   │   └── help/               # HelpSidebar, HelpTabBar, 10 help section components
│   ├── hooks/                  # 25+ custom hooks (useChat, useWebSocket, useMentions,
│   │                           #   useCredentials, useProjectEnvVars, useGlobalApprovals,
│   │                           #   useProjectApprovals, useSpeechRecognition, useElapsedTime,
│   │                           #   useActiveTasks, useNotifications, etc.)
│   ├── lib/                    # Core utilities
│   │   ├── store.ts            # Zustand global state
│   │   ├── websocket.ts        # WebSocket manager singleton
│   │   ├── api.ts              # REST API client (with JWT auth headers)
│   │   ├── auth.ts             # JWT token helpers (localStorage)
│   │   ├── constants.ts        # Models, URLs, slash commands
│   │   └── notifications.ts    # Browser Notification API wrapper (smart trigger logic)
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
│   │   │   ├── messages/       # GET /api/messages (JWT protected)
│   │   │   ├── credentials/    # CRUD /api/credentials (JWT protected)
│   │   │   ├── commands/       # CRUD /api/commands (JWT protected)
│   │   │   ├── mcps/           # GET/POST /api/mcps + auto-credential detection (JWT)
│   │   │   ├── project_settings/ # /api/projects/{id}/settings/* (env vars, approvals, etc.)
│   │   │   ├── settings/       # GET/PUT /api/settings (global approvals) (JWT)
│   │   │   ├── files/          # File tree, search, content (JWT protected)
│   │   │   ├── mentions/       # URL fetch, SSRF-protected (JWT protected)
│   │   │   ├── tasks/          # GET /api/tasks, POST /api/tasks/{id}/cancel (JWT)
│   │   │   ├── claude_md/      # GET/PUT /api/claude-md (JWT protected)
│   │   │   └── github/         # OAuth + repo operations (mixed auth)
│   │   ├── services/           # Business logic (12 service modules)
│   │   │   ├── claude/         # ProcessManager, StreamParser, CommandTranslator, SystemContext
│   │   │   ├── tasks/          # TaskManager (background task lifecycle, event buffering, replay)
│   │   │   ├── projects/       # ProjectService
│   │   │   ├── sessions/       # SessionService
│   │   │   ├── messages/       # MessageService (persist + retrieve chat messages)
│   │   │   ├── credentials/    # CredentialService (Fernet-encrypted storage, env injection)
│   │   │   ├── project_settings/ # ProjectSettingsService (env vars, approvals, exclusions)
│   │   │   ├── commands/       # CommandService
│   │   │   ├── mcps/           # McpService (install + auto-credential detection registry)
│   │   │   ├── chat/           # TitleGenerator
│   │   │   ├── claude_md/      # ClaudeMdService
│   │   │   └── github/         # GitHubService (OAuth, repos)
│   │   ├── schemas/            # Pydantic v2 models (13 files)
│   │   ├── core/               # Config, database, security, encryption, exceptions
│   │   └── utils/helpers.py    # slugify()
│   ├── data/                   # SQLite DB + master key (gitignored)
│   └── requirements.txt
│
├── scripts/                    # Process management
│   ├── monitor.sh              # Watchdog loop: health-checks + auto-restart
│   ├── start-backend.sh        # Idempotent backend starter
│   ├── start-frontend.sh       # Idempotent frontend starter
│   └── start-tunnel.sh         # Idempotent tunnel starter
│
├── service/                    # macOS launchd auto-start
│   ├── com.casperbot.plist      # Service definition (runs monitor.sh, KeepAlive: true)
│   ├── install.sh              # Register with launchctl
│   └── uninstall.sh            # Unregister
│
├── install.sh                  # One-line remote installer (curl | bash)
├── restart.sh                  # Graceful restart (stop + start)
├── start.sh                    # Manual start (delegates to scripts/)
├── stop.sh                     # Stop all (monitor + services + launchd)
├── status.sh                   # Check what's running (including monitor)
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
│  │ ApiClient  │  │ WsManager    │  │ Notifications │        │
│  │ (fetch)    │  │ (singleton)  │  │ (browser API) │        │
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
│  │ (login)      │  │ (WebSocket)  │  │ (CRUD+Tasks) │       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │
│         │                 │                  │                │
│  ┌──────┴───────┐  ┌──────┴───────┐  ┌──────┴───────┐       │
│  │ Security     │  │ TaskManager  │  │ Services     │       │
│  │ (JWT/PyJWT)  │  │              │  │              │       │
│  └──────────────┘  │ • start task │  │ • Projects   │       │
│                    │ • buffer evts│  │ • Sessions   │       │
│                    │ • subscribe  │  │ • Messages   │       │
│                    │ • replay     │  │ • Credentials│       │
│                    │ • persist    │  │ • ProjSettings│      │
│                    └──────┬───────┘  │ • Commands   │       │
│                           │          │ • GitHub     │       │
│                    ┌──────┴───────┐  └──────┬───────┘       │
│                    │ProcessManager│  ┌──────┴───────┐       │
│                    │ • spawn CLI  │  │   SQLite DB   │       │
│                    │ • parse JSON │  │   (WAL mode)  │       │
│                    │ • inject creds│ └──────────────┘       │
│                    └──────┬───────┘                          │
│                    ┌──────┴───────┐                          │
│                    │ claude CLI   │                          │
│                    │ subprocess   │                          │
│                    └──────────────┘                          │
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
| `/chat/[projectId]` | `app/chat/[projectId]/page.tsx` | Chat interface with session sidebar, file tree, project settings drawer |
| `/settings` | `app/settings/page.tsx` | 6-section settings: Credentials, Commands, MCPs, Approvals, GitHub, CLAUDE.md |
| `/help` | `app/help/page.tsx` | 10-section help & documentation (overview, projects, chat, env vars, MCPs, etc.) |

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
  messagesLoaded: Record<string, boolean>;   // tracks which sessions have loaded persisted messages
  isStreaming: Record<string, boolean>;
  isWaitingForInput: Record<string, boolean>; // true when AskUserQuestion is pending
  lastEventAt: Record<string, number>;        // staleness detection for stuck chats

  // Actions
  fetchProjects, createProject, deleteProject
  fetchSessions, createSession, deleteSession, renameSession
  fetchMessages                                // load persisted messages from REST API
  sendMessage, cancelRequest, handleWsEvent
}
```

`handleWsEvent()` routes all WebSocket events to state mutations — appending text deltas, tracking tool use, marking completion, handling session creation/rename, managing `input_required` events for AskUserQuestion, replaying buffered events from `task_replay`, and triggering browser notifications on completions.

**Stuck chat recovery:** `cancelRequest()` sends a WS cancel and starts a 5s timeout. If the server doesn't confirm with `cancelled` within 5s, `forceCancelSession()` force-resets the UI (marks streaming false, completes all tools). The backend also force-cleans any session still marked busy after the stream generator exits.

### WebSocket Client

`lib/websocket.ts` — singleton `WebSocketManager`:
- Connects to `WS_URL` with JWT in query param
- Exponential backoff reconnection (1s base → 30s max, with jitter)
- Ping/pong keepalive every 25s
- Close code 1008 → clear token, redirect to `/login`
- No token → stays disconnected (avoids redirect loop)
- After login, `wsManager.connect()` called explicitly
- Sends `subscribe`/`unsubscribe` messages for task session management

### API Client

`lib/api.ts` — `ApiClient` class:
- All REST calls use relative paths (`/api/...`) proxied by Next.js rewrites to backend
- JWT Bearer token automatically attached via `authHeaders()`
- 401 → clear token, redirect to `/login`
- Includes methods for credentials, project settings, env vars, approvals, MCP credential install, and more

### Browser Notifications

`lib/notifications.ts` + `hooks/use-notifications.ts` — client-side browser push notifications:
- Uses the browser Notification API (no backend component)
- Fires on `message_complete` ("Claude finished responding") and `input_required` ("Claude has a question")
- **Smart trigger logic:** only fires when the browser tab is hidden OR the event is from a non-active session (background task)
- Permission stored in `localStorage` under `casperbot-notifications-enabled`
- Hook API: `{ supported, permission, enabled, request(), toggle() }`
- Clicking a notification focuses the browser window

### Active Tasks Indicator

`components/tasks/active-tasks-indicator.tsx` + `hooks/use-active-tasks.ts`:
- Header badge showing count of running background tasks
- Clicking reveals dropdown: session name, elapsed time, event count, cancel button per task
- Polls `GET /api/tasks` every 10 seconds to refresh
- Only visible when `runningCount > 0`

### Plan Card

`components/chat/plan-card.tsx` — displays implementation plans from Claude's plan mode:
- Extracts plan content from `Write` tool invocations (scans backwards from `ExitPlanMode`)
- Falls back to `ExitPlanMode` tool result if no Write found
- Collapsible card with status indicator, file path, and markdown-rendered plan content
- `EnterPlanCard` companion component for when plan mode is entered

### Project Settings Hooks

Each project settings tab has a dedicated hook:

| Hook | File | What it manages |
|------|------|----------------|
| `useProjectClaudeMd` | `hooks/use-project-claude-md.ts` | Project CLAUDE.md read/write |
| `useProjectCommands` | `hooks/use-project-commands.ts` | Project slash command CRUD |
| `useProjectMcps` | `hooks/use-project-mcps.ts` | Project MCP listing (read-only) |
| `useProjectEnvVars` | `hooks/use-project-env-vars.ts` | Project env vars CRUD + credential exclusion toggles |
| `useProjectApprovals` | `hooks/use-project-approvals.ts` | Project approval override with global inheritance |
| `useCredentials` | `hooks/use-credentials.ts` | Global credential CRUD |
| `useGlobalApprovals` | `hooks/use-global-approvals.ts` | Global tool approval toggle |

### Speech Recognition

`hooks/use-speech-recognition.ts` — wraps the browser's Web Speech API:
- Uses `SpeechRecognition` / `webkitSpeechRecognition` (browser-native, no external service)
- Continuous mode with final transcript callbacks
- Returns `{ isListening, isSupported, start, stop, toggle }`
- Integrated into `ChatInput` — microphone button appends transcribed text to the editor

### Elapsed Time

`hooks/use-elapsed-time.ts` — displays how long a request has been streaming:
- Returns a formatted string (`"12s"`, `"1:30"`) while `active` is true
- Updates every second via `setInterval`
- Used in the chat UI to show response duration

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
app.include_router(messages_router, dependencies=[Depends(get_current_user)])
app.include_router(credentials_router, dependencies=[Depends(get_current_user)])
app.include_router(settings_router, dependencies=[Depends(get_current_user)])
app.include_router(tasks_router, dependencies=[Depends(get_current_user)])
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
| `GET` | `/api/messages?session_id=&offset=&limit=` | JWT | List persisted messages for a session |
| `GET/POST` | `/api/credentials` | JWT | List / create credentials |
| `GET/PATCH/DELETE` | `/api/credentials/{id}` | JWT | Get / update / delete credential |
| `GET` | `/api/credentials/{id}/value` | JWT | Decrypt credential value |
| `GET/POST` | `/api/commands` | JWT | List / create commands |
| `GET/PUT/DELETE` | `/api/commands/{name}` | JWT | Get / update / delete command |
| `POST` | `/api/commands/generate` | JWT | AI-generate command |
| `GET` | `/api/mcps` | JWT | List MCP servers |
| `POST` | `/api/mcps/install` | JWT | Install MCP via NL (returns missing credentials) |
| `POST` | `/api/mcps/install-credential` | JWT | Save credential inline during MCP install |
| `GET` | `/api/tasks` | JWT | List active and recently completed background tasks |
| `POST` | `/api/tasks/{session_id}/cancel` | JWT | Cancel a running background task |
| `GET/PUT` | `/api/claude-md` | JWT | Read / update CLAUDE.md |
| `GET/PUT` | `/api/settings/approvals` | JWT | Get / set global tool approvals |
| `GET/PUT` | `/api/projects/{id}/settings/approvals` | JWT | Get / set project approval override |
| `GET/PUT` | `/api/projects/{id}/settings/claude-md` | JWT | Read / update project CLAUDE.md |
| `GET/POST` | `/api/projects/{id}/settings/commands` | JWT | List / create project commands |
| `GET/PUT/DELETE` | `/api/projects/{id}/settings/commands/{name}` | JWT | Get / update / delete project command |
| `GET` | `/api/projects/{id}/settings/mcps` | JWT | List project MCPs |
| `GET/POST` | `/api/projects/{id}/settings/env-vars` | JWT | List / create project env vars |
| `PUT/DELETE` | `/api/projects/{id}/settings/env-vars/{id}` | JWT | Update / delete project env var |
| `POST` | `/api/projects/{id}/settings/excluded-credentials` | JWT | Exclude a global credential from project |
| `DELETE` | `/api/projects/{id}/settings/excluded-credentials/{env_var}` | JWT | Re-include an excluded credential |
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
| `TaskManager` | `services/tasks/task_manager.py` | Background task lifecycle: start, buffer events, manage subscriptions, replay on reconnect, persist messages on completion |
| `ProcessManager` | `services/claude/process_manager.py` | Spawn/track/kill `claude` subprocesses, stream parsing, credential env injection with exclusions |
| `StreamParser` | `services/claude/stream_parser.py` | Parse NDJSON from CLI into typed events |
| `CommandTranslator` | `services/claude/command_translator.py` | Map `/slash` commands to NL prompts |
| `SystemContext` | `services/claude/system_context.py` | System prompt injected into every Claude conversation |
| `ProjectService` | `services/projects/project_service.py` | CRUD, template copying, git init, filesystem-DB sync |
| `SessionService` | `services/sessions/session_service.py` | CRUD, metadata updates after messages |
| `MessageService` | `services/messages/message_service.py` | Persist & retrieve chat messages (user + assistant) per session |
| `CredentialService` | `services/credentials/credential_service.py` | Encrypted credential storage, value masking, env map for subprocess injection |
| `ProjectSettingsService` | `services/project_settings/project_settings_service.py` | Project env vars, approval overrides, credential exclusions, project commands/MCPs/CLAUDE.md |
| `CommandService` | `services/commands/command_service.py` | Global custom command CRUD (filesystem .md files) |
| `McpService` | `services/mcps/mcp_service.py` | MCP plugin discovery, NL install, auto-credential detection via `KNOWN_MCP_CREDENTIALS` registry |
| `GitHubService` | `services/github/github_service.py` | OAuth, token management, repo CRUD |
| `ClaudeMdService` | `services/claude_md/claude_md_service.py` | Global CLAUDE.md read/write/sync to all projects |
| `generate_title()` | `services/chat/title_generator.py` | AI-generated session titles |

### Data Layer

SQLite at `backend/data/casperbot.db`. Eight tables:

```sql
projects                    (id TEXT PK, name, slug, path, description, github_repo_url,
                             is_pinned, is_system, approvals_enabled, created_at, updated_at)
sessions                    (id TEXT PK, project_id FK, name, last_message, message_count,
                             is_active, created_at, updated_at)
messages                    (id TEXT PK, session_id FK, role CHECK('user','assistant'),
                             content, thinking, tool_uses JSON, usage JSON, cost_usd, created_at)
credentials                 (id TEXT PK, name, service, env_var UNIQUE, encrypted_value,
                             created_at, updated_at)
project_env_vars            (id TEXT PK, project_id FK, name, env_var, encrypted_value,
                             created_at, updated_at, UNIQUE(project_id, env_var))
project_excluded_credentials (id TEXT PK, project_id FK, env_var, created_at,
                             UNIQUE(project_id, env_var))
settings                    (key TEXT PK, value TEXT)
github_accounts             (id TEXT PK, github_username, github_user_id UNIQUE,
                             avatar_url, encrypted_token, scopes, created_at, updated_at)
```

WAL mode, foreign keys enabled, async via aiosqlite. Session IDs are UUIDs reused as `claude --session-id` values. Database migrations are idempotent (try/except patterns, `ALTER TABLE` with error handling).

**Pinned / system projects:** `is_pinned` and `is_system` columns allow projects to be pinned to the top of the list and marked as non-deletable system projects. On startup, the backend seeds a "CasperBot" system project pointing at its own repo root so a Claude agent can modify the app itself.

**Messages table:** Each message stores the full content, thinking text, tool use details (as JSON), token usage, and cost. Messages cascade-delete when their session is deleted.

**Credentials table:** Formerly `api_keys` (renamed via migration). Stores Fernet-encrypted credential values. The `env_var` column is UNIQUE — each credential maps to exactly one environment variable.

**Project env vars / exclusions:** `project_env_vars` stores project-scoped secrets (encrypted). `project_excluded_credentials` tracks which global credentials are disabled for a given project. Both use composite unique constraints on `(project_id, env_var)`.

**Settings table:** Key-value store for global settings (e.g., `approvals_enabled`).

### Claude CLI Integration

Four modules in `services/claude/`:

**ProcessManager** spawns Claude as a subprocess:
```
claude -p --output-format stream-json --session-id <uuid> --model <model> --max-budget-usd 5.0 [--resume]
```
- Working directory: project folder
- Environment: OS env + decrypted credentials (minus exclusions) + project env vars
- Stdin: message text
- Stdout: NDJSON parsed line-by-line → `ParsedEvent` → WebSocket events
- Supports cancel (SIGTERM → SIGKILL after 5s) and timeout (600s)
- Force-cleanup: if a session is still busy after the stream generator exits, the process is cancelled to prevent permanent "busy" state

**StreamParser** handles CLI output types: `assistant` (text, thinking, tool_use, tool_result), `result` (completion with usage/cost), `error`.

**CommandTranslator** converts `/slash` commands to natural language prompts (since `/commands` don't work in `-p` mode).

**SystemContext** provides the `CASPERBOT_SYSTEM_CONTEXT` constant — a comprehensive system prompt injected into every Claude conversation. It describes CasperBot's architecture, features, file structure, and behavioral rules so Claude understands the environment it's running in.

### Background Task System

`services/tasks/task_manager.py` — decouples Claude subprocess lifecycle from WebSocket connections. Tasks continue running even when clients disconnect, with event buffering and replay on reconnect.

**Key data structure:**
```python
@dataclass
class BackgroundTask:
    session_id: str
    project_id: str
    status: str              # running | completed | cancelled | error | waiting_for_input
    event_buffer: list[dict] # Buffered NDJSON events for replay
    subscribers: set[WebSocket]
    asyncio_task: asyncio.Task
    # Accumulators for persistence
    full_content: str
    full_thinking: str
    tool_uses_acc: list[dict]
    final_usage: dict | None
    final_cost: float | None
```

**How it works:**
1. `start_task()` creates a `BackgroundTask` and spawns an asyncio coroutine
2. Coroutine consumes CLI events from `ProcessManager.run_prompt()`, buffers them, and broadcasts to all subscribed WebSockets
3. When a session becomes active, frontend sends `subscribe` → receives `task_replay` with all buffered events
4. On completion/cancellation, `_persist_assistant()` saves the full message to SQLite
5. Background `_cleanup_loop()` removes completed task buffers after TTL expiry

**Why it exists:** Enables multi-tab usage and tab-switching without losing progress. Also prevents the "stuck chat" problem where a disconnected WebSocket would leave a task running with no way to get its output.

## WebSocket Protocol

Single WebSocket per client at `/ws/chat`. All sessions multiplexed by `session_id`.

### Client → Server

```json
{"type": "send_message", "session_id": "...", "project_id": "...", "message": "...", "model": "claude-opus-4-6"}
{"type": "subscribe", "session_id": "..."}
{"type": "unsubscribe", "session_id": "..."}
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
{"type": "task_replay", "session_id": "...", "events": [...], "is_complete": false}
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
    → MessageService.save_message(role="user")         ← persists user message
    → TaskManager.start_task()                         ← creates BackgroundTask
    → Spawns asyncio coroutine → _run_task()
    → ProcessManager.run_prompt() → claude -p subprocess
    → Read stdout line-by-line (NDJSON)
    → Buffer events + broadcast to subscribers
    → Frontend: handleWsEvent() → update store
    → React re-renders with streaming text, tool cards, thinking blocks
    → message_complete → _persist_assistant()           ← persists full response
    → isStreaming = false
```

### Task Reconnection Flow

```
User switches tabs or loses connection
    → WebSocket closes → subscriber removed from BackgroundTask
    → Task keeps running in background
    → User returns → WebSocket reconnects
    → Frontend sends {type: "subscribe", session_id}
    → Backend: TaskManager.subscribe() adds WebSocket
    → Sends task_replay with all buffered events + is_complete flag
    → Frontend: handleWsEvent("task_replay") → replays events → UI catches up
```

### Message Persistence

Messages are persisted server-side in the `messages` table. Both user and assistant messages are saved:

- **User messages:** Saved immediately when the backend receives `send_message`
- **Assistant messages:** Accumulated during streaming (text, thinking, tool uses, usage, cost), saved on `message_complete` or `input_required`
- **Loading:** When a session is activated, `store.setActiveSession()` calls `fetchMessages()` which hits `GET /api/messages?session_id=` to hydrate the UI from the database
- **Deduplication:** `messagesLoaded` map prevents re-fetching; only populates if no in-flight messages exist

### AskUserQuestion Flow

```
Claude calls AskUserQuestion tool → tool_use_start event
    → Backend detects tool_name == "AskUserQuestion"
    → Kills the claude process (CLI blocks on stdin waiting for input)
    → Persists accumulated assistant message
    → Sends input_required event to frontend
    → Frontend: isStreaming = false, isWaitingForInput = true
    → User types answer → store.sendMessage()
    → Backend spawns claude -p --resume --session-id <uuid>
    → Claude continues from where it left off
```

### @Mention Resolution

```
User types @filename → suggestion dropdown → selects file
    → On send: useMentionResolver resolves each mention
    → @file → api.readFileContent() | @folder → api.readFolderListing() | @url → api.fetchUrlContent()
    → Wrapped in <attached_context> XML → prepended to message
    → Sent to Claude with full context
```

### Credential Injection

```
User stores credential → encrypted with Fernet → stored in credentials table
    → User sends message → ProcessManager.run_prompt()
    → CredentialService.get_decrypted_env_map() → {ENV_VAR: plaintext}
    → Load excluded credentials for this project
    → Filter out ANTHROPIC_API_KEY and any excluded env vars
    → Load project env vars → overlay on top (project wins on conflict)
    → Inject merged environment into subprocess
    → Claude CLI reads from environment
```

### MCP Auto-Credential Detection

```
User installs MCP → POST /api/mcps/install {query: "add brave search"}
    → McpService.install_mcp() runs the CLI command
    → Checks KNOWN_MCP_CREDENTIALS registry for matching MCP name
    → Compares required env vars against existing credentials
    → Returns missing_credentials[] in response
    → Frontend can prompt user to enter missing credentials inline
    → POST /api/mcps/install-credential saves to global credentials
```

Known MCP credential registry covers: GitHub, Brave Search, Slack, Firebase, Postgres.

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
| `install.sh` | One-line remote installer: checks prerequisites, clones repo, runs setup, installs launchd service |
| `setup.sh` | Interactive first-time setup: installs deps, prompts for domain/password, generates JWT secret |
| `start.sh` | Manual startup: delegates to the 3 start scripts below |
| `stop.sh` | Stops monitor + launchd service + all 3 processes |
| `restart.sh` | Graceful restart: `stop.sh` then `start.sh` (also available as `/restart` slash command in chat) |
| `status.sh` | Shows monitor status + which services are running |
| `scripts/monitor.sh` | **Watchdog loop**: health-checks every 5s, auto-restarts crashed processes |
| `scripts/start-backend.sh` | Idempotent: starts backend if not already running + healthy |
| `scripts/start-frontend.sh` | Idempotent: starts frontend, skips build if `.next/` exists |
| `scripts/start-tunnel.sh` | Idempotent: starts cloudflared tunnel if not running |
| `service/install.sh` | Registers launchd service (runs monitor.sh with `KeepAlive: true`) |
| `service/uninstall.sh` | Removes launchd service |

### Process Resilience

CasperBot includes a self-referencing project that lets a Claude agent modify the app's own codebase. Since the agent has `Bash(*)` permission, it can accidentally kill processes. The watchdog monitor ensures automatic recovery.

```
launchd (KeepAlive: true)
  └── scripts/monitor.sh (restarts if killed)
        ├── checks backend  every 5s → curl /api/health → restart if down
        ├── checks frontend every 5s → curl localhost:3000 → restart if down
        └── checks tunnel   every 5s → PID check → restart if down
```

| Scenario | Recovery |
|----------|----------|
| Agent kills cloudflared | Monitor detects within 5s, restarts tunnel |
| Agent kills backend | Monitor detects within 5s, restarts uvicorn |
| Agent kills the monitor | launchd restarts monitor, monitor restarts dead processes |
| Agent corrupts scripts | Scripts are under git — `git checkout -- scripts/` reverts |

**Backoff**: After 10 consecutive restart failures, the monitor tries once every ~5 minutes instead of every 5 seconds.

**Frontend restarts**: Skip `npm run build` if `.next/` exists (fast restart in ~3s). Pass `--rebuild` flag to force a fresh build after code changes.

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

Auto-starts CasperBot on macOS boot. The plist runs `scripts/monitor.sh` with `KeepAlive: true` — if the monitor crashes, launchd restarts it within 5 seconds (`ThrottleInterval: 5`).

```bash
./service/install.sh      # Install monitor as launchd service
./service/uninstall.sh    # Remove

# Manual control
launchctl kickstart -k gui/$(id -u)/com.casperbot  # Restart monitor
launchctl print gui/$(id -u)/com.casperbot          # Status
./status.sh                                         # Check all processes
```

## Security

| Concern | Mitigation |
|---------|-----------|
| Authentication | Password-based JWT with 30-day configurable expiry |
| REST protection | Bearer token validated on all non-public endpoints |
| WebSocket protection | Token in query param, validated before accept(); 1008 close on failure |
| Credential storage | Fernet encryption at rest; master key in `data/.master.key` (chmod 600) |
| Project env vars | Fernet encrypted, same master key as global credentials |
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
| Background Tasks | [Background Task System](#background-task-system) |
| WebSocket Protocol | [WebSocket Protocol](#websocket-protocol) |
| Message Persistence | [Key Flows > Message Persistence](#message-persistence) |
| AskUserQuestion | [Key Flows > AskUserQuestion Flow](#askuserquestion-flow) |
| Credential Management | [Key Flows > Credential Injection](#credential-injection) |
| Project Settings | [Backend > Service Layer > ProjectSettingsService](#service-layer) |
| Tool Approvals | Global + per-project approval overrides with inheritance |
| MCP Auto-Credentials | [Key Flows > MCP Auto-Credential Detection](#mcp-auto-credential-detection) |
| Browser Notifications | [Frontend > Browser Notifications](#browser-notifications) |
| Plan Mode UI | [Frontend > Plan Card](#plan-card) |
| Speech Recognition | [Frontend > Speech Recognition](#speech-recognition) |
| @Mentions | [Key Flows > @Mention Resolution](#mention-resolution) |
| Help Pages | 10-section help system at `/help` |
| GitHub Integration | Covered in API endpoints + GitHubService |
| Deployment | [Infrastructure & Deployment](#infrastructure--deployment) |
