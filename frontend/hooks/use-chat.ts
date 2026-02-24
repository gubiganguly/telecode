"use client";

import { useStore } from "@/lib/store";
import type { ChatMessage } from "@/types/chat";

const EMPTY_MESSAGES: ChatMessage[] = [];

export function useChat(sessionId: string | null) {
  const messages = useStore((s) =>
    sessionId ? s.messages[sessionId] ?? EMPTY_MESSAGES : EMPTY_MESSAGES
  );
  const isStreaming = useStore((s) =>
    sessionId ? s.isStreaming[sessionId] ?? false : false
  );
  const sendMessage = useStore((s) => s.sendMessage);
  const cancelRequest = useStore((s) => s.cancelRequest);

  return { messages, isStreaming, sendMessage, cancelRequest };
}
