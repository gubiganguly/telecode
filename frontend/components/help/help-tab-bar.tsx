"use client";

import {
  Rocket,
  FolderOpen,
  FileText,
  Terminal,
  Plug,
  Shield,
  Key,
  MessageSquare,
  Github,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { HelpSection } from "./help-sidebar";

const TABS = [
  { id: "overview" as const, label: "Overview", icon: Rocket },
  { id: "projects" as const, label: "Projects", icon: FolderOpen },
  { id: "claude-md" as const, label: "CLAUDE.md", icon: FileText },
  { id: "commands" as const, label: "Commands", icon: Terminal },
  { id: "mcps" as const, label: "MCPs", icon: Plug },
  { id: "approvals" as const, label: "Approvals", icon: Shield },
  { id: "env-vars" as const, label: "Env Vars", icon: Key },
  { id: "chat" as const, label: "Chat", icon: MessageSquare },
  { id: "github" as const, label: "GitHub", icon: Github },
  { id: "architecture" as const, label: "Architecture", icon: Wrench },
];

interface HelpTabBarProps {
  activeSection: HelpSection;
  onSelectSection: (section: HelpSection) => void;
}

export function HelpTabBar({ activeSection, onSelectSection }: HelpTabBarProps) {
  return (
    <div className="flex overflow-x-auto border-b border-border bg-bg-secondary/50 backdrop-blur-md scrollbar-hide">
      {TABS.map((tab) => {
        const isActive = activeSection === tab.id;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            onClick={() => onSelectSection(tab.id)}
            className={cn(
              "flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors cursor-pointer",
              isActive
                ? "text-accent border-b-2 border-accent"
                : "text-text-tertiary hover:text-text-secondary"
            )}
          >
            <Icon size={16} />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
