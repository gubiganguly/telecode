# /api-docs Command

You are an expert API documentation writer. Your job is to analyze this codebase and produce clear, comprehensive API reference documentation in `/codebase-docs/api/`.

## Arguments Received

`$ARGUMENTS`

## Determine Mode

Parse the arguments to determine the mode:

1. **`--full`** → Full scan mode (forced full analysis regardless of existing docs)
2. **`<route-group>`** (any non-flag argument like `auth`, `users`, `payments`, etc.) → Document a specific API group only
3. **No arguments / empty** → Smart incremental mode (default)

---

## Mode: Full Scan (`--full` or first-ever run)

Perform a comprehensive scan of all API endpoints. This mode is used when:
- The `--full` flag is passed
- No `API_REFERENCE.md` exists yet in `/codebase-docs/api/` (first run)
- The API surface has changed significantly

### Steps

1. **Scan for all API definitions** across the codebase:

   **Next.js API Routes (Frontend):**
   - Glob for `frontend/app/api/**/route.ts` and `frontend/app/api/**/route.tsx`
   - Read each route file to extract: HTTP methods, request/response types, middleware, auth requirements

   **FastAPI Routes (Backend):**
   - Glob for `backend/src/api/**/*.py`
   - Read each route file to extract: endpoints, methods, path params, query params, request/response schemas
   - Grep for `@app.get`, `@app.post`, `@app.put`, `@app.patch`, `@app.delete`, `@router.get`, etc.
   - Find and read Pydantic schemas in `backend/src/schemas/`

   **Also check for:**
   - OpenAPI/Swagger configs
   - API middleware (rate limiting, CORS, auth guards)
   - Shared types/interfaces used in API contracts (`frontend/types/`, `backend/src/schemas/`)
   - Environment variables related to API config (base URLs, API keys)

2. **Read supporting files:**
   - Auth middleware and guards
   - Error handling utilities
   - Request validation logic
   - API client setup on the frontend (axios/fetch wrappers in `frontend/lib/`)

3. **Write `/codebase-docs/api/API_REFERENCE.md`** with this structure:

```markdown
# API Reference

> Auto-generated API documentation. Last updated: [DATE]
>
> Complete reference for all API endpoints in the system.

## Base URLs

| Environment | Frontend API | Backend API |
|-------------|-------------|-------------|
| Development | `http://localhost:3000/api` | `http://localhost:8000` |
| Production | `[TODO]` | `[TODO]` |

## Authentication

[How API auth works — tokens, sessions, headers required, refresh flow]

## Common Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | Conditional | `Bearer <token>` for protected routes |
| `Content-Type` | Yes | `application/json` |

## Error Format

[Standard error response shape used across all endpoints]

```json
{
  "error": "string",
  "message": "string",
  "status": 000
}
```

## Rate Limiting

[If applicable — limits, headers, retry behavior]

---

## Endpoints

### [Group Name] (e.g., Authentication, Users, Products)

#### `METHOD /path/to/endpoint`

[One-line description]

**Auth:** Required / Public
**Source:** `path/to/route/file`

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `id` | `string` | ... |

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | `number` | `1` | ... |

**Request Body:**
```json
{
  "field": "type — description"
}
```

**Response `200`:**
```json
{
  "field": "type — description"
}
```

**Response `4xx/5xx`:**
```json
{
  "error": "description"
}
```

---

[Repeat for each endpoint, grouped logically]
```

4. **For each logical API group, also create** `/codebase-docs/api/<group-name>.md` with the full detailed docs for that group. The main `API_REFERENCE.md` should contain a summary table with links to these detail files.

5. **Write a summary table** at the top of `API_REFERENCE.md`:

```markdown
## Endpoint Summary

| Method | Endpoint | Auth | Description | Details |
|--------|----------|------|-------------|---------|
| `GET` | `/api/users` | Yes | List all users | [users.md](./users.md) |
| `POST` | `/api/auth/login` | No | User login | [auth.md](./auth.md) |
```

6. **Generate metadata** at `/codebase-docs/api/.api-meta.json`:
```json
{
  "last_full_scan": "ISO-DATE",
  "last_updated": "ISO-DATE",
  "scan_type": "full",
  "git_hash": "COMMIT_HASH or null",
  "total_endpoints": 0,
  "groups_documented": []
}
```

---

## Mode: Smart Incremental (no arguments, default)

Token-efficient mode that only updates what changed.

### Steps

1. **Read existing** `/codebase-docs/api/API_REFERENCE.md` and `/codebase-docs/api/.api-meta.json`

2. **Check what changed** since the last scan:
   - Run `git diff --stat <last-git-hash>..HEAD` (using hash from meta) to see changed files
   - Filter to only API-relevant changes:
     - `frontend/app/api/**`
     - `backend/src/api/**`
     - `backend/src/schemas/**`
     - `frontend/types/**`
     - Auth/middleware files
   - Run `git log --oneline <last-git-hash>..HEAD` for context on what was done

3. **If no API-relevant files changed** → Report "API docs are up to date" and exit

4. **If API-relevant files changed:**
   - Read only the changed API route files and their associated schemas
   - Determine if endpoints were added, modified, or removed
   - **Added endpoints:** Add new entries to the summary table and the relevant group doc
   - **Modified endpoints:** Update the affected entries (request/response shapes, auth, params)
   - **Removed endpoints:** Remove from the summary table and group doc, note as deprecated if uncertain
   - Use the Edit tool for targeted updates — do NOT rewrite entire files

5. **Update `.api-meta.json`** with new timestamp, git hash, and endpoint count

---

## Mode: Route Group (`/api-docs <group-name>`)

Documents or re-documents a specific API group.

### Steps

1. **Read existing** `API_REFERENCE.md` and `.api-meta.json` for context

2. **Search for all endpoints related to this group:**
   - Grep for the group name in API route directories
   - Look for matching directory names (e.g., `frontend/app/api/auth/`, `backend/src/api/auth/`)
   - Find related schemas, middleware, and types

3. **Read all relevant files** for this API group

4. **Write or update `/codebase-docs/api/<group-name>.md`** with full details:

```markdown
# API: [Group Name]

> API documentation for the [group-name] endpoints. Last updated: [DATE]

## Overview
[What this API group handles]

## Endpoints

### `METHOD /path`

[Full endpoint documentation as defined in the full scan format above]

## Schemas

### RequestSchemaName
```json
{ "field": "type" }
```

### ResponseSchemaName
```json
{ "field": "type" }
```

## Error Codes
[Group-specific error codes and their meanings]

## Frontend Usage
[How the frontend calls these endpoints — relevant hooks, API client calls, components]

## Related Files
| File | Purpose |
|------|---------|
| `path/to/file` | Description |
```

5. **Update the summary table** in `API_REFERENCE.md` to include/update entries for this group

6. **Update `.api-meta.json`** — add group to `groups_documented`

---

## Documentation Guidelines

- Be **precise with types** — use actual TypeScript/Pydantic types from the codebase, not vague descriptions
- Include **actual example payloads** derived from the code, not hypothetical ones
- Document **all status codes** each endpoint can return, not just the happy path
- Note **required vs optional** fields explicitly
- Include the **source file path** for every endpoint so developers can jump to the code
- If auth is required, specify **what role/permission** is needed (not just "auth required")
- Document **query parameter defaults** and validation constraints (min, max, regex patterns)
- If an endpoint has **pagination**, document the pagination pattern clearly
- Keep the tone **direct and technical** — this is a reference doc, not a tutorial
