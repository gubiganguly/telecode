"use client";

import { motion } from "framer-motion";

const sectionAnim = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.2 },
};

function Section({ children }: { children: React.ReactNode }) {
  return (
    <motion.div {...sectionAnim} className="max-w-3xl mx-auto w-full px-6 py-6">
      {children}
    </motion.div>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-semibold text-text-primary mb-4">{children}</h2>;
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-text-primary mt-6 mb-2">{children}</h3>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-text-secondary leading-relaxed mb-3">{children}</p>;
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="text-xs font-mono bg-bg-tertiary text-accent px-1.5 py-0.5 rounded">
      {children}
    </code>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="text-xs font-mono bg-bg-tertiary text-text-secondary rounded-lg p-3 mb-3 overflow-x-auto">
      {children}
    </pre>
  );
}

function Li({ children }: { children: React.ReactNode }) {
  return <li className="text-sm text-text-secondary leading-relaxed">{children}</li>;
}

function Ul({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc list-inside space-y-1.5 mb-3 ml-1">{children}</ul>;
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-accent/5 border border-accent/20 p-3 mb-3">
      <p className="text-sm text-text-secondary leading-relaxed">{children}</p>
    </div>
  );
}

// ------------------------------------------------------------------
// Sections
// ------------------------------------------------------------------

export function OverviewSection() {
  return (
    <Section>
      <H2>What is CasperBot?</H2>
      <P>
        CasperBot is a web-based remote control for Claude Code. It wraps the
        Claude Code CLI in a FastAPI backend and exposes it through a Next.js
        frontend, letting you control Claude Code from any device — phone,
        tablet, or laptop — over the internet.
      </P>
      <P>
        The vision is a platform where you can brainstorm ideas and quickly
        turn them into real, working MVPs — all from the browser.
      </P>

      <H3>Key Features</H3>
      <Ul>
        <Li>Chat with Claude across multiple projects and sessions</Li>
        <Li>Switch models (Opus, Sonnet, Haiku) per message</Li>
        <Li>@mention files, folders, and URLs to attach context</Li>
        <Li>Custom slash commands stored as .md files</Li>
        <Li>Speech-to-text input via your browser&apos;s microphone</Li>
        <Li>Full message persistence — pick up where you left off</Li>
        <Li>File tree browser to explore your project from the sidebar</Li>
        <Li>Credential management with encrypted storage</Li>
        <Li>MCP server management — install and configure plugins</Li>
        <Li>GitHub integration — create repos, push code</Li>
        <Li>CLAUDE.md editor — customize Claude&apos;s behavior globally or per-project</Li>
        <Li>Auto-restart watchdog — if anything crashes, it recovers in ~5 seconds</Li>
      </Ul>

      <H3>How it Runs</H3>
      <P>
        CasperBot is single-user and self-hosted on a Mac. It&apos;s exposed to the
        internet via a Cloudflare Tunnel and protected by JWT authentication.
        The flow looks like:
      </P>
      <CodeBlock>{`Browser → WebSocket → FastAPI backend → spawns "claude -p" → output streams back to the browser`}</CodeBlock>
      <P>
        Each message you send spawns a new <Code>claude -p</Code> subprocess.
        Your conversation history is managed via <Code>--session-id</Code> and <Code>--resume</Code>,
        so Claude remembers context across messages.
      </P>
    </Section>
  );
}

