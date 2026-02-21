# /architecture Command

You are an expert software architect. Your job is to analyze this codebase and produce clear, comprehensive architecture documentation in `/codebase-docs/architecture/`.

## Arguments Received

`$ARGUMENTS`

## Determine Mode

Parse the arguments to determine the mode:

1. **`--full`** → Full deep scan mode (forced full analysis regardless of existing docs)
2. **`<feature-name>`** (any non-flag argument like `authentication`, `payments`, etc.) → Feature-specific mode
3. **No arguments / empty** → Smart incremental mode (default)

---

## Mode: Full Deep Scan (`--full` or first-ever run)

Perform a comprehensive codebase analysis. This mode is used when:
- The `--full` flag is passed
- No `ARCHITECTURE.md` exists yet in `/codebase-docs/architecture/` (first run)
- The codebase has undergone massive structural changes

### Steps

1. **Scan the entire codebase** using Glob and Grep to understand:
   - Project structure (monorepo layout, frontend/backend split)
   - Frontend: framework, routing, components, state management, styling, API client setup
   - Backend: framework, API routes, services, database/ORM, auth, middleware
   - Shared: types, contracts, environment config
   - Infrastructure: Docker, CI/CD, deployment configs, cloud services
   - External integrations: third-party APIs, services, SDKs

2. **Read key files** to understand how systems connect:
   - Entry points (`app/layout.tsx`, `app/page.tsx`, `main.py`, etc.)
   - API route definitions (both Next.js API routes and backend routes)
   - Service layers and business logic
   - Database models/schemas
   - Configuration files (`package.json`, `requirements.txt`, `docker-compose.yml`, `.env.example`, etc.)
   - Middleware, auth flows, and shared utilities

3. **Write `/codebase-docs/architecture/ARCHITECTURE.md`** with the following structure:

```markdown
# Project Architecture

> Auto-generated architecture overview. Last updated: [DATE]
>
> Entry point for developers and AI coding agents to understand the full system.

## System Overview
[High-level description of what the project does and how it's structured]

## Tech Stack
| Layer | Technology |
|-------|-----------|
| Frontend | ... |
| Backend | ... |
| Database | ... |
| Deployment | ... |

## Project Structure
[Directory tree with annotations explaining what each major folder/file does]

## Architecture Diagram (Text)
[ASCII or text-based diagram showing how frontend, backend, database, external services connect]

## Frontend Architecture
### Routing & Pages
### Components
### State Management
### API Client / Data Fetching
### Styling

## Backend Architecture
### API Layer
### Service Layer
### Data Layer (Database, ORM, Models)
### Authentication & Authorization
### Middleware

## API Contract
[How frontend and backend communicate — REST/GraphQL endpoints, request/response shapes]

## Infrastructure & Deployment
[Docker, CI/CD, hosting, environment configuration]

## Key Flows
[Step-by-step walkthroughs of critical user flows like auth, checkout, etc.]

## Feature Modules
[Links to feature-specific architecture docs if they exist]
| Feature | Doc |
|---------|-----|
| ... | [link](./feature-name.md) |
```

4. **Generate a metadata file** at `/codebase-docs/architecture/.architecture-meta.json`:
```json
{
  "last_full_scan": "ISO-DATE",
  "last_updated": "ISO-DATE",
  "scan_type": "full",
  "git_hash": "COMMIT_HASH or null",
  "features_documented": []
}
```

---

## Mode: Smart Incremental (no arguments, default)

This mode is token-efficient. It avoids re-reading the entire codebase when only small changes have been made.

### Steps

1. **Read the existing** `/codebase-docs/architecture/ARCHITECTURE.md` and `/codebase-docs/architecture/.architecture-meta.json`

2. **Check what changed** since the last scan:
   - Run `git diff --stat HEAD~10` (or since the last documented commit hash from meta) to see which files changed
   - Run `git log --oneline -20` to understand recent work
   - Categorize changes: Are they in frontend, backend, infra, a specific feature?

3. **Assess change magnitude:**
   - **Small changes** (< 10 files, localized to one area): Read only the changed files and the relevant sections of ARCHITECTURE.md. Surgically update the affected sections.
   - **Medium changes** (10-30 files, spanning multiple areas): Read changed files plus their surrounding context (imports, dependents). Update multiple sections.
   - **Large/structural changes** (> 30 files, new directories, framework changes, major refactors): Automatically escalate to a full deep scan.

4. **Update ARCHITECTURE.md** by editing only the sections that need changes. Do NOT rewrite the entire file — use the Edit tool to make targeted updates.

5. **Update `.architecture-meta.json`** with the new timestamp, git hash, and scan type.

---

## Mode: Feature-Specific (`/architecture <feature-name>`)

Creates a dedicated architecture doc for a specific feature.

### Steps

1. **Read existing** `ARCHITECTURE.md` and `.architecture-meta.json` for overall context

2. **Search the codebase** for all code related to the feature:
   - Use Grep to find references to the feature name, related keywords, and patterns
   - Use Glob to find feature-specific directories or files
   - Look in both frontend and backend

3. **Read all relevant files** for the feature — routes, components, services, schemas, tests, migrations

4. **Write `/codebase-docs/architecture/<feature-name>.md`** with:

```markdown
# Feature: [Feature Name]

> Architecture doc for the [feature-name] feature. Last updated: [DATE]

## Overview
[What this feature does, why it exists]

## Scope
[Which parts of the codebase this feature touches]

## Frontend
### Routes / Pages
### Components
### State / Hooks
### API Calls

## Backend
### API Endpoints
### Service Logic
### Database / Models
### Auth / Permissions

## Data Flow
[Step-by-step flow: User action → Frontend → API → Backend → Database → Response]

## Key Files
| File | Purpose |
|------|---------|
| `path/to/file` | Description |

## Dependencies
[What this feature depends on and what depends on it]

## Edge Cases & Error Handling
[Notable error scenarios and how they're handled]
```

5. **Update the "Feature Modules" section** in `ARCHITECTURE.md` to link to this new doc

6. **Update `.architecture-meta.json`** — add the feature name to `features_documented`

---

## Writing Guidelines

- Write for **both humans and AI agents** — be precise, use file paths, be explicit about connections
- Use **relative paths** from the project root
- Include **actual code patterns** (short snippets) where they clarify architecture, not just descriptions
- Keep language **direct and technical** — no fluff, no marketing speak
- Use **tables and lists** over paragraphs where possible
- Every section should answer: **What is it? Where is it? How does it connect to other parts?**
- If something is missing or unclear in the codebase, note it as `[TODO: ...]` rather than guessing
