"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Plus, MessageSquare, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SessionItem } from "@/components/sessions/session-item";
import { getDateGroup } from "@/lib/utils";
import { useMobile } from "@/hooks/use-mobile";
import type { SessionInfo } from "@/types/api";
import type { SessionStatus } from "@/types/chat";

function getSessionStatus(
  sessionId: string,
  streaming: Record<string, boolean>,
  waiting: Record<string, boolean>
): SessionStatus {
  if (streaming[sessionId]) return "streaming";
  if (waiting[sessionId]) return "waiting_for_input";
  return "idle";
}

interface SessionSidebarProps {
  open: boolean;
  onClose: () => void;
  sessions: SessionInfo[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onCreateSession: () => void;
  onDeleteSession: (id: string) => Promise<void>;
  onRenameSession: (id: string, name: string) => Promise<void>;
  projectName: string;
  streamingSessions: Record<string, boolean>;
  waitingSessions: Record<string, boolean>;
}

export function SessionSidebar({
  open,
  onClose,
  sessions,
  activeSessionId,
  onSelectSession,
  onCreateSession,
  onDeleteSession,
  onRenameSession,
  projectName,
  streamingSessions,
  waitingSessions,
}: SessionSidebarProps) {
  const router = useRouter();
  const isMobile = useMobile();

  // Group sessions by date
  const grouped = sessions.reduce<Record<string, SessionInfo[]>>(
    (acc, session) => {
      const group = getDateGroup(session.updated_at);
      if (!acc[group]) acc[group] = [];
      acc[group].push(session);
      return acc;
    },
    {}
  );

  const groupOrder = ["Today", "Yesterday", "This Week", "Older"];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-bg-secondary">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <button
          onClick={() => router.push("/projects")}
          className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} />
          Projects
        </button>
        {isMobile && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-bg-tertiary text-text-tertiary cursor-pointer"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Project name */}
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold text-text-primary truncate">
          {projectName}
        </h2>
      </div>

      {/* New chat button */}
      <div className="p-3">
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2"
          onClick={onCreateSession}
        >
          <Plus size={14} />
          New Chat
        </Button>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <MessageSquare size={24} className="text-text-tertiary mb-3" />
            <p className="text-sm text-text-tertiary">No chats yet</p>
          </div>
        ) : (
          groupOrder
            .filter((group) => grouped[group]?.length)
            .map((group) => (
              <div key={group} className="mb-3">
                <p className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider px-2 py-1.5">
                  {group}
                </p>
                {grouped[group].map((session) => (
                  <SessionItem
                    key={session.id}
                    session={session}
                    isActive={session.id === activeSessionId}
                    status={getSessionStatus(session.id, streamingSessions, waitingSessions)}
                    onSelect={() => {
                      onSelectSession(session.id);
                      if (isMobile) onClose();
                    }}
                    onDelete={() => onDeleteSession(session.id)}
                    onRename={(name) => onRenameSession(session.id, name)}
                  />
                ))}
              </div>
            ))
        )}
      </div>
    </div>
  );

  // Desktop: static sidebar
  if (!isMobile) {
    return (
      <div className="w-[280px] min-w-[280px] h-full border-r border-border">
        {sidebarContent}
      </div>
    );
  }

  // Mobile: slide-in overlay
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
            className="fixed left-0 top-0 bottom-0 z-50 w-[280px]"
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
          >
            {sidebarContent}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
