# /readme Command

You are an expert technical writer. Your job is to create or update the project's `README.md` at the repository root — the single most important file for anyone (human or AI) encountering this project for the first time.

## Arguments Received

`$ARGUMENTS`

## Determine Mode

Parse the arguments to determine the mode:

1. **`--full`** → Force a complete rewrite from scratch (ignore existing README)
2. **No arguments / empty** → Smart mode (create if missing, update if exists)

---

## Mode: Smart Create/Update (default, no arguments)

### If no `README.md` exists → Create from scratch

Follow the **Full Creation** steps below.

### If `README.md` already exists → Incremental Update

1. **Read the existing `README.md`** in full

2. **Check what changed** since the README was last accurate:
   - Run `git diff --stat HEAD~20` to see recently changed files
   - Run `git log --oneline -20` to understand recent work
   - Scan for new directories, deleted files, renamed modules, added dependencies
   - Check `package.json` and `requirements.txt` for dependency changes
   - Look for new API endpoints, new pages/routes, new components, config changes

3. **Compare the README against reality:**
   - Are the setup instructions still correct?
   - Do the listed features match what's actually implemented?
   - Is the project structure section still accurate?
   - Are there new environment variables or config options?
   - Has the tech stack changed?
   - Is the API overview still complete?
   - Is the "If You Are a Bot" section still accurate with current patterns and key files?

4. **Update only the sections that are out of date** — use the Edit tool for targeted changes, don't rewrite the whole file unless more than half is stale

5. **If major structural changes happened** (new app modules, framework migration, significant new features), add or rewrite the relevant sections entirely

---

## Mode: Full Creation (`--full` or first-ever run)

Perform a comprehensive codebase analysis and write the README from scratch.

### Steps

1. **Scan the entire codebase** to understand:
   - Project purpose (infer from code, config files, CLAUDE.md, any existing docs)
   - Tech stack (frameworks, languages, key libraries)
   - Project structure (monorepo layout, directory organization)
   - How to install and run (package managers, build tools, servers)
   - Configuration (env vars, config files, feature flags)
   - API surface (endpoints, WebSocket protocols, CLI commands)
   - Key architectural patterns (state management, data flow, auth)

2. **Read key files:**
   - `CLAUDE.md` / `.claude/CLAUDE.md` for project conventions
   - `package.json`, `requirements.txt` for dependencies
   - Entry points (main app files, server files)
   - Config files for environment variables
   - Any existing docs in `/codebase-docs/` or `/docs/`

3. **Write `README.md`** at the project root following the structure below.

---

## README Structure

Every README must follow this structure. Sections can be omitted if genuinely not applicable, but the order must be preserved.

```markdown
# Project Name

**One-line description of what this project does.**

[2-3 sentence expanded description. What problem does it solve? How does it work at a high level? What makes it different?]

---

## How It Works

[Simple diagram or explanation of the core architecture. Use ASCII art, text diagrams, or bullet points. Show how the major pieces connect. Keep it understandable in 10 seconds.]

---

## Features

[Bulleted list of what the project can do. Each bullet: **bold name** — short description. Only list features that actually exist in the code, not planned features.]

---

## Quick Start

### Prerequisites

[What needs to be installed before starting — runtime versions, CLI tools, accounts]

### Installation & Setup

[Numbered steps to get from clone to running. Every command should be copy-pasteable. Include both backend and frontend if applicable.]

---

## Project Structure

[Directory tree with inline annotations. Show the major folders and what they contain. Don't list every file — show the shape of the project.]

---

## Configuration

[Table of environment variables or config options. Columns: Variable, Default, Description. Only include if the project has configuration.]

---

## API Overview

[Table of endpoints or key interfaces. Keep it high-level — link to full API docs if they exist. Only include if the project exposes an API.]

---

## Tech Stack

[Table with Layer and Technology columns. Quick reference for what's used where.]

---

## Development

[How to run in dev mode, run tests, run linters, build for production. Keep it practical — just the commands.]

---

## Current Status

[What version/stage is this project at? What works today? What's planned next? Be honest — this builds trust.]

---

## If You Are a Bot

> **This section is for AI agents (Claude Code, Copilot, Cursor, etc.) that are reading this repo for the first time.**

### What this project is
[1-2 sentences. Tech stack, architecture pattern, what it does.]

### Where to start
[Bulleted list of the most important files to read, in order. Use relative paths. Include:
- Project conventions file (CLAUDE.md or similar)
- Architecture docs if they exist
- Backend entry point
- Frontend entry point
- Core business logic files
- Type definitions / schemas]

### Key patterns
[Bulleted list of architectural patterns and conventions used in this codebase. Things like:
- State management approach
- API communication pattern
- Database access pattern
- File organization conventions
- Naming conventions]

### Rules to follow
[Numbered list of non-obvious rules. Things that would cause bugs or style violations if an AI agent didn't know them. Pull from CLAUDE.md and observed patterns.]

### Don't
[Bulleted list of anti-patterns specific to this project. Things an AI might naturally do that would be wrong here. Examples:
- Don't use an ORM (project uses raw SQL intentionally)
- Don't add barrel exports (project imports directly)
- Don't create utility files (project prefers inline helpers)]
```

---

## Writing Guidelines

- **Lead with clarity** — someone should understand what this project does within 5 seconds of reading
- **Every command must be copy-pasteable** — no placeholder paths, no "adjust as needed" unless truly variable
- **Show, don't describe** — use code blocks, tables, and diagrams instead of paragraphs
- **Be honest about status** — don't oversell what exists or hide what's missing
- **Write the "If You Are a Bot" section as if briefing a new team member** — be specific about files, patterns, and gotchas
- **Keep it scannable** — headers, bullets, tables. Minimize prose.
- **Use relative paths** from the project root for all file references
- **Don't include planned/future features as if they exist** — put them in "Current Status" under what's coming
- **No fluff, no badges wall, no unnecessary shields.io links** — substance over decoration
