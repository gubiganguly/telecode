# Telecode

**Control Claude Code from your browser.**

Telecode wraps the [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) in a web interface so you can manage projects, chat with Claude, and watch it read, write, and edit your files — all from a browser tab instead of a terminal.

Your files stay on your machine. The backend spawns `claude` as a local subprocess and streams its output to the frontend over WebSocket. Nothing leaves your network.

---

## How It Works

```
Browser (Next.js)
    ↕ WebSocket + REST
FastAPI Backend
    ↕ subprocess (stdin/stdout)
Claude Code CLI
    ↕ reads/writes
Your Local Files
```

1. You open a project in the web UI and start a chat session
2. The backend spawns `claude -p --output-format stream-json` pointed at your project directory
3. Claude's streamed NDJSON output (thinking, text, tool calls, results) gets parsed and forwarded to the browser in real time
4. You see everything — Claude's reasoning, the files it reads, the edits it makes, the commands it runs

---

## Features

- **Real-time chat streaming** — text deltas, thinking blocks, tool use, and tool results streamed live via WebSocket
- **Project management** — create, list, and delete projects, each backed by a local directory
- **Session management** — multiple chat sessions per project with auto-generated AI titles
- **Model selection** — switch between Opus 4.6, Sonnet 4.6, and Haiku 4.5 per message
- **Tool visibility** — see every Read, Write, Edit, Bash, and other tool call with full input/output
- **Slash commands** — built-in commands (`/commit`, `/test`, `/fix`, `/build`, `/lint`, etc.) plus custom user-defined commands with AI generation
- **API key vault** — store API keys encrypted at rest (Fernet), auto-injected into Claude CLI subprocesses as env vars
- **MCP server management** — view installed MCP servers and install new ones
- **File tree viewer** — browse project file structure from the chat interface
- **CLAUDE.md editor** — edit and sync global CLAUDE.md instructions across projects
- **GitHub integration** — connect your GitHub account via OAuth, create repos, link existing repos, and push code directly from the UI
- **@mentions** — reference files (`@filename`), folders (`@folder/`), and URLs (`@https://...`) in chat messages to give Claude extra context
- **Mobile-responsive** — full mobile layout with sidebar drawer, tab bar navigation, and touch-friendly controls

---

## Quick Start

### Prerequisites

- **Node.js** 18+ and **npm**
- **Python** 3.11+
- **Claude Code CLI** installed and authenticated (`npm install -g @anthropic-ai/claude-code`)

### 1. Clone the repo

```bash
git clone https://github.com/your-username/telecode.git
cd telecode
```

### 2. Start the backend

```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn src.main:app --port 8000
```

### 3. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

### 4. Open the app