export function ProjectsSection() {
  return (
    <Section>
      <H2>Projects</H2>
      <P>
        Projects are the top-level organizational unit. Each project gets its own
        directory, git repo, chat sessions, and settings.
      </P>

      <H3>Creating a Project</H3>
      <P>
        When you create a new project, CasperBot:
      </P>
      <Ul>
        <Li>
          Creates a folder at <Code>~/Claude Code Projects/&lt;project-name&gt;/</Code>
        </Li>
        <Li>
          Optionally copies the <Code>.claude/</Code> template folder into it —
          this includes the global CLAUDE.md and any custom slash commands
        </Li>
        <Li>Runs <Code>git init</Code> to initialize a git repository</Li>
        <Li>Registers the project in the database</Li>
      </Ul>

      <H3>Import Global Template</H3>
      <P>
        The create project dialog has an <strong>&quot;Import global template&quot;</strong> checkbox
        (enabled by default). This controls whether the project starts with a copy
        of your global settings:
      </P>
      <Ul>
        <Li>
          <strong>Checked (default):</strong> copies your global CLAUDE.md and slash
          commands from the template folder into the project&apos;s <Code>.claude/</Code> directory
        </Li>
        <Li>
          <strong>Unchecked:</strong> creates a bare <Code>.claude/</Code> directory with an
          empty CLAUDE.md — the project starts fresh with no inherited settings
        </Li>
      </Ul>
      <P>
        Either way, the project gets its own <Code>.claude/</Code> folder, so you
        can always customize the CLAUDE.md and commands later via Project Settings.
      </P>
      <Callout>
        The template folder lives at <Code>~/Claude Code Projects/.templates/.claude/</Code>.
        It contains the global CLAUDE.md and the <Code>commands/</Code> folder.
        When &quot;Import global template&quot; is checked, this entire folder is copied as
        the project&apos;s starting point.
      </Callout>

      <H3>The CasperBot System Project</H3>
      <P>
        There&apos;s a special pinned project called &quot;CasperBot&quot; that points to
        CasperBot&apos;s own source code. This is what makes CasperBot self-referential
        — you can use CasperBot to develop CasperBot.
      </P>

      <H3>Auto-Discovery</H3>
      <P>
        If you manually create a folder inside <Code>~/Claude Code Projects/</Code>,
        CasperBot will automatically detect it and register it as a project the
        next time you visit the projects page.
      </P>
    </Section>
  );
}

export function ClaudeMdSection() {
  return (
    <Section>
      <H2>CLAUDE.md</H2>
      <P>
        CLAUDE.md is a markdown file that contains instructions for Claude. Think
        of it as a persistent system prompt — Claude reads it at the start of
        every conversation and follows the rules you write there.
      </P>

      <H3>Two Levels: Global and Project</H3>
      <P>
        There are two levels of CLAUDE.md:
      </P>
      <Ul>
        <Li>
          <strong>Global CLAUDE.md</strong> — edited in Settings &gt; CLAUDE.md.
          This is the template that gets copied to every new project.
        </Li>
        <Li>
          <strong>Project CLAUDE.md</strong> — edited in Project Settings &gt; CLAUDE.md
          (gear icon in the chat sidebar). Unique to that project.
        </Li>
      </Ul>

      <H3>How the Sync Works</H3>
      <CodeBlock>{`Global template: ~/.templates/.claude/CLAUDE.md
                        ↓ (copied on project creation)
Project copy:   ~/Claude Code Projects/<name>/.claude/CLAUDE.md`}</CodeBlock>
      <Ul>
        <Li>
          When you <strong>create a new project</strong>, the global template
          is copied into the project&apos;s <Code>.claude/</Code> folder.
        </Li>
        <Li>
          When you <strong>edit the global CLAUDE.md</strong> (Settings), it
          saves to the template <em>and</em> overwrites the CLAUDE.md in every
          existing project.
        </Li>
        <Li>
          When you <strong>edit a project&apos;s CLAUDE.md</strong> (Project Settings),
          it only changes that project&apos;s copy — the global template is not
          affected.
        </Li>
      </Ul>

      <Callout>
        Be aware: if you customize a project&apos;s CLAUDE.md and then edit the
        global one, the global save will overwrite your project customizations.
        If you need project-specific instructions that persist, consider adding
        them after saving the global version.
      </Callout>

      <H3>What to Put in CLAUDE.md</H3>
      <Ul>
        <Li>Coding conventions and style preferences</Li>
        <Li>Project structure guidelines</Li>
        <Li>Technology stack preferences</Li>
        <Li>Custom slash command documentation</Li>
        <Li>Testing and deployment instructions</Li>
        <Li>Any rules Claude should always follow</Li>
      </Ul>
    </Section>
  );
}

