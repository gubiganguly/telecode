"use client";

import { useState } from "react";
import { Github, Lock, Globe } from "lucide-react";
import { Dialog, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useGitHub } from "@/hooks/use-github";
import type { ProjectInfo } from "@/types/api";

interface CreateProjectDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, description?: string, useTemplate?: boolean) => Promise<ProjectInfo>;
}

export function CreateProjectDialog({
  open,
  onClose,
  onCreate,
}: CreateProjectDialogProps) {
  const { connected: githubConnected } = useGitHub();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [useTemplate, setUseTemplate] = useState(true);
  const [createRepo, setCreateRepo] = useState(false);
  const [isPrivate, setIsPrivate] = useState(true);
  const [creating, setCreating] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Project name is required");
      return;
    }
    setCreating(true);
    setError("");
    setStatus("");
    try {
      const project = await onCreate(name.trim(), description.trim() || undefined, useTemplate);

      if (createRepo && githubConnected) {
        try {
          setStatus("Creating GitHub repository...");
          const repo = await api.createGitHubRepo({
            name: project.slug,
            description: description.trim(),
            private: isPrivate,
          });
          setStatus("Linking repository...");
          await api.linkGitHubRepo(project.id, repo.html_url);
          setStatus("Pushing to GitHub...");
          await api.pushToGitHub(project.id);
        } catch (ghErr) {
          // GitHub steps failed but project was created successfully
          console.error("GitHub setup failed:", ghErr);
        }
      }

      setName("");
      setDescription("");
      setUseTemplate(true);
      setCreateRepo(false);
      setStatus("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setCreating(false);
      setStatus("");
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>New Project</DialogTitle>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-text-secondary mb-1.5">
            Name
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Awesome App"
            maxLength={100}
            autoFocus
          />
        </div>
        <div>
          <label className="block text-sm text-text-secondary mb-1.5">
            Description <span className="text-text-tertiary">(optional)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A brief description of your project"
            maxLength={500}
            rows={3}
            className="flex w-full rounded-lg border border-border bg-bg-input px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary transition-colors focus:outline-none focus:ring-2 focus:ring-border-focus focus:border-transparent resize-none"
          />
        </div>

        {/* Template import option */}
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={useTemplate}
            onChange={(e) => setUseTemplate(e.target.checked)}
            className="w-4 h-4 mt-0.5 rounded border-border accent-accent"
          />
          <div>
            <span className="text-sm text-text-secondary">
              Import global template
            </span>
            <p className="text-xs text-text-tertiary mt-0.5">
              Copies your global CLAUDE.md and slash commands into this project
            </p>
          </div>
        </label>

        {/* GitHub repo option */}
        {githubConnected ? (
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={createRepo}
                onChange={(e) => setCreateRepo(e.target.checked)}
                className="w-4 h-4 rounded border-border accent-accent"
              />
              <span className="flex items-center gap-1.5 text-sm text-text-secondary">
                <Github size={14} />
                Create GitHub repository
              </span>
            </label>
            {createRepo && (
              <div className="flex gap-2 ml-7">
                <button
                  type="button"
                  onClick={() => setIsPrivate(true)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    isPrivate
                      ? "bg-accent-muted text-accent"
                      : "bg-bg-tertiary text-text-tertiary hover:text-text-secondary"
                  }`}
                >
                  <Lock size={12} />
                  Private
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrivate(false)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    !isPrivate
                      ? "bg-accent-muted text-accent"
                      : "bg-bg-tertiary text-text-tertiary hover:text-text-secondary"
                  }`}
                >
                  <Globe size={12} />
                  Public
                </button>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-text-tertiary">
            <a href="/settings" className="text-accent hover:underline">
              Connect GitHub in Settings
            </a>{" "}
            to create repos for your projects
          </p>
        )}

        {status && (
          <p className="text-sm text-accent">{status}</p>
        )}
        {error && (
          <p className="text-sm text-error">{error}</p>
        )}
        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={creating}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={creating || !name.trim()}
            className="flex-1"
          >
            {creating ? (status || "Creating...") : "Create Project"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
