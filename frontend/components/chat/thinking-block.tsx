"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { useThinkingPhrase } from "@/hooks/use-thinking-phrase";
import { cn } from "@/lib/utils";

interface ThinkingBlockProps {
  thinking: string;
  isStreaming: boolean;
}

function ThinkingAsterisk({ spinning = false, className }: { spinning?: boolean; className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className={cn(spinning && "thinking-spinner", className)}
    >
      {/* 6-armed asterisk */}
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
  );
}

export function ThinkingBlock({ thinking, isStreaming }: ThinkingBlockProps) {
  const [expanded, setExpanded] = useState(false);
  const phrase = useThinkingPhrase(isStreaming);

  if (!thinking) return null;

  return (
    <div className="mb-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "flex items-center gap-2 text-xs transition-colors cursor-pointer py-1",
          isStreaming
            ? "text-accent"
            : "text-text-tertiary hover:text-text-secondary"
        )}
      >
        {isStreaming ? (
          <ThinkingAsterisk spinning className="text-accent" />
        ) : (
          <>
            <motion.div
              animate={{ rotate: expanded ? 90 : 0 }}
              transition={{ duration: 0.15 }}
            >
              <ChevronRight size={14} />
            </motion.div>
            <ThinkingAsterisk className="text-text-tertiary" />
          </>
        )}
        {isStreaming ? (
          <AnimatePresence mode="wait">
            <motion.span
              key={phrase}
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              transition={{ duration: 0.15 }}
            >
              {phrase}
            </motion.span>
          </AnimatePresence>
        ) : (
          <span>Thought process</span>
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-2 p-3 rounded-lg bg-thinking-bg border border-border text-sm text-text-secondary font-mono leading-relaxed whitespace-pre-wrap">
              {thinking}
              {isStreaming && <span className="streaming-cursor" />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