export function CommandsSection() {
  return (
    <Section>
      <H2>Slash Commands</H2>
      <P>
        Slash commands are shortcuts that expand into full prompts for Claude.
        Instead of typing a long instruction, you type <Code>/commit</Code> or <Code>/review</Code> and
        Claude knows exactly what to do.
      </P>

      <H3>Built-in Commands</H3>
      <P>CasperBot comes with several built-in commands:</P>
      <Ul>
        <Li><Code>/commit</Code> — create a git commit with a descriptive message</Li>
        <Li><Code>/review</Code> — review uncommitted changes for bugs and improvements</Li>
        <Li><Code>/test</Code> — run the test suite and analyze failures</Li>
        <Li><Code>/fix</Code> — find and fix lint errors, type errors, and test failures</Li>
        <Li><Code>/build</Code> — run the build command and fix errors</Li>
        <Li><Code>/lint</Code> — run the linter and fix issues</Li>
        <Li><Code>/refactor</Code> — suggest refactoring improvements</Li>
        <Li><Code>/docs</Code> — generate or update documentation</Li>
        <Li><Code>/git-status</Code> — summarize the current git state</Li>
      </Ul>

      <H3>Custom Commands</H3>
      <P>
        You can create your own commands in Settings &gt; Slash Commands. Each
        command is a <Code>.md</Code> file containing instructions for Claude.
        Custom commands support a <Code>$ARGUMENTS</Code> placeholder that gets replaced with
        whatever the user types after the command.
      </P>

      <H3>Two Levels: Global and Project</H3>
      <Ul>
        <Li>
          <strong>Global commands</strong> (Settings) — stored in the template folder
          and synced to all projects when created or updated.
        </Li>
        <Li>
          <strong>Project commands</strong> (Project Settings) — stored in that
          project&apos;s <Code>.claude/commands/</Code> folder. You can add commands
          unique to a project, or edit synced ones to override them.
        </Li>
      </Ul>
      <P>
        You can also pass arguments: <Code>/commit fix the login bug</Code> will
        append &quot;fix the login bug&quot; as additional context.
      </P>
    </Section>
  );
}

export function McpsSection() {
  return (
    <Section>
      <H2>MCP Servers</H2>
      <P>
        MCP (Model Context Protocol) servers are plugins that extend Claude&apos;s
        capabilities. For example, the Playwright MCP lets Claude control a
        browser, and the GitHub MCP gives Claude direct access to repos and issues.
      </P>

      <H3>Global MCPs</H3>
      <P>
        In Settings &gt; Connected MCPs, you can install MCP servers using natural
        language (e.g., &quot;add the playwright mcp&quot;). These are installed at the
        user scope via <Code>claude mcp add -s user</Code> and are available
        across all projects.
      </P>

      <H3>Project MCPs</H3>
      <P>
        In Project Settings &gt; MCPs, you can see MCP servers scoped to that
        specific project. Project MCPs are configured via the Claude CLI
        with <Code>claude mcp add -s project</Code> (run from the project directory).
        They&apos;re stored in a <Code>.mcp.json</Code> file in the project root.
      </P>

      <H3>Auto-Credential Detection</H3>
      <P>
        When you install an MCP server, CasperBot automatically checks if it
        requires any credentials (API keys, tokens, etc.). If missing credentials
        are detected, you&apos;ll be prompted to enter them inline — they&apos;re saved
        directly to your global credentials so the MCP works immediately.
      </P>
      <P>
        CasperBot recognizes credentials for common MCPs including GitHub,
        Brave Search, Slack, Firebase, and Postgres. You can always skip the
        prompt and add credentials later in Settings &gt; Credentials.
      </P>

      <H3>Common MCPs</H3>
      <Ul>
        <Li><strong>Playwright</strong> — browser automation and visual testing</Li>
        <Li><strong>Context7</strong> — up-to-date library documentation</Li>
        <Li><strong>GitHub</strong> — repos, issues, and PRs</Li>
        <Li><strong>Filesystem</strong> — enhanced file operations</Li>
        <Li><strong>Firebase</strong> — Firebase project management</Li>
        <Li><strong>Brave Search</strong> — web search integration</Li>
      </Ul>
    </Section>
  );
}

