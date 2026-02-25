"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal, Plus, Pencil, Trash2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjectCommands } from "@/hooks/use-project-commands";
import type { ProjectCommandInfo } from "@/types/api";

interface ProjectCommandsTabProps {
  projectId: string;
}

export function ProjectCommandsTab({ projectId }: ProjectCommandsTabProps) {
  const { commands, loading, createCommand, updateCommand, deleteCommand } =
    useProjectCommands(projectId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCommand, setEditCommand] = useState<ProjectCommandInfo | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProjectCommandInfo | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [expandedName, setExpandedName] = useState<string | null>(null);

  // Dialog form state
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const openCreate = () => {
    setEditCommand(null);
    setName("");
    setContent("");
    setError("");
    setDialogOpen(true);
  };

  const openEdit = (cmd: ProjectCommandInfo) => {
    setEditCommand(cmd);
    setName(cmd.name);
    setContent(cmd.content);
    setError("");
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) { setError("Command name is required"); return; }
    if (!/^[a-z][a-z0-9-]*$/.test(trimmedName)) {
      setError("Lowercase letters, numbers, and hyphens only");
      return;
    }
    if (!content.trim()) { setError("Content is required"); return; }

    setSaving(true);
    setError("");
    try {
      if (editCommand) {
        await updateCommand(trimmedName, content.trim());
      } else {
        await createCommand(trimmedName, content.trim());
      }
      setDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteCommand(deleteTarget.name);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-text-tertiary">
          Commands scoped to this project
        </p>
        <Button size="sm" className="gap-1.5" onClick={openCreate}>
          <Plus size={14} />
          New
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : commands.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-bg-tertiary flex items-center justify-center mb-3">
            <Terminal size={20} className="text-text-tertiary" />
          </div>
          <p className="text-sm text-text-tertiary mb-4">
            No project commands yet
          </p>
          <Button size="sm" onClick={openCreate} className="gap-1.5">
            <Plus size={14} />
            Create Command
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {commands.map((cmd) => (
            <div
              key={cmd.name}
              className="group rounded-xl border border-border bg-bg-primary transition-colors hover:border-border-focus/50"
            >
              <div className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Terminal size={14} className="text-accent shrink-0" />
                    <span className="text-sm font-mono font-medium text-accent truncate">
                      {cmd.command}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon-sm" onClick={() => openEdit(cmd)}>
                        <Pencil size={13} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setDeleteTarget(cmd)}
                        className="text-text-secondary hover:text-error"
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() =>
                        setExpandedName(expandedName === cmd.name ? null : cmd.name)
                      }
                    >
                      <ChevronDown
                        size={13}
                        className={`transition-transform duration-200 ${
                          expandedName === cmd.name ? "rotate-180" : ""
                        }`}
                      />
                    </Button>
                  </div>
                </div>
                {cmd.description && (
                  <p className="text-xs text-text-tertiary mt-0.5 line-clamp-1 pl-5">
                    {cmd.description}
                  </p>
                )}
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
                    <div className="px-3 pb-3">
                      <pre className="text-xs text-text-secondary font-mono whitespace-pre-wrap break-words bg-bg-secondary rounded-lg p-2 max-h-48 overflow-y-auto">
                        {cmd.content}
                      </pre>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>
          {editCommand ? "Edit Command" : "New Command"}
        </DialogTitle>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Name</label>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono text-text-tertiary">/</span>
              <Input
                value={name}
                onChange={(e) =>
                  setName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
                }
                placeholder="my-command"
                maxLength={100}
                disabled={!!editCommand}
                className="font-mono text-sm"
                autoFocus={!editCommand}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">
              Content <span className="text-text-tertiary">(Markdown)</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={"# /my-command\n\nInstructions for Claude..."}
              rows={10}
              className="w-full resize-y rounded-lg border border-border bg-bg-input px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary font-mono focus:outline-none focus:ring-2 focus:ring-border-focus focus:border-transparent"
              autoFocus={!!editCommand}
            />
          </div>
          {error && <p className="text-sm text-error">{error}</p>}
          <div className="flex gap-3 pt-1">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? "Saving..." : editCommand ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Delete Command</DialogTitle>
        <p className="text-sm text-text-secondary mb-4">
          Delete{" "}
          <strong className="font-mono text-text-primary">
            /{deleteTarget?.name}
          </strong>{" "}
          from this project?
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
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
