# CLAUDE.md — Project Rules

> Project-specific conventions. These layer on top of the global `~/.claude/CLAUDE.md`.

---

## Project Context

**CasperBot** is a web-based remote control for Claude Code. It wraps the Claude Code CLI in a FastAPI backend and exposes it through a Next.js frontend, letting the user control Claude Code from any device over the internet via casperbot.net.

**Vision:** The end goal is a platform where users can brainstorm ideas and quickly turn them into real, working MVPs — all from the browser.

**Self-referential workflow:** You are likely talking to the user through CasperBot itself (casperbot.net). The user uses CasperBot to develop CasperBot. This means:
- You are a `claude -p` subprocess spawned by the backend you're editing
- Changes to the backend, frontend, or infrastructure can affect the very session you're in
- **Never kill the backend (port 8000), frontend (port 3000), or Cloudflare Tunnel processes** unless explicitly asked — doing so cuts the connection to the user mid-conversation
- **Never modify `process_manager.py` or `stream_parser.py` in ways that change how your own output is parsed** without warning the user first — this can break all future conversations
- If you need to restart services, warn the user that they may briefly lose connection (the watchdog auto-restarts within ~5s)

**Key architecture decisions:**
- **Claude CLI as subprocess** — each message spawns `claude -p --output-format stream-json`. Output is NDJSON parsed by `stream_parser.py` and forwarded via WebSocket to the browser
- **SQLite + aiosqlite** — single-user, self-hosted, no need for Postgres. WAL mode enabled
- **Fernet encryption** — API keys encrypted at rest, decrypted and injected as env vars per subprocess
- **JWT auth** — single password login, token-based sessions
- **AskUserQuestion kills the process** — when you use AskUserQuestion, the backend kills your process and sends `input_required` to the frontend. When the user answers, you're re-spawned with `--resume`
- **`ANTHROPIC_API_KEY` is excluded from your env** — intentionally blocked so Claude Code uses its subscription, not the user's personal key. Don't "fix" this

**Critical files (know before touching):**
- `backend/src/services/claude/process_manager.py` — how you are spawned and managed
- `backend/src/services/claude/stream_parser.py` — how your NDJSON output becomes UI events
- `backend/src/services/claude/system_context.py` — the system prompt injected into every conversation
- `backend/src/api/chat/router.py` — WebSocket message handling and streaming
- `backend/src/core/database.py` — SQLite schema and migrations
- `frontend/lib/store.ts` — Zustand + Immer state (projects, sessions, messages, streaming)
- `frontend/lib/websocket.ts` — WebSocket client singleton with auto-reconnect

**Tech stack:**
- Frontend: Next.js 16 + React 19 + TypeScript + Tailwind CSS 4 + Zustand 5 + Framer Motion + Tiptap (mentions editor)
- Backend: Python 3.11+ / FastAPI + SQLite (aiosqlite) + Pydantic v2
- Infra: Cloudflare Tunnel, launchd service, process watchdog (`scripts/monitor.sh`)

---

## Monorepo Structure

Every project uses a `frontend/` + `backend/` split at the repo root:

```
/frontend                      # Next.js project (TypeScript)
/backend                       # Python backend (FastAPI)
```

All paths below are relative to their respective folder.

---

## Frontend Project Structure (`/frontend`)

```
/app
  /api                         # Next.js API routes (Route Handlers)
    /route-name
      route.ts
  /page-name
    page.tsx                   # Page component
    layout.tsx                 # Optional layout for this route
    loading.tsx                # Optional loading UI
    error.tsx                  # Optional error boundary
  layout.tsx                   # Root layout
  page.tsx                     # Home page
  globals.css                  # Global styles (Tailwind directives)

/components
  /ui                          # Base reusable primitives (Button, Input, Card, Modal, etc.)
  /layout                      # Layout components (Navbar, Sidebar, Footer, PageWrapper)
  /page-name                   # Page-specific components grouped by feature

/lib                           # Shared utilities, helpers, and client configs
  utils.ts
  constants.ts

/hooks                         # Custom React hooks

/types                         # Shared TypeScript types and interfaces

/public                        # Static assets (images, fonts, icons)
```

---

## Backend Project Structure (`/backend`)

