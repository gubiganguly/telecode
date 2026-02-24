"use client";

import Link from "next/link";
import { ArrowLeft, Zap, Terminal, Key, Plug, FileText, Github } from "lucide-react";
import { cn } from "@/lib/utils";

export type SettingsSection = "commands" | "api-keys" | "mcps" | "claude-md" | "github";

const SECTIONS = [
  { id: "claude-md" as const, label: "CLAUDE.md", icon: FileText },
  { id: "commands" as const, label: "Slash Commands", icon: Terminal },
  { id: "api-keys" as const, label: "API Keys", icon: Key },
  { id: "mcps" as const, label: "Connected MCPs", icon: Plug },
  { id: "github" as const, label: "GitHub", icon: Github },
];

interface SettingsSidebarProps {
  activeSection: SettingsSection;
  onSelectSection: (section: SettingsSection) => void;
  counts: { commands: number; keys: number; mcps: number };
}

export function SettingsSidebar({
  activeSection,
  onSelectSection,
  counts,
}: SettingsSidebarProps) {
  const countMap: Record<SettingsSection, number> = {
    "claude-md": 0,
    commands: counts.commands,
    "api-keys": counts.keys,
    mcps: counts.mcps,
    github: 0,
  };

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
              <Zap size={14} className="text-white" />
            </div>
            <h1 className="text-sm font-semibold text-text-primary">
              Settings
            </h1>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-3 space-y-1">
          {SECTIONS.map((section) => {
            const isActive = activeSection === section.id;
            const count = countMap[section.id];
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
                <span className="text-sm font-medium flex-1">
                  {section.label}
                </span>
                {count > 0 && (
                  <span
                    className={cn(
                      "text-[11px] font-medium px-1.5 py-0.5 rounded-md",
                      isActive
                        ? "bg-accent/20 text-accent"
                        : "bg-bg-tertiary text-text-tertiary"
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