export function ApprovalsSection() {
  return (
    <Section>
      <H2>Tool Approvals</H2>
      <P>
        By default, CasperBot auto-approves all tool usage — Claude can read
        files, write code, run commands, and search the web without asking for
        permission. This makes for a seamless experience.
      </P>

      <H3>Global Setting</H3>
      <P>
        In Settings &gt; Tool Approvals, you can toggle approvals on for all
        projects. When enabled, Claude will prompt you before using each tool
        (file edits, bash commands, etc.).
      </P>

      <H3>Project Override</H3>
      <P>
        In Project Settings &gt; Approvals, you can override the global setting
        for a specific project. The override logic is:
      </P>
      <Ul>
        <Li>
          <strong>Project has an explicit setting</strong> — that setting wins,
          regardless of the global default
        </Li>
        <Li>
          <strong>Project inherits (default)</strong> — uses the global setting
        </Li>
      </Ul>
      <P>
        You can reset a project back to &quot;inherit from global&quot; using the Reset
        button in project settings.
      </P>

      <H3>How It Works Technically</H3>
      <P>
        When approvals are off, CasperBot passes <Code>--allowedTools</Code> to
        the Claude CLI, pre-approving all tools. When approvals are on, this
        flag is omitted, so Claude will prompt for permission (which appears as
        a tool approval card in the chat).
      </P>
    </Section>
  );
}

export function EnvVarsSection() {
  return (
    <Section>
      <H2>Environment Variables</H2>
      <P>
        Environment variables let you inject secrets and configuration into
        Claude&apos;s subprocess. There are two levels: global credentials and
        project-specific env vars.
      </P>

      <H3>Global Credentials</H3>
      <P>
        In Settings &gt; Credentials, you store credentials that are available to
        every project. These are encrypted at rest (Fernet) and injected as
        environment variables whenever Claude runs.
      </P>

      <H3>Project Env Variables</H3>
      <P>
        In Project Settings &gt; Env Vars, you can add environment variables
        scoped to a specific project. These are useful for project-specific
        secrets like database URLs, service tokens, or credentials that only
        apply to one project.
      </P>

      <H3>Inheritance &amp; Override</H3>
      <P>
        Project env vars layer on top of global credentials:
      </P>
      <Ul>
        <Li>
          All global credentials are <strong>automatically inherited</strong> by
          every project — they appear as read-only &quot;inherited from global&quot;
          entries in the project&apos;s Env Vars tab
        </Li>
        <Li>
          If you add a project env var with the <strong>same variable name</strong> as
          a global key, the project value <strong>overrides</strong> the global one
          for that project only
        </Li>
        <Li>
          Deleting a project override restores the global value — the global
          key is inherited again
        </Li>
      </Ul>

      <H3>Credential Exclusion</H3>
      <P>
        You can exclude specific global credentials from a project using the
        toggle switches in the Env Vars tab. Excluded credentials will not be
        injected into Claude&apos;s subprocess for that project, even though they
        remain available globally.
      </P>

      <H3>How It Works at Runtime</H3>
      <CodeBlock>{`1. Load global credentials → inject as env vars
2. Remove any excluded credentials for this project
3. Load project env vars → overlay on top (project wins on conflict)
4. Spawn Claude subprocess with merged environment`}</CodeBlock>

      <Callout>
        The <Code>ANTHROPIC_API_KEY</Code> is intentionally excluded from
        Claude&apos;s environment — CasperBot uses its Claude Code subscription
        instead. Don&apos;t add it as a project env var.
      </Callout>

      <H3>Variable Naming</H3>
      <P>
        Variable names must be <Code>UPPER_SNAKE_CASE</Code> (e.g., <Code>DATABASE_URL</Code>,
        <Code>MY_API_KEY</Code>). The UI auto-uppercases as you type. Values are
        encrypted at rest and shown masked in the UI.
      </P>
    </Section>
  );
}

export function ChatSection() {
  return (
    <Section>
      <H2>Chat & Sessions</H2>
      <P>
        Each project can have multiple chat sessions. A session is a persistent
        conversation with Claude that keeps its full context.
      </P>

      <H3>Sessions</H3>
      <Ul>
        <Li>Create new sessions with the &quot;New Chat&quot; button in the sidebar</Li>
        <Li>Switch between sessions by clicking them</Li>
        <Li>Rename sessions by clicking the pencil icon</Li>
        <Li>Delete sessions you no longer need</Li>
        <Li>Sessions are grouped by date: Today, Yesterday, This Week, Older</Li>
      </Ul>

      <H3>@Mentions</H3>
      <P>
        You can attach context to your messages using @mentions. Type <Code>@</Code> in
        the chat input to search for:
      </P>
      <Ul>
        <Li><strong>Files</strong> — attaches the file content to your message</Li>
        <Li><strong>Folders</strong> — attaches a directory listing</Li>
        <Li><strong>URLs</strong> — fetches and attaches the page content</Li>
      </Ul>
      <P>
        Mentioned content is resolved server-side and injected into the prompt,
        so Claude sees the full context even though only the @label appears in
        the chat UI.
      </P>

      <H3>Model Selection</H3>
      <P>
        You can switch between Claude models on a per-message basis using the
        model selector in the chat input. Available models:
      </P>
      <Ul>
        <Li><strong>Opus</strong> — most capable, best for complex tasks</Li>
        <Li><strong>Sonnet</strong> — balanced speed and capability (default)</Li>
        <Li><strong>Haiku</strong> — fastest, great for simple tasks</Li>
      </Ul>

      <H3>Speech Input</H3>
      <P>
        Click the microphone button to use speech-to-text. Your browser&apos;s
        Web Speech API transcribes your voice into the chat input.
      </P>
    </Section>
  );
}

