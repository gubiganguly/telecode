"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Circle,
  Loader2,
  CheckCircle2,
  ListTodo,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ToolUse } from "@/types/chat";

interface Todo {
  content: string;
  status: "pending" | "in_progress" | "completed";
  activeForm: string;
}

interface TodoCardProps {
  tool: ToolUse;
}

const statusConfig = {
  pending: {
    icon: Circle,
    color: "text-text-tertiary",
    bg: "",
    label: "Pending",
  },
  in_progress: {
    icon: Loader2,
    color: "text-accent",
    bg: "bg-accent/5",
    label: "In progress",
  },
  completed: {
    icon: CheckCircle2,
    color: "text-success",
    bg: "",
    label: "Done",
  },
};

export function TodoCard({ tool }: TodoCardProps) {
  const todos: Todo[] = Array.isArray(tool.input?.todos)
    ? (tool.input.todos as Todo[])
    : [];

  if (todos.length === 0) return null;

  const completedCount = todos.filter((t) => t.status === "completed").length;
  const totalCount = todos.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <motion.div
      className="my-2 rounded-lg border border-border bg-tool-bg overflow-hidden"
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.15 }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <ListTodo size={14} className="text-accent shrink-0" />
        <span className="text-xs font-medium text-text-primary">Tasks</span>
        <span className="text-[11px] text-text-tertiary ml-auto">
          {completedCount}/{totalCount}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-border">
        <motion.div
          className="h-full bg-accent"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>

      {/* Todo items */}
      <div className="px-1 py-1">
        <AnimatePresence initial={false}>
          {todos.map((todo, index) => {
            const config = statusConfig[todo.status] || statusConfig.pending;
            const Icon = config.icon;
            const isActive = todo.status === "in_progress";

            return (
              <motion.div
                key={`${todo.content}-${index}`}
                className={cn(
                  "flex items-start gap-2.5 px-2.5 py-1.5 rounded-md transition-colors",
                  config.bg
                )}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.15, delay: index * 0.03 }}
              >
                <div className="mt-0.5 shrink-0">
                  <Icon
                    size={14}
                    className={cn(
                      config.color,
                      isActive && "animate-spin"
                    )}
                  />
                </div>
                <span
                  className={cn(
                    "text-xs leading-relaxed",
                    todo.status === "completed"
                      ? "text-text-tertiary line-through"
                      : todo.status === "in_progress"
                        ? "text-text-primary font-medium"
                        : "text-text-secondary"
                  )}
                >
                  {isActive ? todo.activeForm : todo.content}
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
