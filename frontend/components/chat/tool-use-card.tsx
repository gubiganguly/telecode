"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ChevronRight,
  Terminal,
  FileText,
  FileEdit,
  Search,
  Globe,
  Check,
  X,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn, truncate } from "@/lib/utils";
import type { ToolUse } from "@/types/chat";

const TOOL_ICONS: Record<string, typeof Terminal> = {
  Bash: Terminal,
  Read: FileText,
  Write: FileEdit,
  Edit: FileEdit,
  Glob: Search,
  Grep: Search,
  WebFetch: Globe,
  WebSearch: Globe,
};

interface ToolUseCardProps {
  tool: ToolUse;
}

export function ToolUseCard({ tool }: ToolUseCardProps) {
  const [expanded, setExpanded] = useState(false);
  const Icon = TOOL_ICONS[tool.toolName] || Terminal;

  const inputSummary = getInputSummary(tool);
  const hasOutput = tool.output && tool.output.length > 0;

  return (
    <motion.div
      className="my-2 rounded-lg border border-border bg-tool-bg overflow-hidden"
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.15 }}
    >
      <button
        className="flex items-center gap-2 w-full px-3 py-2 text-left cursor-pointer hover:bg-bg-tertiary/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <motion.div
          animate={{ rotate: expanded ? 90 : 0 }}
          transition={{ duration: 0.15 }}
          className="text-text-tertiary"
        >
          <ChevronRight size={14} />
        </motion.div>

        <Badge variant={tool.isError ? "error" : "accent"} className="gap-1 shrink-0">
          <Icon size={11} />
          {tool.toolName}
        </Badge>

        <span className="flex-1 text-xs text-text-secondary truncate font-mono">
          {inputSummary}
        </span>

        <div className="shrink-0">
          {!tool.isComplete ? (
            <Loader2 size={14} className="text-accent animate-spin" />
          ) : tool.isError ? (
            <X size={14} className="text-error" />
          ) : (
            <Check size={14} className="text-success" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border">
          {/* Input */}
          <div className="px-3 py-2">
            <p className="text-[11px] text-text-tertiary uppercase tracking-wider mb-1">
              Input
            </p>
            <pre className="text-xs text-text-secondary font-mono whitespace-pre-wrap break-all max-h-40 overflow-y-auto">
              {JSON.stringify(tool.input, null, 2)}
            </pre>
          </div>

          {/* Output */}
          {hasOutput && (
            <div className="px-3 py-2 border-t border-border">
              <p className="text-[11px] text-text-tertiary uppercase tracking-wider mb-1">
                Output
              </p>
              <pre
                className={cn(
                  "text-xs font-mono whitespace-pre-wrap break-all max-h-60 overflow-y-auto",
                  tool.isError ? "text-error" : "text-text-secondary"
                )}
              >
                {tool.output}
              </pre>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

function getInputSummary(tool: ToolUse): string {
  const input = tool.input;
  if (tool.toolName === "Bash" && typeof input.command === "string") {
    return truncate(input.command as string, 60);
  }
  if (
    (tool.toolName === "Read" || tool.toolName === "Write") &&
    typeof input.file_path === "string"
  ) {
    return input.file_path as string;
  }
  if (tool.toolName === "Edit" && typeof input.file_path === "string") {
    return input.file_path as string;
  }
  if (tool.toolName === "Grep" && typeof input.pattern === "string") {
    return `/${input.pattern as string}/`;
  }
  if (tool.toolName === "Glob" && typeof input.pattern === "string") {
    return input.pattern as string;
  }
  // Fallback
  const keys = Object.keys(input);
  if (keys.length === 0) return "";
  const firstVal = input[keys[0]];
  if (typeof firstVal === "string") return truncate(firstVal, 60);
  return keys.join(", ");
}
