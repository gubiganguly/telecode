"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, FileText, Terminal, Plug, Shield, Key } from "lucide-react";
import { useMobile } from "@/hooks/use-mobile";
import { ProjectClaudeMdTab } from "./project-claude-md-tab";
import { ProjectCommandsTab } from "./project-commands-tab";
import { ProjectMcpsTab } from "./project-mcps-tab";
import { ProjectEnvVarsTab } from "./project-env-vars-tab";
import { ProjectApprovalsTab } from "./project-approvals-tab";

type SettingsTab = "claude-md" | "commands" | "mcps" | "env-vars" | "approvals";

const TABS: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
  { id: "claude-md", label: "CLAUDE.md", icon: <FileText size={15} /> },
  { id: "commands", label: "Commands", icon: <Terminal size={15} /> },
  { id: "mcps", label: "MCPs", icon: <Plug size={15} /> },
  { id: "env-vars", label: "Env Vars", icon: <Key size={15} /> },
  { id: "approvals", label: "Approvals", icon: <Shield size={15} /> },
];

interface ProjectSettingsDrawerProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
}

export function ProjectSettingsDrawer({
  open,
  onClose,
  projectId,
  projectName,
}: ProjectSettingsDrawerProps) {
  const isMobile = useMobile();
  const [activeTab, setActiveTab] = useState<SettingsTab>("claude-md");

  const panelContent = (
    <div className="flex flex-col h-full bg-bg-secondary">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border min-h-[52px]">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-text-primary truncate">
            Project Settings
          </h2>
          <p className="text-xs text-text-tertiary truncate">{projectName}</p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md hover:bg-bg-tertiary text-text-tertiary transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-border px-2 gap-1 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer border-b-2 ${
              activeTab === tab.id
                ? "text-accent border-accent"
                : "text-text-tertiary border-transparent hover:text-text-secondary"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "claude-md" && (
          <ProjectClaudeMdTab projectId={projectId} />
        )}
        {activeTab === "commands" && (
          <ProjectCommandsTab projectId={projectId} />
        )}
        {activeTab === "mcps" && (
          <ProjectMcpsTab projectId={projectId} />
        )}
        {activeTab === "env-vars" && (
          <ProjectEnvVarsTab projectId={projectId} />
        )}
        {activeTab === "approvals" && (
          <ProjectApprovalsTab projectId={projectId} />
        )}
      </div>
    </div>
  );

  // Desktop: side panel (like file tree)
  if (!isMobile) {
    return (
      <AnimatePresence>
        {open && (
          <motion.div
            className="w-[380px] min-w-[380px] h-full border-l border-border"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 380, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
          >
            {panelContent}
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // Mobile: full-screen overlay
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
          >
            {panelContent}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