Go to [http://localhost:3000](http://localhost:3000). Create a project, start a session, and chat.

### 5. (Optional) Enable GitHub integration

To push projects to GitHub, you need a GitHub OAuth App:

1. Go to [GitHub Developer Settings](https://github.com/settings/developers) → **New OAuth App**
2. Set Homepage URL to `http://localhost:3000`
3. Set Callback URL to `http://localhost:8000/api/github/auth/callback`
4. Create a `.env` file in `backend/` with:
   ```
   TELECODE_GITHUB_CLIENT_ID=your_client_id
   TELECODE_GITHUB_CLIENT_SECRET=your_client_secret
   ```
5. Restart the backend, then connect in **Settings → GitHub**

---

## Project Structure

```
telecode/
├── frontend/                      # Next.js 16 + React 19 + TypeScript
│   ├── app/
│   │   ├── projects/              # Project list page
│   │   ├── chat/[projectId]/      # Chat interface
│   │   └── settings/              # Settings (commands, API keys, MCPs)
│   ├── components/
│   │   ├── ui/                    # Base primitives (Button, Input, Dialog, etc.)
│   │   ├── layout/                # AppProviders, ConnectionStatus
│   │   ├── chat/                  # ChatArea, MessageList, ChatInput, ToolUseCard, etc.
│   │   ├── projects/              # ProjectCard, CreateProjectDialog, EmptyState
│   │   ├── sessions/              # SessionSidebar, SessionItem
│   │   ├── settings/              # API key, command, and MCP management
│   │   └── files/                 # FileTreePanel, FileTreeNode
│   ├── hooks/                     # Custom hooks (useChat, useProjects, useSessions, etc.)
│   ├── lib/                       # Store, WebSocket manager, API client, constants
│   └── types/                     # TypeScript interfaces (api.ts, chat.ts)
│
├── backend/                       # Python FastAPI
│   ├── src/
│   │   ├── main.py                # App entrypoint, lifespan, router registration
│   │   ├── api/                   # Route handlers (health, projects, sessions, chat,
│   │   │                          #   api_keys, commands, mcps, files, claude_md, github)
│   │   ├── services/              # Business logic (claude/, projects/, sessions/,
│   │   │                          #   api_keys/, commands/, mcps/, chat/, claude_md/, github/)
│   │   ├── schemas/               # Pydantic models
│   │   └── core/                  # Config, database, encryption, exceptions
│   ├── data/                      # SQLite database (auto-created)
│   └── requirements.txt
│
└── codebase-docs/                 # Auto-generated architecture docs
```

---

## Configuration

All backend settings use the `TELECODE_` prefix and can be set as environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `TELECODE_DEBUG` | `false` | Enable debug mode |
| `TELECODE_HOST` | `0.0.0.0` | Server bind host |
| `TELECODE_PORT` | `8000` | Server bind port |
| `TELECODE_PROJECTS_DIR` | `~/Claude Code Projects` | Root directory for project files |
| `TELECODE_CLAUDE_BINARY` | `claude` | Path to the Claude Code CLI binary |
| `TELECODE_DEFAULT_MODEL` | `sonnet` | Default Claude model |
| `TELECODE_FALLBACK_MODEL` | `haiku` | Fallback model if primary unavailable |
| `TELECODE_MAX_BUDGET_USD` | `5.0` | Per-invocation API budget limit |
| `TELECODE_PROCESS_TIMEOUT_SECONDS` | `600` | CLI process timeout (seconds) |
| `TELECODE_ENCRYPTION_KEY` | auto-generated | Fernet key for API key encryption |
| `TELECODE_CORS_ORIGINS` | `localhost:3000,3001` | Allowed CORS origins |
| `TELECODE_GITHUB_CLIENT_ID` | _(empty)_ | GitHub OAuth App client ID |
| `TELECODE_GITHUB_CLIENT_SECRET` | _(empty)_ | GitHub OAuth App client secret |
| `TELECODE_GITHUB_CALLBACK_URL` | `http://localhost:8000/api/github/auth/callback` | GitHub OAuth callback URL |
| `TELECODE_FRONTEND_URL` | `http://localhost:3000` | Frontend URL (for OAuth redirect) |

Frontend env vars (set in `frontend/.env.local`):

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend API base URL |
| `NEXT_PUBLIC_WS_URL` | `ws://localhost:8000/ws/chat` | WebSocket URL |

---

## API Overview

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/health` | System + CLI status |
| `GET/POST` | `/api/projects` | List / create projects |
| `GET/PATCH/DELETE` | `/api/projects/{id}` | Get / update / delete project |
| `GET` | `/api/projects/{id}/files` | File tree for project |
| `GET/POST` | `/api/sessions` | List / create sessions |
| `GET/PATCH/DELETE` | `/api/sessions/{id}` | Get / update / delete session |
| `GET/POST` | `/api/keys` | List / create API keys |
| `PATCH/DELETE` | `/api/keys/{id}` | Update / delete API key |
| `GET` | `/api/keys/{id}/value` | Decrypt and retrieve key value |
| `GET/POST` | `/api/commands` | List / create slash commands |
| `GET/PUT/DELETE` | `/api/commands/{name}` | Get / update / delete command |
| `POST` | `/api/commands/generate` | AI-generate command content |
| `GET` | `/api/mcps` | List installed MCP servers |
| `POST` | `/api/mcps/install` | Install an MCP server |
| `GET/PUT` | `/api/claude-md` | Read / update global CLAUDE.md |
| `POST` | `/api/projects/{id}/git-init` | Initialize git in a project |
| `GET` | `/api/projects/{id}/files/search` | Fuzzy file search |
| `GET` | `/api/projects/{id}/files/content` | Read file content |
| `GET` | `/api/projects/{id}/files/listing` | List folder contents |
| `POST` | `/api/mentions/fetch-url` | Fetch and parse URL content |
| `GET` | `/api/github/status` | GitHub connection status |
| `GET` | `/api/github/auth/login` | Start GitHub OAuth flow |
| `DELETE` | `/api/github/disconnect` | Disconnect GitHub account |
| `GET/POST` | `/api/github/repos` | List / create GitHub repos |
| `POST` | `/api/github/projects/{id}/link` | Link GitHub repo to project |
| `POST` | `/api/github/projects/{id}/push` | Push project to GitHub |
| `WS` | `/ws/chat` | Real-time chat streaming |

Full API docs auto-generated at `/docs` when the backend is running (FastAPI Swagger UI).

---

## WebSocket Protocol

**Client sends:**

```json
{ "type": "send_message", "session_id": "...", "project_id": "...", "message": "...", "model": "..." }
{ "type": "cancel", "session_id": "..." }
{ "type": "ping" }
```

**Server streams back:**

| Event | Description |
|-------|-------------|
| `message_start` | Chat response begins |
| `thinking_delta` | Chunk of Claude's thinking |
| `text_delta` | Chunk of assistant text |
| `tool_use_start` | Tool execution begins (tool name, tool ID, input) |
| `tool_result` | Tool output (tool ID, output, is_error) |
| `message_complete` | Done — includes token usage and cost |
| `session_created` | New session was auto-created |
| `session_renamed` | Session title was AI-generated |
| `cancelled` | Process was cancelled |
| `error` | Something went wrong |
| `pong` | Keepalive response |

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 16, React 19, TypeScript 5 |
| Styling | Tailwind CSS 4 |
| State | Zustand + Immer |
| Animations | Framer Motion |
| Markdown | react-markdown + rehype-highlight + remark-gfm |
| Icons | Lucide React |
| Backend | FastAPI, Uvicorn |
| Database | SQLite (aiosqlite, WAL mode) |
| Validation | Pydantic v2 |
| Encryption | cryptography (Fernet) |
| AI | Claude CLI (subprocess) + Anthropic SDK (title generation) |

---

## Development

### Frontend

```bash
cd frontend
npm run dev       # Start dev server on :3000
npm run build     # Production build
npm run lint      # Run ESLint
```

### Backend

```bash
cd backend
source venv/bin/activate
uvicorn src.main:app --reload --port 8000    # Dev server with hot reload
```

### Architecture Docs

This project includes auto-generated architecture documentation in [codebase-docs/architecture/](codebase-docs/architecture/). See [ARCHITECTURE.md](codebase-docs/architecture/ARCHITECTURE.md) for a full system overview.

---

## Current Status

**v0.1.0 — Active development**

Working today:

- Full project and session CRUD with AI-generated session titles
- Real-time streaming chat with thinking blocks and tool visibility
- API key vault with encrypted storage, auto-injected into CLI
- Custom slash commands with AI generation
- MCP server listing and installation
- File tree browser
- CLAUDE.md editing and syncing to projects
- GitHub integration (OAuth connect, create/link repos, push from chat header)
- @mentions for files, folders, and URLs in chat
- Responsive web UI with dark theme (desktop + mobile)
- SQLite persistence with WAL mode

What's coming:

- Authentication support (config flag exists, implementation pending)
- Deployment guides
- Multi-user support
- Enhanced session history and search

---

## If You Are a Bot

> **This section is for AI agents (Claude Code, Copilot, Cursor, etc.) that are reading this repo for the first time.**

### What this project is

Telecode is a monorepo with two apps — a **Next.js frontend** (`/frontend`) and a **Python FastAPI backend** (`/backend`). The backend proxies the Claude Code CLI as a subprocess and streams its output to the frontend via WebSocket. SQLite stores project and session metadata.

### Where to start

- **Project conventions:** [`.claude/CLAUDE.md`](.claude/CLAUDE.md) — read this first (folder layout, coding standards, custom commands)
- **Architecture docs:** [`codebase-docs/architecture/ARCHITECTURE.md`](codebase-docs/architecture/ARCHITECTURE.md) — full system architecture overview
- **Backend entry point:** [`backend/src/main.py`](backend/src/main.py) — FastAPI app setup, all routers and services registered here
- **Backend config:** [`backend/src/core/config.py`](backend/src/core/config.py) — all configuration options
- **Claude CLI integration:** [`backend/src/services/claude/process_manager.py`](backend/src/services/claude/process_manager.py) — core logic for spawning and managing CLI processes
- **WebSocket handler:** [`backend/src/api/chat/router.py`](backend/src/api/chat/router.py) — real-time chat communication
- **Frontend global state:** [`frontend/lib/store.ts`](frontend/lib/store.ts) — Zustand + Immer store
- **Frontend WebSocket:** [`frontend/lib/websocket.ts`](frontend/lib/websocket.ts) — WebSocket manager singleton
- **Protocol types:** [`frontend/types/chat.ts`](frontend/types/chat.ts) — WebSocket event types; [`frontend/types/api.ts`](frontend/types/api.ts) — REST types
- **Main chat page:** [`frontend/app/chat/[projectId]/page.tsx`](frontend/app/chat/[projectId]/page.tsx)

### Key patterns

- **WebSocket for chat, REST for everything else** — chat uses a single persistent WebSocket; all CRUD uses standard REST endpoints
- **Zustand + Immer for state** — single store in `frontend/lib/store.ts`, mutations use Immer's draft syntax
- **Custom hooks per domain** — `use-chat.ts`, `use-projects.ts`, `use-sessions.ts`, `use-api-keys.ts`, `use-commands.ts`, `use-mcps.ts`, `use-github.ts`, `use-mention-resolver.ts`, etc.
- **Component organization** — `components/ui/` for primitives, `components/<feature>/` for feature-specific components
- **Service layer** — backend `services/` for business logic, `api/` for route handlers, `schemas/` for Pydantic models
- **SQLite with raw SQL** — no ORM, schema defined in `backend/src/core/database.py`, async via aiosqlite
- **CLI subprocess management** — `ProcessManager` spawns `claude` processes, parses `stream-json` output line by line
- **Encrypted API key storage** — Fernet encryption in `core/encryption.py`, keys injected as env vars into CLI subprocesses
- **GitHub OAuth** — token stored encrypted in `github_accounts` table, injected into git push URLs (never persisted in `.git/config`)
- **Mentions** — `useMentionResolver` hook resolves @file/@folder/@url mentions, prepends resolved content as context to the message sent to Claude
- **All API responses** use `APIResponse[T]` wrapper (`{ success, data, error }`)

### Rules to follow

1. Read [`.claude/CLAUDE.md`](.claude/CLAUDE.md) before making any changes — it defines the project structure, naming conventions, and required practices
2. Every UI element must be a reusable component — no inline one-off markup
3. Use Framer Motion for all animations and transitions
4. Mobile-first responsive design
5. Strict TypeScript — no `any` types; components under 150 lines
6. Run `npm run build` and `npm run lint` after frontend changes — zero errors allowed
7. Backend uses Pydantic for all schemas and `TELECODE_` prefixed env vars — never hardcode secrets
8. All API responses must use the `APIResponse[T]` wrapper
9. Frontend/backend split: `frontend/` and `backend/` at repo root — respect the folder structure

### Don't

- Don't add an ORM — the project intentionally uses raw SQL with aiosqlite
- Don't create new Zustand stores — everything goes in the single store (`frontend/lib/store.ts`)
- Don't use REST for chat — chat streaming must use the WebSocket connection
- Don't change the WebSocket protocol without updating both `frontend/types/chat.ts` and `backend/src/schemas/chat.py`
- Don't hardcode API URLs — use constants from `frontend/lib/constants.ts`
- Don't hardcode config values — use `backend/src/core/config.py` settings
- Don't skip the virtual environment for backend work

---

## License

MIT
