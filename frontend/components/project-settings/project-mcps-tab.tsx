"use client";

import { Plug } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjectMcps } from "@/hooks/use-project-mcps";

interface ProjectMcpsTabProps {
  projectId: string;
}

export function ProjectMcpsTab({ projectId }: ProjectMcpsTabProps) {
  const { mcps, loading } = useProjectMcps(projectId);

  return (
    <div className="p-4 space-y-3">
      <p className="text-xs text-text-tertiary">
        MCP servers scoped to this project
      </p>

      {loading ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      ) : mcps.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-bg-tertiary flex items-center justify-center mb-3">
            <Plug size={20} className="text-text-tertiary" />
          </div>
          <p className="text-sm text-text-tertiary mb-1">
            No project-scoped MCPs
          </p>
          <p className="text-xs text-text-tertiary max-w-[240px]">
            Project MCPs are configured via the Claude CLI with{" "}
            <code className="text-text-secondary">claude mcp add -s project</code>
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {mcps.map((mcp) => (
            <div
              key={mcp.name}
              className="rounded-xl border border-border bg-bg-primary p-3 transition-colors hover:border-border-focus/50"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                  <Plug size={14} className="text-accent" />
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
