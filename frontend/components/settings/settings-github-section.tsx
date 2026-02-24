"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Github, ExternalLink, LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { GitHubAccountInfo } from "@/types/api";

interface SettingsGitHubSectionProps {
  connected: boolean;
  account: GitHubAccountInfo | null;
  loading: boolean;
  loginUrl: string;
  onDisconnect: () => Promise<void>;
}

export function SettingsGitHubSection({
  connected,
  account,
  loading,
  loginUrl,
  onDisconnect,
}: SettingsGitHubSectionProps) {
  const [disconnecting, setDisconnecting] = useState(false);

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await onDisconnect();
    } finally {
      setDisconnecting(false);
    }
  };

  const handleConnect = () => {
    window.location.href = loginUrl;
  };

  return (
    <motion.div
      key="github"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="max-w-3xl mx-auto w-full px-6 py-6"
    >
      <div className="mb-6">
        <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
          <Github size={18} />
          GitHub
        </h2>
        <p className="text-sm text-text-tertiary mt-0.5">
          Connect your GitHub account to create repos and push code
        </p>
      </div>

      {loading ? (
        <Skeleton className="h-32 rounded-xl" />
      ) : connected && account ? (
        <div className="rounded-xl border border-border bg-bg-secondary p-5">
          <div className="flex items-center gap-4">
            {account.avatar_url && (
              <Image
                src={account.avatar_url}
                alt={account.github_username}
                width={48}
                height={48}
                className="rounded-full"
                unoptimized
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary">
                {account.github_username}
              </p>
              <p className="text-xs text-text-tertiary mt-0.5">
                Connected to GitHub
              </p>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={`https://github.com/${account.github_username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-md hover:bg-bg-tertiary text-text-tertiary hover:text-text-primary transition-colors"
              >
                <ExternalLink size={16} />
              </a>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="text-text-tertiary hover:text-error gap-1.5"
              >
                {disconnecting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <LogOut size={14} />
                )}
                Disconnect
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-bg-tertiary flex items-center justify-center mb-4">
            <Github size={24} className="text-text-tertiary" />
          </div>
          <h3 className="text-base font-medium text-text-primary mb-1">
            Not connected
          </h3>
          <p className="text-sm text-text-tertiary mb-6 max-w-sm">
            Connect your GitHub account to create repositories and push code
            directly from CasperBot.
          </p>
          <Button onClick={handleConnect} className="gap-2">
            <Github size={16} />
            Connect GitHub
          </Button>
        </div>
      )}

      {/* Info */}
      {!connected && !loading && (
        <div className="mt-6 rounded-xl border border-border bg-bg-secondary p-5">
          <p className="text-xs text-text-tertiary leading-relaxed">
            CasperBot uses GitHub OAuth to securely connect your account. Your
            access token is encrypted and stored locally — it is never sent to
            any third party.
          </p>
        </div>
      )}
    </motion.div>
  );
}
