"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { File, Folder, Link, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MentionSuggestion } from "@/types/mentions";

export interface MentionSuggestionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

interface MentionSuggestionListProps {
  items: MentionSuggestion[];
  command: (item: MentionSuggestion) => void;
  loading?: boolean;
}

const ICONS = {
  file: File,
  folder: Folder,
  url: Link,
} as const;

export const MentionSuggestionList = forwardRef<
  MentionSuggestionListRef,
  MentionSuggestionListProps
>(({ items, command, loading }, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Reset selection when items change — standard pattern for dropdown navigation
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedIndex(0);
  }, [items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === "ArrowUp") {
        setSelectedIndex((i) => (i <= 0 ? items.length - 1 : i - 1));
        return true;
      }
      if (event.key === "ArrowDown") {
        setSelectedIndex((i) => (i >= items.length - 1 ? 0 : i + 1));
        return true;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        if (items[selectedIndex]) {
          command(items[selectedIndex]);
        }
        return true;
      }
      return false;
    },
  }));

  if (!items.length && !loading) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="bg-bg-secondary border border-border rounded-xl shadow-xl overflow-hidden"
        initial={{ opacity: 0, y: 8, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.97 }}
        transition={{ duration: 0.12 }}
      >
        <div className="p-1.5 max-h-[240px] overflow-y-auto">
          {loading && items.length === 0 ? (
            <div className="flex items-center justify-center py-3 text-text-tertiary">
              <Loader2 size={14} className="animate-spin mr-2" />
              <span className="text-xs">Searching...</span>
            </div>
          ) : (
            items.map((item, i) => {
              const IconComponent = ICONS[item.type];
              return (
                <button
                  key={`${item.type}-${item.path}`}
                  className={cn(
                    "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left transition-colors cursor-pointer",
                    i === selectedIndex
                      ? "bg-accent-muted text-text-primary"
                      : "text-text-secondary hover:bg-bg-tertiary"
                  )}
                  onClick={() => command(item)}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setSelectedIndex(i)}
                >
                  <IconComponent size={14} className="shrink-0 text-accent" />
                  <span className="text-sm font-mono font-medium truncate">
                    {item.label}
                  </span>
                  {item.path !== item.label && (
                    <span className="text-xs text-text-tertiary truncate ml-auto">
                      {item.path}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
});

MentionSuggestionList.displayName = "MentionSuggestionList";
