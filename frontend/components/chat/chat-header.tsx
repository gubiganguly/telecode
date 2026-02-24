"use client";

import { useState, useCallback } from "react";
import { Menu, Wifi, WifiOff, FolderTree, Upload, GitBranch, Github, Loader2 } from "lucide-react";
import { useEffect } from "react";
import { wsManager, type ConnectionStatus } from "@/lib/websocket";
import { useStore } from "@/lib/store";
import { useGitHub } from "@/hooks/use-github";
import { api } from "@/lib/api";
import { ModelSelector } from "./model-selector";
import { cn } from "@/lib/utils";

interface ChatHeaderProps {
  projectName: string;
  sessionName: string;
  onOpenSidebar: () => void;
  onToggleFileTree: () => void;
  showMenuButton: boolean;
  fileTreeOpen: boolean;
}

export function ChatHeader({
  projectName,
  sessionName,
  onOpenSidebar,
  onToggleFileTree,
  showMenuButton,
  fileTreeOpen,
}: ChatHeaderProps) {
  const [wsStatus, setWsStatus] = useState<ConnectionStatus>(
    wsManager.getStatus()
  );
  const [pushing, setPushing] = useState(false);
  const [pushStatus, setPushStatus] = useState("");
  const [initingGit, setInitingGit] = useState(false);

  const currentProject = useStore((s) => s.currentProject);
  const fetchProject = useStore((s) => s.fetchProject);
  const { connected: githubConnected, loading: githubLoading } = useGitHub();

  const hasGit = currentProject?.has_git ?? false;
  const hasGitHubRepo = Boolean(currentProject?.github_repo_url);

  useEffect(() => {
    return wsManager.onStatusChange(setWsStatus);
  }, []);

  const isConnected = wsStatus === "connected";

  const handlePush = useCallback(async () => {
    if (!currentProject) return;
    setPushing(true);
    setPushStatus("Pushing...");
    try {
      await api.pushToGitHub(currentProject.id);
      setPushStatus("");
    } catch (err) {
      console.error("Push failed:", err);
      setPushStatus("");
    } finally {
      setPushing(false);
    }
  }, [currentProject]);

  const handleCreateRepoAndPush = useCallback(async () => {
    if (!currentProject) return;
    setPushing(true);
    try {
      setPushStatus("Creating repo...");
      const repo = await api.createGitHubRepo({
        name: currentProject.slug,
        description: currentProject.description,
        private: true,
      });
      setPushStatus("Linking...");
      await api.linkGitHubRepo(currentProject.id, repo.html_url);
      setPushStatus("Pushing...");
      await api.pushToGitHub(currentProject.id);
      setPushStatus("");
      fetchProject(currentProject.id);
    } catch (err) {
      console.error("Create repo & push failed:", err);
      setPushStatus("");
      // Still refresh in case repo was created but push failed
      fetchProject(currentProject.id);
    } finally {
      setPushing(false);
    }
  }, [currentProject, fetchProject]);

  const handleGitInit = useCallback(async () => {
    if (!currentProject) return;
    setInitingGit(true);
    try {
      await api.gitInitProject(currentProject.id);
      fetchProject(currentProject.id);
    } catch (err) {
      console.error("Git init failed:", err);
    } finally {
      setInitingGit(false);
    }
  }, [currentProject, fetchProject]);

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-bg-primary/80 backdrop-blur-md min-h-[52px]">
      {showMenuButton && (
        <button
          onClick={onOpenSidebar}
          className="p-2 -ml-2 rounded-lg hover:bg-bg-tertiary text-text-secondary transition-colors cursor-pointer"
        >
          <Menu size={20} />
        </button>
      )}

      <div className="flex-1 min-w-0">
        <h1 className="text-sm font-semibold text-text-primary truncate">
          {sessionName}
        </h1>
        <p className="text-xs text-text-tertiary truncate">{projectName}</p>
      </div>

      <div className="flex items-center gap-2">
        {/* No git → Init Git */}
        {!hasGit && currentProject && (
          <button
            onClick={handleGitInit}
            disabled={initingGit}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-text-secondary hover:bg-bg-tertiary transition-colors cursor-pointer disabled:opacity-50"
            title="Initialize git repository"
          >
            {initingGit ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <GitBranch size={13} />
            )}
            <span className="hidden sm:inline">Init Git</span>
          </button>
        )}

        {/* Has git, no GitHub repo, GitHub connected → Push to GitHub (creates repo first) */}
        {hasGit && !hasGitHubRepo && githubConnected && !githubLoading && currentProject && (
          <button
            onClick={handleCreateRepoAndPush}
            disabled={pushing}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-text-secondary hover:bg-bg-tertiary transition-colors cursor-pointer disabled:opacity-50"
            title="Create GitHub repo and push"
          >
            {pushing ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Github size={13} />
            )}
            <span className="hidden sm:inline">{pushStatus || "Push to GitHub"}</span>
          </button>
        )}

        {/* Has GitHub repo → Push */}
        {hasGitHubRepo && (
          <button
            onClick={handlePush}
            disabled={pushing}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-text-secondary hover:bg-bg-tertiary transition-colors cursor-pointer disabled:opacity-50"
            title="Push to GitHub"
          >
            {pushing ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Upload size={13} />
            )}
            <span className="hidden sm:inline">{pushStatus || "Push"}</span>
          </button>
        )}

        <ModelSelector />

        <button
          onClick={onToggleFileTree}
          className={cn(
            "p-1.5 rounded-md transition-colors cursor-pointer",
            fileTreeOpen
              ? "bg-accent-muted text-accent"
              : "hover:bg-bg-tertiary text-text-tertiary"
          )}
          title="Toggle file tree"
        >
          <FolderTree size={16} />
        </button>

        <div
          className={cn(
            "flex items-center gap-1.5 text-xs",
            isConnected ? "text-success" : "text-error"
          )}
        >
          {isConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
        </div>
      </div>
    </div>
  );
}
