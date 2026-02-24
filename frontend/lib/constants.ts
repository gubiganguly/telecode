import type { SlashCommand } from "@/types/chat";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "";

export const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000/ws/chat";

export const SLASH_COMMANDS: SlashCommand[] = [
  { command: "/commit", label: "Commit", description: "Stage changes and create a git commit" },
  { command: "/review", label: "Review", description: "Review uncommitted changes for issues" },
  { command: "/test", label: "Test", description: "Run the test suite and analyze failures" },
  { command: "/fix", label: "Fix", description: "Fix lint errors, type errors, and test failures" },
  { command: "/build", label: "Build", description: "Run the build and fix any errors" },
  { command: "/lint", label: "Lint", description: "Run linter and fix all issues" },
  { command: "/refactor", label: "Refactor", description: "Suggest refactoring improvements" },
  { command: "/docs", label: "Docs", description: "Generate or update documentation" },
  { command: "/git-status", label: "Git Status", description: "Summarize repository state" },
];

export const WS_RECONNECT_BASE_MS = 1000;
export const WS_RECONNECT_MAX_MS = 30000;
export const WS_PING_INTERVAL_MS = 25000;

export interface ModelOption {
  id: string;
  label: string;
  description: string;
}

export const MODELS: ModelOption[] = [
  { id: "claude-opus-4-6", label: "Opus 4.6", description: "Most capable" },
  { id: "claude-sonnet-4-6", label: "Sonnet 4.6", description: "Fast & smart" },
  { id: "claude-haiku-4-5", label: "Haiku 4.5", description: "Fastest" },
];

export const DEFAULT_MODEL = "claude-opus-4-6";

export const MOBILE_BREAKPOINT = 768;
export const SIDEBAR_WIDTH = 280;
export const MAX_MESSAGE_LENGTH = 50000;
