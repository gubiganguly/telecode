"use client";

import { useEffect, useState, useCallback, use } from "react";
import { v4 as uuidv4 } from "uuid";
import { SessionSidebar } from "@/components/sessions/session-sidebar";
import { ChatArea } from "@/components/chat/chat-area";
import { FileTreePanel } from "@/components/files/file-tree-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { useStore } from "@/lib/store";
import { useSessions } from "@/hooks/use-sessions";
import { useChat } from "@/hooks/use-chat";
import { useFileTree } from "@/hooks/use-file-tree";
import { useMobile } from "@/hooks/use-mobile";
import {
  useMentionResolver,
  formatResolvedContext,
} from "@/hooks/use-mention-resolver";
import type { MentionItem } from "@/types/mentions";

const FILE_TREE_STORAGE_KEY = "casperbot-file-tree-open";

export default function ChatPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const isMobile = useMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [fileTreeOpen, setFileTreeOpen] = useState(false);

  // Sync file tree state from localStorage after mount to avoid hydration mismatch
  useEffect(() => {
    const stored = localStorage.getItem(FILE_TREE_STORAGE_KEY);
    if (stored === "true") setFileTreeOpen(true);
  }, []);

  const currentProject = useStore((s) => s.currentProject);
  const fetchProject = useStore((s) => s.fetchProject);
  const isDraftMode = useStore((s) => s.isDraftMode);
  const enterDraftMode = useStore((s) => s.enterDraftMode);
  const allStreaming = useStore((s) => s.isStreaming);
  const allWaitingForInput = useStore((s) => s.isWaitingForInput);

  const {
    sessions,
    loading: sessionsLoading,
    activeSessionId,
    setActiveSession,
    deleteSession,
    renameSession,
  } = useSessions(projectId);

  const { messages, isStreaming, sendMessage, cancelRequest } =
    useChat(activeSessionId);

  const { resolve } = useMentionResolver(projectId);

  const { tree, loading: treeLoading, error: treeError, refresh: refreshTree } =
    useFileTree(projectId, fileTreeOpen);

  // Fetch project info
  useEffect(() => {
    fetchProject(projectId);
  }, [projectId, fetchProject]);

  // Enter draft mode if no sessions exist (first visit to project)
  useEffect(() => {
    if (!sessionsLoading && sessions.length === 0 && !isDraftMode && !activeSessionId) {
      enterDraftMode();
    }
  }, [sessionsLoading, sessions.length, isDraftMode, activeSessionId, enterDraftMode]);

  // Auto-select first session (only if not in draft mode)
  useEffect(() => {
    if (!activeSessionId && !isDraftMode && sessions.length > 0) {
      setActiveSession(sessions[0].id);
    }
  }, [sessions, activeSessionId, isDraftMode, setActiveSession]);

  const handleSend = useCallback(
    async (text: string, mentions: MentionItem[]) => {
      const sessionId =
        isDraftMode || !activeSessionId ? uuidv4() : activeSessionId;

      if (isDraftMode || !activeSessionId) {
        setActiveSession(sessionId);
      }

      if (mentions.length === 0) {
        sendMessage(text, projectId, sessionId);
        return;
      }

      // Resolve mentions and prepend context — send enriched text to Claude
      // but show only the raw text (with @mention labels) in the chat UI
      const resolved = await resolve(mentions);
      const context = formatResolvedContext(resolved);
      const enrichedMessage = context ? `${context}\n\n${text}` : text;
      sendMessage(enrichedMessage, projectId, sessionId, text);
    },
    [isDraftMode, activeSessionId, setActiveSession, sendMessage, projectId, resolve]
  );

  // Quick actions from WelcomeScreen (no mentions)
  const handleQuickAction = useCallback(
    (text: string) => {
      handleSend(text, []);
    },
    [handleSend]
  );

  const handleCancel = () => {
    if (!activeSessionId) return;
    cancelRequest(activeSessionId);
  };

  const handleCreateSession = () => {
    enterDraftMode();
  };

  const toggleFileTree = useCallback(() => {
    setFileTreeOpen((prev) => {
      const next = !prev;
      localStorage.setItem(FILE_TREE_STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  const projectName = currentProject?.name || "Loading...";
  const sessionName =
    sessions.find((s) => s.id === activeSessionId)?.name || "New Chat";

  if (sessionsLoading && sessions.length === 0) {
    return (
      <div className="flex h-[100dvh]">
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Skeleton className="w-48 h-4" />
            <Skeleton className="w-32 h-4" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] overflow-hidden">
      <SessionSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={setActiveSession}
        onCreateSession={handleCreateSession}
        onDeleteSession={deleteSession}
        onRenameSession={renameSession}
        projectName={projectName}
        streamingSessions={allStreaming}
        waitingSessions={allWaitingForInput}
      />

      <ChatArea
        projectId={projectId}
        messages={messages}
        isStreaming={isStreaming}
        onSend={handleSend}
        onQuickAction={handleQuickAction}
        onCancel={handleCancel}
        onOpenSidebar={() => setSidebarOpen(true)}
        onToggleFileTree={toggleFileTree}
        projectName={projectName}
        sessionName={sessionName}
        showMenuButton={isMobile}
        fileTreeOpen={fileTreeOpen}
      />

      <FileTreePanel
        open={fileTreeOpen}
        onClose={toggleFileTree}
        tree={tree}
        loading={treeLoading}
        error={treeError}
        onRefresh={refreshTree}
        projectName={projectName}
      />
    </div>
  );
}
