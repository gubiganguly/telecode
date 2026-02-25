"use client";

import Link from "next/link";
import {
  ArrowLeft,
  HelpCircle,
  Rocket,
  FolderOpen,
  FileText,
  Terminal,
  Plug,
  Key,
  Shield,
  Github,
  MessageSquare,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type HelpSection =
  | "overview"
  | "projects"
  | "claude-md"
  | "commands"
  | "mcps"
  | "env-vars"
  | "approvals"
  | "chat"
  | "github"
  | "architecture";

const SECTIONS = [
  { id: "overview" as const, label: "What is CasperBot?", icon: Rocket },
  { id: "projects" as const, label: "Projects", icon: FolderOpen },
  { id: "claude-md" as const, label: "CLAUDE.md", icon: FileText },
  { id: "commands" as const, label: "Slash Commands", icon: Terminal },
  { id: "mcps" as const, label: "MCP Servers", icon: Plug },
  { id: "env-vars" as const, label: "Env Variables", icon: Key },
  { id: "approvals" as const, label: "Tool Approvals", icon: Shield },
  { id: "chat" as const, label: "Chat & Sessions", icon: MessageSquare },
  { id: "github" as const, label: "GitHub Integration", icon: Github },
  { id: "architecture" as const, label: "How It Works", icon: Wrench },
];

interface HelpSidebarProps {
  activeSection: HelpSection;
  onSelectSection: (section: HelpSection) => void;
}

export function HelpSidebar({
  activeSection,
  onSelectSection,
}: HelpSidebarProps) {
  return (
    <div className="w-[280px] min-w-[280px] h-full border-r border-border">
      <div className="flex flex-col h-full bg-bg-secondary">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <Link
            href="/projects"
            className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            <ArrowLeft size={16} />
            Projects
          </Link>
        </div>

        {/* Title */}
        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
              <HelpCircle size={14} className="text-white" />
            </div>
            <h1 className="text-sm font-semibold text-text-primary">
              Help & Docs
            </h1>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {SECTIONS.map((section) => {
            const isActive = activeSection === section.id;
            const Icon = section.icon;

            return (
              <button
                key={section.id}
                onClick={() => onSelectSection(section.id)}
                className={cn(
                  "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left transition-colors cursor-pointer",
                  isActive
                    ? "bg-accent-muted text-accent"
                    : "text-text-secondary hover:bg-bg-tertiary/50 hover:text-text-primary"
                )}
              >
                <Icon size={18} />
                <span className="text-sm font-medium">{section.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
