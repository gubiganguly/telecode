"use client";

import { motion } from "framer-motion";
import { Plug, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { McpList } from "@/components/settings/mcp-list";
import type { McpServerConfig } from "@/types/api";

interface SettingsMcpsSectionProps {
  mcps: McpServerConfig[];
  loading: boolean;
  onAddMcp: () => void;
}

export function SettingsMcpsSection({
  mcps,
  loading,
  onAddMcp,
}: SettingsMcpsSectionProps) {
  return (
    <motion.div
      key="mcps"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="max-w-3xl mx-auto w-full px-6 py-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
            <Plug size={18} />
            Connected MCPs
          </h2>
          <p className="text-sm text-text-tertiary mt-0.5">
            Model Context Protocol servers installed via Claude CLI
          </p>
        </div>
        <Button
          size="sm"
          className="gap-1.5"
          onClick={onAddMcp}
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Add MCP</span>
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : mcps.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-bg-tertiary flex items-center justify-center mb-4">
            <Plug size={24} className="text-text-tertiary" />
          </div>
          <h3 className="text-base font-medium text-text-primary mb-1">
            No MCPs connected
          </h3>
          <p className="text-sm text-text-tertiary mb-6 max-w-sm">
            Install MCP servers to extend Claude&apos;s capabilities
            across all your projects.
          </p>
          <Button onClick={onAddMcp} className="gap-1.5">
            <Plus size={16} />
            Add Your First MCP
          </Button>
        </div>
      ) : (
        <McpList mcps={mcps} />
      )}
    </motion.div>
  );
}
