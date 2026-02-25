"use client";

import { useEffect, useRef } from "react";
import { X, ExternalLink, Square, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PreviewPanelProps {
  open: boolean;
  onClose: () => void;
  url: string | null;
  framework: string | null;
  status: string;
  logs: string[];
  starting: boolean;
  stopping: boolean;
  error: string | null;
  onStop: () => void;
}

const frameworkLabels: Record<string, string> = {
  nextjs: "Next.js",
  vite: "Vite",
  cra: "React (CRA)",
  fastapi: "FastAPI",
  flask: "Flask",
  static: "Static",
  node: "Node.js",
};

export function PreviewPanel({
  open,
  onClose,
  url,
  framework,
  status,
  logs,
  starting,
  stopping,
  error,
  onStop,
}: PreviewPanelProps) {
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs.length]);

  if (!open) return null;

  const isRunning = status === "running";
  const frameworkLabel = framework ? (frameworkLabels[framework] || framework) : "Unknown";

  return (
    <>
      {/* Mobile: backdrop overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-40 sm:hidden"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          "border-l border-border bg-bg-primary flex flex-col shrink-0",
          // Mobile: full-screen overlay
          "fixed inset-0 z-50 border-l-0",
          // Desktop: side panel
          "sm:static sm:z-auto sm:w-80 sm:h-full sm:border-l"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={cn(
                "w-2 h-2 rounded-full shrink-0",
                isRunning ? "bg-success" : starting ? "bg-warning animate-pulse" : "bg-text-quaternary"
              )}
            />
            <span className="text-sm font-medium text-text-primary truncate sm:text-xs">
              Preview
            </span>
            <span className="text-sm text-text-tertiary sm:text-xs">
              {frameworkLabel}
            </span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-1">
            {isRunning && url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 sm:p-1 rounded hover:bg-bg-tertiary text-text-tertiary hover:text-text-primary transition-colors"
                title="Open in new tab"
              >
                <ExternalLink size={16} className="sm:hidden" />
                <ExternalLink size={14} className="hidden sm:block" />
              </a>
            )}
            {(isRunning || starting) && (
              <button
                onClick={onStop}
                disabled={stopping}
                className="p-1.5 sm:p-1 rounded hover:bg-bg-tertiary text-text-tertiary hover:text-error transition-colors cursor-pointer disabled:opacity-50"
                title="Stop preview"
              >
                {stopping ? (
                  <Loader2 size={16} className="animate-spin sm:hidden" />
                ) : (
                  <Square size={16} className="sm:hidden" />
                )}
                {stopping ? (
                  <Loader2 size={14} className="animate-spin hidden sm:block" />
                ) : (
                  <Square size={14} className="hidden sm:block" />
                )}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 sm:p-1 rounded hover:bg-bg-tertiary text-text-tertiary transition-colors cursor-pointer"
            >
              <X size={18} className="sm:hidden" />
              <X size={14} className="hidden sm:block" />
            </button>
          </div>
        </div>

        {/* URL bar */}
        {isRunning && url && (
          <div className="px-3 py-2 sm:py-1.5 border-b border-border">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm sm:text-xs text-accent hover:underline truncate block"
            >
              {url}
            </a>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="px-3 py-2 bg-error/10 border-b border-error/20">
            <p className="text-sm sm:text-xs text-error">{error}</p>
          </div>
        )}

        {/* Logs */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-2">
          {logs.length === 0 && !starting && !isRunning ? (
            <p className="text-sm sm:text-xs text-text-quaternary text-center py-8">
              No logs yet. Start the preview to see output.
            </p>
          ) : (
            <pre className="text-xs sm:text-[10px] leading-relaxed text-text-secondary font-mono whitespace-pre-wrap break-all">
              {starting && logs.length === 0 && (
                <span className="text-text-quaternary">Starting dev server...</span>
              )}
              {logs.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
              <div ref={logsEndRef} />
            </pre>
          )}
        </div>
      </div>
    </>
  );
}
