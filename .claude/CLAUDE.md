# CLAUDE.md — Project Rules

> Project-specific conventions. These layer on top of the global `~/.claude/CLAUDE.md`.

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
