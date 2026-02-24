"use client";

import { useState, useEffect } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Dialog, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import type { CommandInfo } from "@/types/api";

interface CommandCreateDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: { name: string; content: string }) => Promise<void>;
  editCommand?: CommandInfo | null;
}

export function CommandCreateDialog({
  open,
  onClose,
  onSave,
  editCommand,
}: CommandCreateDialogProps) {
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      if (editCommand) {
        setName(editCommand.name);
        setContent(editCommand.content);
      } else {
        setName("");
        setContent("");
      }
      setDescription("");
      setError("");
    }
  }, [open, editCommand]);

  const handleGenerate = async () => {
    if (!name.trim()) {
      setError("Enter a command name first");
      return;
    }
    if (!description.trim() || description.trim().length < 10) {
      setError("Describe what the command should do (at least 10 characters)");
      return;
    }

    setGenerating(true);
    setError("");
    try {
      const result = await api.generateCommand({
        name: name.trim(),
        description: description.trim(),
      });
      setContent(result.content);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate command"
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Command name is required");
      return;
    }
    if (!/^[a-z][a-z0-9-]*$/.test(trimmedName)) {
      setError("Name must be lowercase letters, numbers, and hyphens (e.g. my-command)");
      return;
    }
    if (!content.trim()) {
      setError("Command content is required");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await onSave({ name: trimmedName, content: content.trim() });
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save command"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>
        {editCommand ? "Edit Command" : "New Slash Command"}
      </DialogTitle>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-text-secondary mb-1.5">
            Command Name
          </label>
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

        {/* AI generation section */}
        {!editCommand && (
          <div className="rounded-lg border border-border bg-bg-primary p-3 space-y-2">
            <label className="block text-sm text-text-secondary">
              Generate with AI
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this command should do... (e.g. 'Analyze the project for security vulnerabilities and generate a report')"
              rows={2}
              maxLength={1000}
              className="w-full resize-none rounded-lg border border-border bg-bg-input px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-border-focus focus:border-transparent"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleGenerate}
              disabled={generating || !name.trim()}
              className="gap-1.5"
            >
              {generating ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Sparkles size={14} />
              )}
              {generating ? "Generating..." : "Generate"}
            </Button>
          </div>
        )}

        <div>
          <label className="block text-sm text-text-secondary mb-1.5">
            Command Content
            <span className="text-text-tertiary ml-1">(Markdown)</span>
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={"# /my-command Command\n\nInstructions for Claude on how to execute this command...\n\n## Arguments Received\n\n`$ARGUMENTS`\n\n## Steps\n\n1. ..."}
            rows={12}
            className="w-full resize-y rounded-lg border border-border bg-bg-input px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary font-mono focus:outline-none focus:ring-2 focus:ring-border-focus focus:border-transparent"
            autoFocus={!!editCommand}
          />
        </div>

        {error && <p className="text-sm text-error">{error}</p>}

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={saving}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button type="submit" disabled={saving || generating} className="flex-1">
            {saving
              ? "Saving..."
              : editCommand
                ? "Update Command"
                : "Create Command"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
