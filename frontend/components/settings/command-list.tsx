"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal, Pencil, Trash2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { CommandInfo } from "@/types/api";

interface CommandListProps {
  commands: CommandInfo[];
  onEdit: (command: CommandInfo) => void;
  onDelete: (name: string) => Promise<void>;
}

export function CommandList({ commands, onEdit, onDelete }: CommandListProps) {
  const [deleteTarget, setDeleteTarget] = useState<CommandInfo | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [expandedName, setExpandedName] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await onDelete(deleteTarget.name);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="space-y-3">
        {commands.map((cmd, i) => (
          <motion.div
            key={cmd.name}
            className="group rounded-xl border border-border bg-bg-secondary transition-colors hover:border-border-focus/50"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: i * 0.04 }}
          >
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                    <Terminal size={16} className="text-accent" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-mono font-medium text-accent">
                        {cmd.command}
                      </h3>
                      <Badge variant="default" className="text-xs">
                        {cmd.is_builtin ? "Built-in" : "Custom"}
                      </Badge>
                    </div>
                    <p className="text-xs text-text-tertiary mt-0.5 line-clamp-1">
                      {cmd.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {!cmd.is_builtin && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onEdit(cmd)}
                      >
                        <Pencil size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setDeleteTarget(cmd)}
                        className="text-text-secondary hover:text-error"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() =>
                      setExpandedName(expandedName === cmd.name ? null : cmd.name)
                    }
                    className="transition-transform"
                  >
                    <ChevronDown
                      size={14}
                      className={`transition-transform duration-200 ${
                        expandedName === cmd.name ? "rotate-180" : ""
                      }`}
                    />
                  </Button>
                </div>
              </div>
            </div>

            <AnimatePresence>
              {expandedName === cmd.name && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 pt-0">
                    <div className="border-t border-border/50 pt-3">
                      <pre className="text-xs text-text-secondary font-mono whitespace-pre-wrap break-words bg-bg-primary rounded-lg p-3 max-h-64 overflow-y-auto">
                        {cmd.content}
                      </pre>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Delete Command</DialogTitle>
        <p className="text-sm text-text-secondary mb-2">
          Are you sure you want to delete{" "}
          <strong className="text-text-primary font-mono">
            /{deleteTarget?.name}
          </strong>
          ?
        </p>
        <p className="text-sm text-text-tertiary mb-6">
          This command will no longer be available in the chat palette or in new
          projects.
        </p>
        <div className="flex gap-3">
          <Button
            variant="ghost"
            onClick={() => setDeleteTarget(null)}
            disabled={deleting}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1"
          >
            {deleting ? "Deleting..." : "Delete Command"}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