```
/requirements
  requirements.txt

/src
  /api
    /route-name
      route.py
  /services
    /service-name
      openai_service.py        # (or other LLM/service files)
  /schemas
    schema_name.py
  /core
    config.py
  /utils
    helpers.py

/venv                          # Virtual environment (gitignored)

/scripts
  /tests
    test_name.py
  /db-discovery                # If database discovery is needed
```

---

## Custom Commands

### `/architecture [args]`

Generates and maintains architecture documentation in `/codebase-docs/architecture/`.

| Usage | Description |
|-------|-------------|
| `/architecture` | Smart incremental update — reads git diff, updates only changed sections |
| `/architecture --full` | Forces a complete deep scan of the entire codebase |
| `/architecture <feature>` | Creates a feature-specific doc (e.g., `/architecture authentication`) |

Output lives in:
```
/codebase-docs/architecture/
  ARCHITECTURE.md              # Main entry point — full system overview
  .architecture-meta.json      # Tracks last scan time, git hash, scan type
  <feature-name>.md            # Feature-specific architecture docs
```

### `/test [args]`

Runs a full end-to-end visual test of the application using Playwright MCP.

| Usage | Description |
|-------|-------------|
| `/test` | Full E2E test — discovers all routes, tests every page, checks console errors, checks Next.js issue indicator, tests mobile |
| `/test <page-or-feature>` | Tests a specific page or feature (e.g., `/test dashboard`, `/test auth`) |

Automatically starts servers (frontend on 3000, backend on 8000) if not running, kills conflicting processes. Checks for the Next.js dev overlay issues indicator (bottom-left "X issues" badge) on every page — if present, clicks it to read the errors and fixes them. Generates a structured test report and auto-fixes critical issues.

---

## Visual UI Testing (Playwright MCP)

**Do NOT automatically test after UI changes.** Only run visual testing when explicitly asked (e.g., the user says "test it", "check it", or runs `/test`).

When testing is requested, follow these steps:

1. **Ensure servers are running** — if the frontend is not running on `localhost:3000` or the backend is not running on `localhost:8000`, start them:
   - Kill any existing processes on those ports first (`lsof -ti:3000 | xargs kill -9`, same for 8000)
   - Start the frontend: `cd frontend && npm run dev` (runs on port 3000)
   - Start the backend: `cd backend && source venv/bin/activate && uvicorn src.main:app --port 8000` (adjust entrypoint as needed)
2. **Open the relevant page** using Playwright MCP (`browser_navigate` to `http://localhost:3000/...`)
3. **Take a screenshot** and visually inspect the result — confirm layout, styling, and content look correct
4. **Check the browser console** for errors — use Playwright MCP to read console logs. Fix any JavaScript errors, React warnings, failed network requests, or hydration mismatches before proceeding
5. **Check the Next.js issues indicator** — look for the "X issues" badge in the bottom-left corner of the page (Next.js dev overlay). If present, click it to expand the error details, read every reported issue, and fix them all before proceeding. The page should show **zero issues**
6. **Check the terminal** running the dev server for build errors, TypeScript errors, or server-side warnings — fix any that appear
7. **Interact with the new UI** — click buttons, fill forms, test the feature end-to-end
8. **If something looks wrong** (visual issues, console errors, dev overlay issues, broken interactions), fix it and re-test before moving on

---

### `/readme [args]`

Creates or updates the project's `README.md` — the single entry point for humans and AI agents.

| Usage | Description |
|-------|-------------|
| `/readme` | Smart mode — creates README if missing, updates if it exists (checks git diff for changes) |
| `/readme --full` | Forces a complete rewrite from scratch |

Output: `README.md` at the project root. Includes a dedicated "If You Are a Bot" section for AI agents with key files, patterns, and rules.

---

### `/api-docs [args]`

Generates and maintains API reference documentation in `/codebase-docs/api/`.

| Usage | Description |
|-------|-------------|
| `/api-docs` | Smart incremental update — checks git diff for API-relevant changes only |
| `/api-docs --full` | Forces a complete scan of all API endpoints |
| `/api-docs <group>` | Documents a specific API group (e.g., `/api-docs auth`) |

Output lives in:
```
/codebase-docs/api/
  API_REFERENCE.md             # Main entry point — summary table + all endpoints
  .api-meta.json               # Tracks last scan time, git hash, endpoint count
  <group-name>.md              # Group-specific detailed docs (auth.md, users.md, etc.)
```