export function GitHubSection() {
  return (
    <Section>
      <H2>GitHub Integration</H2>
      <P>
        CasperBot can connect to your GitHub account via OAuth, letting you
        create repos, link existing repos, and push code — all from the UI.
      </P>

      <H3>Connecting</H3>
      <P>
        Go to Settings &gt; GitHub and click &quot;Connect GitHub Account&quot;. This uses
        GitHub&apos;s OAuth flow. Your access token is encrypted at rest using
        Fernet encryption.
      </P>

      <H3>What You Can Do</H3>
      <Ul>
        <Li><strong>Create repos</strong> — create new GitHub repos directly from CasperBot</Li>
        <Li><strong>Link repos</strong> — connect an existing GitHub repo to a project</Li>
        <Li><strong>Push code</strong> — push your project to GitHub with one click</Li>
      </Ul>
      <P>
        When pushing, CasperBot injects your GitHub token temporarily for that
        one push — it&apos;s never stored in the git config.
      </P>
    </Section>
  );
}

export function ArchitectureSection() {
  return (
    <Section>
      <H2>How It Works</H2>
      <P>
        CasperBot has three main components: a Next.js frontend, a FastAPI
        backend, and the Claude Code CLI running as subprocesses.
      </P>

      <H3>Frontend</H3>
      <P>
        Built with Next.js 16, React 19, TypeScript, Tailwind CSS 4, and Zustand
        for state management. Communicates with the backend via REST APIs and a
        WebSocket connection for real-time chat streaming.
      </P>

      <H3>Backend</H3>
      <P>
        Built with Python / FastAPI. Uses SQLite (via aiosqlite) for data storage
        with WAL mode for performance. Handles:
      </P>
      <Ul>
        <Li>Project, session, and message management</Li>
        <Li>Spawning and managing Claude CLI subprocesses</Li>
        <Li>NDJSON stream parsing (Claude&apos;s output → UI events)</Li>
        <Li>Credential encryption (Fernet) and injection</Li>
        <Li>JWT authentication</Li>
        <Li>WebSocket bidirectional communication</Li>
      </Ul>

      <H3>Claude CLI Integration</H3>
      <P>
        Each message spawns a <Code>claude -p</Code> subprocess with flags like:
      </P>
      <CodeBlock>{`claude -p "<your message>" \\
  --output-format stream-json \\
  --session-id <id> \\
  --model sonnet \\
  --allowedTools Read Write Edit Bash(*) ...`}</CodeBlock>
      <P>
        The subprocess output is NDJSON (one JSON object per line) which the
        backend parses and forwards to the browser via WebSocket in real time.
      </P>

      <H3>Infrastructure</H3>
      <Ul>
        <Li>
          <strong>Cloudflare Tunnel</strong> — exposes the local app to the internet
          without opening ports
        </Li>
        <Li>
          <strong>Process watchdog</strong> — a shell script that health-checks every
          5 seconds and auto-restarts crashed components
        </Li>
        <Li>
          <strong>launchd service</strong> — macOS service that keeps CasperBot running
          and starts it on boot
        </Li>
      </Ul>

      <H3>Self-Referential Nature</H3>
      <Callout>
        CasperBot can modify itself. The &quot;CasperBot&quot; system project points to
        the app&apos;s own source code. When you chat in that project, Claude is
        literally editing the code that&apos;s running your session. Changes to the
        backend or frontend take effect on the next message or after a restart.
      </Callout>
    </Section>
  );
}
