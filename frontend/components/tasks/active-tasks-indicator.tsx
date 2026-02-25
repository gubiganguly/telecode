"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cpu, X, Square } from "lucide-react";
import { useActiveTasks } from "@/hooks/use-active-tasks";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function ActiveTasksIndicator() {
  const { tasks, runningCount, cancelTask } = useActiveTasks();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const sessions = useStore((s) => s.sessions);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (runningCount === 0) return null;

  const runningTasks = tasks.filter((t) => t.status === "running");

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "relative flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer",
          open
            ? "bg-accent-muted text-accent"
            : "text-text-secondary hover:bg-bg-tertiary"
        )}
        title={`${runningCount} background task${runningCount > 1 ? "s" : ""} running`}
      >
        <Cpu size={13} className="animate-pulse" />
        <span className="hidden sm:inline">{runningCount}</span>
        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-white sm:hidden">
          {runningCount}
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-1 z-50 w-72 rounded-lg border border-border bg-bg-secondary shadow-lg overflow-hidden"
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-border">
              <span className="text-xs font-semibold text-text-primary">
                Background Tasks
              </span>
              <button
                onClick={() => setOpen(false)}
                className="p-0.5 rounded hover:bg-bg-tertiary text-text-tertiary cursor-pointer"
              >
                <X size={12} />
              </button>
            </div>
            <div className="max-h-60 overflow-y-auto">
              {runningTasks.map((task) => {
                const session = sessions.find(
                  (s) => s.id === task.session_id
                );
                const name = session?.name || task.session_id.slice(0, 8);
                const elapsed = Math.round(task.elapsed_seconds);
                const mins = Math.floor(elapsed / 60);
                const secs = elapsed % 60;
                const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

                return (
                  <div
                    key={task.session_id}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-bg-tertiary"
                  >
                    <div className="h-2 w-2 rounded-full bg-accent animate-pulse shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-text-primary truncate">
                        {name}
                      </p>
                      <p className="text-[10px] text-text-tertiary">
                        {timeStr} &middot; {task.event_count} events
                      </p>
                    </div>
                    <button
                      onClick={() => cancelTask(task.session_id)}
                      className="p-1 rounded hover:bg-error/20 text-text-tertiary hover:text-error transition-colors cursor-pointer shrink-0"
                      title="Cancel task"
                    >
                      <Square size={12} />
                    </button>
                  </div>
                );
              })}
              {runningTasks.length === 0 && (
                <p className="px-3 py-4 text-xs text-text-tertiary text-center">
                  No running tasks
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
