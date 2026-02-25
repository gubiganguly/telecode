"use client";

import { motion } from "framer-motion";
import { Shield } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";

interface SettingsApprovalsSectionProps {
  enabled: boolean;
  loading: boolean;
  saving: boolean;
  onToggle: (value: boolean) => void;
}

export function SettingsApprovalsSection({
  enabled,
  loading,
  saving,
  onToggle,
}: SettingsApprovalsSectionProps) {
  return (
    <motion.div
      key="approvals"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="max-w-3xl mx-auto w-full px-6 py-6"
    >
      <div className="mb-6">
        <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
          <Shield size={18} />
          Tool Approvals
        </h2>
        <p className="text-sm text-text-tertiary mt-0.5">
          Default approval setting for all projects
        </p>
      </div>

      {loading ? (
        <Skeleton className="h-24 rounded-xl" />
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-bg-secondary p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Shield size={18} className="text-accent" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-text-primary">
                    Require Tool Approvals
                  </h3>
                  <p className="text-sm text-text-tertiary mt-1 leading-relaxed max-w-md">
                    {enabled
                      ? "Claude will ask for permission before using tools like file edits, bash commands, etc. This applies to all projects unless overridden."
                      : "All tools are auto-approved across all projects. Claude can read, write, and execute without asking."}
                  </p>
                </div>
              </div>
              <Switch
                checked={enabled}
                onCheckedChange={onToggle}
                disabled={saving}
              />
            </div>
          </div>

          <div className="rounded-lg bg-bg-tertiary/50 p-4">
            <p className="text-xs text-text-tertiary leading-relaxed">
              <strong className="text-text-secondary">How it works:</strong>{" "}
              This is the global default. Individual projects can override this
              setting in their project settings. If a project has no override set,
              it inherits this value.
            </p>
          </div>
        </div>
      )}
    </motion.div>
  );
}
