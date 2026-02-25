"use client";

import { Shield, RotateCcw } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useProjectApprovals } from "@/hooks/use-project-approvals";

interface ProjectApprovalsTabProps {
  projectId: string;
}

export function ProjectApprovalsTab({ projectId }: ProjectApprovalsTabProps) {
  const { enabled, globalDefault, effective, loading, saving, set } =
    useProjectApprovals(projectId);

  const isInheriting = enabled === null;

  return (
    <div className="p-4 space-y-4">
      <p className="text-xs text-text-tertiary">
        Control whether Claude asks for permission before using tools
      </p>

      {loading ? (
        <Skeleton className="h-20 rounded-xl" />
      ) : (
        <>
          <div className="rounded-xl border border-border bg-bg-primary p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Shield size={16} className="text-accent" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-text-primary">
                    Tool Approvals
                  </h3>
                  <p className="text-xs text-text-tertiary mt-1 leading-relaxed max-w-[260px]">
                    {effective
                      ? "Claude will ask for permission before using tools like file edits, bash commands, etc."
                      : "All tools are auto-approved. Claude can read, write, and execute without asking."}
                  </p>
                </div>
              </div>
              <Switch
                checked={effective}
                onCheckedChange={(val) => set(val)}
                disabled={saving}
              />
            </div>
          </div>

          {/* Inheritance indicator */}
          <div className="rounded-lg bg-bg-tertiary/50 p-3">
            {isInheriting ? (
              <p className="text-xs text-text-tertiary leading-relaxed">
                <strong className="text-text-secondary">Using global default:</strong>{" "}
                {globalDefault ? "On" : "Off"}.{" "}
                Toggle the switch to override for this project.
              </p>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-text-tertiary leading-relaxed">
                  <strong className="text-text-secondary">Overriding global default</strong>{" "}
                  ({globalDefault ? "On" : "Off"}).
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-xs h-7"
                  onClick={() => set(null)}
                  disabled={saving}
                >
                  <RotateCcw size={12} />
                  Reset
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
