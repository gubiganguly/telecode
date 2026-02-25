"use client";

import { MessageList } from "./message-list";
import { ChatInput } from "./chat-input";
import { ChatHeader } from "./chat-header";
import { WelcomeScreen } from "./welcome-screen";
import type { ChatMessage } from "@/types/chat";
import type { MentionItem } from "@/types/mentions";

interface ChatAreaProps {
  projectId: string;
  sessionId: string | null;
  messages: ChatMessage[];
  isStreaming: boolean;
  onSend: (text: string, mentions: MentionItem[]) => void;
  onQuickAction: (text: string) => void;
  onCancel: () => void;
  onOpenSidebar: () => void;
  onToggleFileTree: () => void;
  onTogglePreview: () => void;
  projectName: string;
  sessionName: string;
  showMenuButton: boolean;
  fileTreeOpen: boolean;
  previewOpen: boolean;
  previewSupported: boolean;
  previewRunning: boolean;
  previewStarting: boolean;
  previewStopping: boolean;
  onStartPreview: () => void;
  onStopPreview: () => void;
}

export function ChatArea({
  projectId,
  sessionId,
  messages,
  isStreaming,
  onSend,
  onQuickAction,
  onCancel,
  onOpenSidebar,
  onToggleFileTree,
  onTogglePreview,
  projectName,
  sessionName,
  showMenuButton,
  fileTreeOpen,
  previewOpen,
  previewSupported,
  previewRunning,
  previewStarting,
  previewStopping,
  onStartPreview,
  onStopPreview,
}: ChatAreaProps) {
  return (
    <div className="flex flex-col flex-1 h-full min-w-0">
      <ChatHeader
        projectName={projectName}
        sessionName={sessionName}
        onOpenSidebar={onOpenSidebar}
        onToggleFileTree={onToggleFileTree}
        onTogglePreview={onTogglePreview}
        showMenuButton={showMenuButton}
        fileTreeOpen={fileTreeOpen}
        previewOpen={previewOpen}
        previewSupported={previewSupported}
        previewRunning={previewRunning}
        previewStarting={previewStarting}
        previewStopping={previewStopping}
        onStartPreview={onStartPreview}
        onStopPreview={onStopPreview}
      />

      {messages.length === 0 && !isStreaming ? (
        <WelcomeScreen onQuickAction={onQuickAction} />
      ) : (
        <MessageList messages={messages} isStreaming={isStreaming} />
      )}

      <ChatInput
        projectId={projectId}
        sessionId={sessionId}
        onSend={onSend}
        onCancel={onCancel}
        isStreaming={isStreaming}
      />
    </div>
  );
}
