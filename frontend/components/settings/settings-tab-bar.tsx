"use client";

import { Terminal, Key, Plug, FileText, Github, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SettingsSection } from "./settings-sidebar";

const TABS = [
  { id: "claude-md" as const, label: "CLAUDE.md", icon: FileText },
  { id: "commands" as const, label: "Commands", icon: Terminal },
  { id: "credentials" as const, label: "Credentials", icon: Key },
  { id: "mcps" as const, label: "MCPs", icon: Plug },
  { id: "approvals" as const, label: "Approvals", icon: Shield },
  { id: "github" as const, label: "GitHub", icon: Github },
];

interface SettingsTabBarProps {
  activeSection: SettingsSection;
  onSelectSection: (section: SettingsSection) => void;
}

export function SettingsTabBar({
  activeSection,
  onSelectSection,
}: SettingsTabBarProps) {
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
