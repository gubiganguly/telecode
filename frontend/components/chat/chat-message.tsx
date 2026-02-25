"use client";

import { memo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useThinkingPhrase } from "@/hooks/use-thinking-phrase";
import { useTypewriter } from "@/hooks/use-typewriter";
import { ThinkingBlock } from "./thinking-block";
import { ToolUseCard } from "./tool-use-card";
import { TodoCard } from "./todo-card";
import { AskUserQuestionCard } from "./ask-user-question-card";
import { PlanCard, EnterPlanCard } from "./plan-card";
import { MarkdownRenderer } from "./markdown-renderer";
import type { ChatMessage as ChatMessageType } from "@/types/chat";

interface ChatMessageProps {
  message: ChatMessageType;
}

export const ChatMessage = memo(function ChatMessage({
  message,
}: ChatMessageProps) {
  const isUser = message.role === "user";
  const wasCompleteOnMount = useRef(message.isComplete);
  const shouldAnimate = !isUser && !wasCompleteOnMount.current && !message.isComplete;
  const streamedText = useTypewriter(message.content, shouldAnimate);
  const isTyping = !isUser && streamedText.length < message.content.length;
  const showIndicator = !isUser && (message.isStreaming || isTyping);
  const phrase = useThinkingPhrase(showIndicator);

  return (
    <motion.div
      className="px-4 py-3"
      initial={
        isUser
          ? { opacity: 0, y: 12, scale: 0.95 }
          : { opacity: 0, y: 8 }
      }
      animate={
        isUser
          ? { opacity: 1, y: 0, scale: 1 }
          : { opacity: 1, y: 0 }
      }
      transition={
        isUser
          ? { duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }
          : { duration: 0.15 }
      }
    >
      <div
        className={cn("flex gap-3 max-w-3xl mx-auto", isUser && "flex-row-reverse")}
      >
        {/* Avatar — user only */}
        {isUser && (
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 bg-accent/20">
            <User size={14} className="text-accent" />
          </div>
        )}

        {/* Content */}
        <div className={cn("flex-1 min-w-0", isUser && "text-right")}>
          {/* User message */}
          {isUser && (
            <div className="inline-block text-left bg-accent-muted rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-full">
              <p className="text-sm text-text-primary whitespace-pre-wrap break-words">
                {message.content}
              </p>
            </div>
          )}

          {/* Assistant message */}
          {!isUser && (
            <div className="space-y-0">
              {/* Thinking */}
              {message.thinking && (
                <ThinkingBlock
                  thinking={message.thinking}
                  isStreaming={message.isStreaming && !message.content}
                />
              )}

              {/* Tool uses */}
              {message.toolUses.map((tool) =>
                tool.toolName === "TodoWrite" ? (
                  <TodoCard key={tool.toolId} tool={tool} />
                ) : tool.toolName === "AskUserQuestion" ? (
                  <AskUserQuestionCard key={tool.toolId} tool={tool} />
                ) : tool.toolName === "ExitPlanMode" ? (
                  <PlanCard key={tool.toolId} tool={tool} allToolUses={message.toolUses} />
                ) : tool.toolName === "EnterPlanMode" ? (
                  <EnterPlanCard key={tool.toolId} tool={tool} />
                ) : (
                  <ToolUseCard key={tool.toolId} tool={tool} />
                )
              )}

              {/* Text content */}
              {message.content && (
                <div className="text-sm text-text-primary leading-relaxed">
                  {isTyping ? (
                    <div className="whitespace-pre-wrap break-words">
                      {streamedText}
                      <span className="streaming-cursor" />
                    </div>
                  ) : (
                    <MarkdownRenderer content={message.content} />
                  )}
                </div>
              )}

              {/* Streaming indicator — shown below content while streaming */}
              {showIndicator && (
                <div className="flex items-center gap-2 mt-2 py-0.5">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    className="thinking-spinner text-accent"
                  >
                    {[0, 60, 120].map((angle) => (
                      <line
                        key={angle}
                        x1="8"
                        y1="2"
                        x2="8"
                        y2="14"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        transform={`rotate(${angle} 8 8)`}
                      />
                    ))}
                  </svg>
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={phrase}
                      className="text-xs text-accent"
                      initial={{ opacity: 0, y: 4, filter: "blur(2px)" }}
                      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                      exit={{ opacity: 0, y: -4, filter: "blur(2px)" }}
                      transition={{ duration: 0.25 }}
                    >
                      {phrase}
                    </motion.span>
                  </AnimatePresence>
                </div>
              )}

              {/* Cost info */}
              {message.isComplete && message.costUsd != null && (
                <p className="text-[11px] text-text-tertiary mt-2">
                  Cost: ${message.costUsd.toFixed(4)}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
});
