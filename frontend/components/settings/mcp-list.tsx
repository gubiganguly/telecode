"use client";

import { motion } from "framer-motion";
import { Plug } from "lucide-react";
import type { McpServerConfig } from "@/types/api";

interface McpListProps {
  mcps: McpServerConfig[];
}

export function McpList({ mcps }: McpListProps) {
  return (
    <div className="space-y-3">
      {mcps.map((mcp, i) => (
        <motion.div
          key={mcp.name}
          className="rounded-xl border border-border bg-bg-secondary p-4 transition-colors hover:border-border-focus/50"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: i * 0.04 }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
              <Plug size={16} className="text-accent" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-medium text-text-primary">
                {mcp.name}
              </h3>
              {mcp.command && (
                <p className="text-xs font-mono text-text-tertiary mt-0.5 truncate">
                  {mcp.command}
                  {mcp.args && mcp.args.length > 0 && (
                    <span className="text-text-tertiary/70">
                      {" "}
                      {mcp.args.join(" ")}
                    </span>
                  )}
                </p>
              )}
              {mcp.url && (
                <p className="text-xs font-mono text-text-tertiary mt-0.5 truncate">
                  {mcp.url}
                </p>
              )}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
