"use client";

import { useRef, useEffect, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { ChatMessage } from "./chat-message";
import { TypingIndicator } from "./typing-indicator";
import type { ChatMessage as ChatMessageType } from "@/types/chat";

interface MessageListProps {
  messages: ChatMessageType[];
  isStreaming: boolean;
}

export function MessageList({ messages, isStreaming }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isUserScrolledUp = useRef(false);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight;
    isUserScrolledUp.current = distanceFromBottom > 100;
  }, []);

  // Auto-scroll on new content
  useEffect(() => {
    if (!isUserScrolledUp.current && scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  // Show standalone typing indicator only before assistant message is created
  const showTyping =
    isStreaming &&
    (messages.length === 0 ||
      messages[messages.length - 1]?.role === "user");

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto overscroll-contain"
      onScroll={handleScroll}
    >
      <div className="py-4">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        <AnimatePresence>
          {showTyping && <TypingIndicator />}
        </AnimatePresence>
      </div>
    </div>
  );
}
