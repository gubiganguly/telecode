"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { GitBranch, FileText, Trash2, MoreVertical, Upload, Github, Loader2, Pin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTitle } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { formatRelativeTime, truncate } from "@/lib/utils";
import type { ProjectInfo } from "@/types/api";

interface ProjectCardProps {
  project: ProjectInfo;
  onDelete: (id: string, deleteFiles: boolean, deleteRepo: boolean) => Promise<void>;
  index: number;
}

export function ProjectCard({ project, onDelete, index }: ProjectCardProps) {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteRepo, setDeleteRepo] = useState(false);
  const [pushing, setPushing] = useState(false);

  const handleClick = () => {
    router.push(`/chat/${project.id}`);
  };

  const handleDelete = async (deleteFiles: boolean) => {
    setDeleting(true);
    try {
      await onDelete(project.id, deleteFiles, deleteRepo);
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
      setDeleteRepo(false);
    }
  };

  const handlePush = async () => {
    setPushing(true);
    try {
      await api.pushToGitHub(project.id);
    } catch (err) {
      console.error("Push failed:", err);
    } finally {
      setPushing(false);
    }
  };

  const hasGitHubRepo = Boolean(project.github_repo_url);

  return (
    <>
      <motion.div
        className="group relative rounded-xl border border-border bg-bg-secondary p-5 cursor-pointer transition-colors hover:border-border-focus/50"
        onClick={handleClick}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: index * 0.05 }}
        whileHover={{ y: -2 }}
      >
        {/* Menu button — only show if there are menu actions */}
        {(!project.is_system || hasGitHubRepo) && (
          <button
            className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-bg-tertiary text-text-tertiary hover:text-text-primary cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
          >
            <MoreVertical size={16} />
          </button>
        )}

        {/* Dropdown menu */}
        {showMenu && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(false);
              }}
            />
            <div
              className="absolute top-10 right-4 z-20 bg-bg-tertiary border border-border rounded-lg shadow-xl py-1 min-w-[160px]"
              onClick={(e) => e.stopPropagation()}
            >
              {hasGitHubRepo && (
                <button
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-text-secondary hover:bg-bg-secondary transition-colors cursor-pointer"
                  disabled={pushing}
                  onClick={async () => {
                    setShowMenu(false);
                    await handlePush();
                  }}
                >
                  {pushing ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Upload size={14} />
                  )}
                  {pushing ? "Pushing..." : "Push to GitHub"}
                </button>
              )}
              {!project.is_system && (
                <button
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-error hover:bg-error/10 transition-colors cursor-pointer"
                  onClick={() => {
                    setShowMenu(false);
                    setShowDeleteConfirm(true);
                  }}
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              )}
            </div>
          </>
        )}

        <h3 className="text-base font-semibold text-text-primary mb-1.5 pr-8">
          {project.name}
        </h3>

        {project.description && (
          <p className="text-sm text-text-secondary mb-3 line-clamp-2">
            {truncate(project.description, 120)}
          </p>
        )}

        <div className="flex items-center gap-3 text-xs text-text-tertiary">
          {project.is_pinned && (
            <Badge variant="default" className="gap-1">
              <Pin size={11} />
              Pinned
            </Badge>
          )}
          {project.has_git && project.git_branch && (
            <Badge variant="default" className="gap-1">
              <GitBranch size={11} />
              {project.git_branch}
            </Badge>
          )}
          {hasGitHubRepo && (
            <Badge variant="default" className="gap-1">
              <Github size={11} />
              GitHub
            </Badge>
          )}
          {project.file_count !== null && (
            <span className="flex items-center gap-1">
              <FileText size={11} />
              {project.file_count} files
            </span>
          )}
          <span className="ml-auto">
            {formatRelativeTime(project.updated_at)}
          </span>
        </div>
      </motion.div>

      {/* Delete confirmation */}
      <Dialog open={showDeleteConfirm} onClose={() => { setShowDeleteConfirm(false); setDeleteRepo(false); }}>
        <DialogTitle>Delete &ldquo;{project.name}&rdquo;?</DialogTitle>
        <p className="text-sm text-text-secondary mb-4">
          This will remove the project from CasperBot. You can choose whether to
          also delete the files from disk.
        </p>

        {hasGitHubRepo && (
          <label className="flex items-center gap-2.5 mb-5 px-3 py-3 rounded-lg border border-border bg-bg-tertiary cursor-pointer select-none">
            <input
              type="checkbox"
              checked={deleteRepo}
              onChange={(e) => setDeleteRepo(e.target.checked)}
              className="w-4 h-4 rounded border-border accent-error"
            />
            <div className="flex items-center gap-1.5 text-sm text-text-secondary">
              <Github size={14} />
              Also delete the GitHub repository
            </div>
          </label>
        )}

        <div className="flex flex-col gap-2">
          <Button
            variant="destructive"
            onClick={() => handleDelete(true)}
            disabled={deleting}
          >
            {deleting ? "Deleting..." : "Delete project and files"}
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleDelete(false)}
            disabled={deleting}
          >
            Remove from CasperBot only
          </Button>
          <Button
            variant="ghost"
            onClick={() => { setShowDeleteConfirm(false); setDeleteRepo(false); }}
            disabled={deleting}
          >
            Cancel
          </Button>
        </div>
      </Dialog>
    </>
  );
}
