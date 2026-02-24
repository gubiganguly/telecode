"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useThinkingPhrase } from "@/hooks/use-thinking-phrase";

function ThinkingAsterisk() {
  return (
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
  );
}

export function TypingIndicator() {
  const phrase = useThinkingPhrase(true);

  return (
    <motion.div
      className="flex items-center gap-2 px-4 py-3"
      initial={{ opacity: 0, y: 10, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.96 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        initial={{ rotate: -90, opacity: 0 }}
        animate={{ rotate: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <ThinkingAsterisk />
      </motion.div>
      <AnimatePresence mode="wait">
        <motion.span
          key={phrase}
          className="text-xs text-accent ml-0.5"
          initial={{ opacity: 0, y: 4, filter: "blur(2px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -4, filter: "blur(2px)" }}
          transition={{ duration: 0.25 }}
        >
          {phrase}
        </motion.span>
      </AnimatePresence>
    </motion.div>
  );
}
