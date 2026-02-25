"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardList,
  ChevronDown,
  Loader2,
  Sparkles,
  FileText,
} from "lucide-react";
import { MarkdownRenderer } from "./markdown-renderer";
import type { ToolUse } from "@/types/chat";

interface PlanCardProps {
  tool: ToolUse;
  allToolUses: ToolUse[];
}

/**
 * Extract the full plan content. The plan is written to a file via the Write
 * tool during plan mode, then ExitPlanMode signals completion. We scan
 * backwards through the tool uses to find the Write that contains the plan.
 * Falls back to the ExitPlanMode tool result if available.
 */
function extractPlanContent(tool: ToolUse, allToolUses: ToolUse[]): { content: string; filePath?: string } {
  // Find this tool's index in the array
  const exitIndex = allToolUses.findIndex((t) => t.toolId === tool.toolId);

  // Scan backwards from ExitPlanMode to find the last Write tool
  if (exitIndex > 0) {
    for (let i = exitIndex - 1; i >= 0; i--) {
      const t = allToolUses[i];
      if (t.toolName === "Write" && typeof t.input?.content === "string") {
        const content = t.input.content as string;
        const filePath = t.input.file_path as string | undefined;
        // Only use it if it looks like substantial plan content (not a tiny config write)
        if (content.length > 100) {
          return { content, filePath };
        }
      }
    }
  }

  // Fallback: use ExitPlanMode's own tool result
  if (tool.output && tool.output.trim().length > 0) {
    return { content: tool.output };
  }

  return { content: "" };
}

export function PlanCard({ tool, allToolUses }: PlanCardProps) {
  const [collapsed, setCollapsed] = useState(false);

  const { content: planContent, filePath } = extractPlanContent(tool, allToolUses);
  const isLoading = !tool.isComplete;
  const hasPlan = planContent.trim().length > 0;

  // Extract just the filename for display
  const fileName = filePath ? filePath.split("/").pop() : undefined;

  return (
    <motion.div
      className="my-2 rounded-lg border border-accent/30 bg-accent/[0.03] overflow-hidden"
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      {/* Header */}
      <button
        className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-left cursor-pointer hover:bg-accent/[0.05] transition-colors"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="w-6 h-6 rounded-md bg-accent/15 flex items-center justify-center shrink-0">
          {isLoading ? (
            <Loader2 size={13} className="text-accent animate-spin" />
          ) : (
            <ClipboardList size={13} className="text-accent" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <span className="text-xs font-semibold text-text-primary">
            Implementation Plan
          </span>
          {isLoading && (
            <span className="text-[11px] text-accent ml-2">
              Preparing plan...
            </span>
          )}
          {!isLoading && fileName && (
            <span className="text-[11px] text-text-tertiary ml-2 inline-flex items-center gap-1">
              <FileText size={10} />
              {fileName}
            </span>
          )}
        </div>

        {hasPlan && (
          <motion.div
            className="text-text-tertiary shrink-0"
            animate={{ rotate: collapsed ? 0 : 180 }}
            transition={{ duration: 0.15 }}
          >
            <ChevronDown size={14} />
          </motion.div>
        )}
      </button>

      {/* Plan content */}
      <AnimatePresence initial={false}>
        {hasPlan && !collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-accent/15">
              <div className="px-4 py-3 text-sm text-text-primary leading-relaxed max-h-[600px] overflow-y-auto">
                <MarkdownRenderer content={planContent} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state while loading */}
      {!hasPlan && isLoading && (
        <div className="border-t border-accent/15 px-4 py-3">
          <div className="flex items-center gap-2 text-[11px] text-text-tertiary">
            <Loader2 size={11} className="animate-spin" />
            <span>Claude is preparing the plan...</span>
          </div>
        </div>
      )}
    </motion.div>
  );
}

/** Minimal card shown when Claude enters plan mode */
export function EnterPlanCard({ tool }: { tool: ToolUse }) {
  const isLoading = !tool.isComplete;

  return (
    <motion.div
      className="my-2 rounded-lg border border-accent/20 bg-accent/[0.03] overflow-hidden"
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.15 }}
    >
      <div className="flex items-center gap-2.5 px-3.5 py-2.5">
        <div className="w-6 h-6 rounded-md bg-accent/15 flex items-center justify-center shrink-0">
          <Sparkles size={13} className="text-accent" />
        </div>
        <span className="text-xs font-medium text-text-secondary">
          {isLoading ? "Entering plan mode..." : "Switched to plan mode"}
        </span>
        {isLoading && (
          <Loader2 size={12} className="text-accent animate-spin ml-auto" />
        )}
      </div>
    </motion.div>
  );
}
