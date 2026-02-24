"use client";

import { MessageList } from "./message-list";
import { ChatInput } from "./chat-input";
import { ChatHeader } from "./chat-header";
import { WelcomeScreen } from "./welcome-screen";
import type { ChatMessage } from "@/types/chat";
import type { MentionItem } from "@/types/mentions";

interface ChatAreaProps {
  projectId: string;
  messages: ChatMessage[];
  isStreaming: boolean;
  onSend: (text: string, mentions: MentionItem[]) => void;
  onQuickAction: (text: string) => void;
  onCancel: () => void;
  onOpenSidebar: () => void;
  onToggleFileTree: () => void;
  projectName: string;
  sessionName: string;
  showMenuButton: boolean;
  fileTreeOpen: boolean;
}

export function ChatArea({
  projectId,
  messages,
  isStreaming,
  onSend,
  onQuickAction,
  onCancel,
  onOpenSidebar,
  onToggleFileTree,
  projectName,
  sessionName,
  showMenuButton,
  fileTreeOpen,
}: ChatAreaProps) {
  return (
    <div className="flex flex-col flex-1 h-full min-w-0">
      <ChatHeader
        projectName={projectName}
        sessionName={sessionName}
        onOpenSidebar={onOpenSidebar}
        onToggleFileTree={onToggleFileTree}
        showMenuButton={showMenuButton}
        fileTreeOpen={fileTreeOpen}
      />

      {messages.length === 0 && !isStreaming ? (
        <WelcomeScreen onQuickAction={onQuickAction} />
      ) : (
        <MessageList messages={messages} isStreaming={isStreaming} />
      )}

      <ChatInput
        projectId={projectId}
        onSend={onSend}
        onCancel={onCancel}
        isStreaming={isStreaming}
      />
    </div>
  );
}
