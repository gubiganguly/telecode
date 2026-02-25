"use client";

import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence } from "framer-motion";
import { ArrowLeft, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SettingsSidebar, type SettingsSection } from "@/components/settings/settings-sidebar";
import { SettingsTabBar } from "@/components/settings/settings-tab-bar";
import { SettingsCommandsSection } from "@/components/settings/settings-commands-section";
import { SettingsCredentialsSection } from "@/components/settings/settings-credentials-section";
import { SettingsMcpsSection } from "@/components/settings/settings-mcps-section";
import { SettingsClaudeMdSection } from "@/components/settings/settings-claude-md-section";
import { CredentialDialog } from "@/components/settings/credential-dialog";
import { CommandCreateDialog } from "@/components/settings/command-create-dialog";
import { McpInstallDialog } from "@/components/settings/mcp-install-dialog";
import { SettingsGitHubSection } from "@/components/settings/settings-github-section";
import { SettingsApprovalsSection } from "@/components/settings/settings-approvals-section";
import { useCredentials } from "@/hooks/use-credentials";
import { useCommands } from "@/hooks/use-commands";
import { useMcps } from "@/hooks/use-mcps";
import { useClaudeMd } from "@/hooks/use-claude-md";
import { useGitHub } from "@/hooks/use-github";
import { useGlobalApprovals } from "@/hooks/use-global-approvals";
import { useMobile } from "@/hooks/use-mobile";
import type { CredentialInfo, CommandInfo } from "@/types/api";

export default function SettingsPage() {
  const { credentials, loading: credentialsLoading, createCredential, updateCredential, deleteCredential } = useCredentials();
  const {
    commands,
    loading: commandsLoading,
    createCommand,
    updateCommand,
    deleteCommand,
  } = useCommands();
  const { mcps, loading: mcpsLoading, refetch: refetchMcps } = useMcps();
  const {
    connected: githubConnected,
    account: githubAccount,
    loading: githubLoading,
    disconnect: githubDisconnect,
    loginUrl: githubLoginUrl,
    refetch: refetchGitHub,
  } = useGitHub();
  const {
    content: claudeMdContent,
    loading: claudeMdLoading,
    saving: claudeMdSaving,
    lastSyncCount: claudeMdSyncCount,
    updateClaudeMd,
    setContent: setClaudeMdContent,
  } = useClaudeMd();
  const {
    enabled: approvalsEnabled,
    loading: approvalsLoading,
    saving: approvalsSaving,
    toggle: toggleApprovals,
  } = useGlobalApprovals();
  const isMobile = useMobile();

  const [activeSection, setActiveSection] = useState<SettingsSection>("claude-md");
  const [showCredentialDialog, setShowCredentialDialog] = useState(false);
  const [editCredential, setEditCredential] = useState<CredentialInfo | null>(null);
  const [showCommandDialog, setShowCommandDialog] = useState(false);
  const [editCommand, setEditCommand] = useState<CommandInfo | null>(null);
  const [showMcpDialog, setShowMcpDialog] = useState(false);

  const contentRef = useRef<HTMLDivElement>(null);

  // Handle GitHub OAuth callback — refetch status and clean up URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("github")) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time URL param init
      setActiveSection("github");
      refetchGitHub();
      window.history.replaceState({}, "", "/settings");
    }
  }, [refetchGitHub]);

  // Reset scroll when switching sections
  useEffect(() => {
    contentRef.current?.scrollTo(0, 0);
  }, [activeSection]);

  const handleCredentialSave = async (data: {
    name: string;
    service: string;
    env_var: string;
    value: string;
  }) => {
    if (editCredential) {
      await updateCredential(editCredential.id, {
        name: data.name,
        service: data.service,
        env_var: data.env_var,
        ...(data.value ? { value: data.value } : {}),
      });
    } else {
      await createCredential(data);
    }
  };

  const handleCredentialEdit = (credential: CredentialInfo) => {
    setEditCredential(credential);
    setShowCredentialDialog(true);
  };

  const handleCloseCredentialDialog = () => {
    setShowCredentialDialog(false);
    setEditCredential(null);
  };

  const handleCommandSave = async (data: { name: string; content: string }) => {
    if (editCommand) {
      await updateCommand(editCommand.name, { content: data.content });
    } else {
      await createCommand(data);
    }
  };

  const handleCommandEdit = (cmd: CommandInfo) => {
    setEditCommand(cmd);
    setShowCommandDialog(true);
  };

  const handleCloseCommandDialog = () => {
    setShowCommandDialog(false);
    setEditCommand(null);
  };

  return (
    <div className="flex h-dvh overflow-hidden">
      {/* Desktop sidebar */}
      {!isMobile && (
        <SettingsSidebar
          activeSection={activeSection}
          onSelectSection={setActiveSection}
          counts={{
            commands: commands.length,
            credentials: credentials.length,
            mcps: mcps.length,
          }}
        />
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        {isMobile && (
          <header className="sticky top-0 z-10 border-b border-border bg-bg-primary/80 backdrop-blur-md">
            <div className="px-4 py-4 flex items-center gap-3">
              <Link href="/projects">
                <Button variant="ghost" size="icon-sm">
                  <ArrowLeft size={18} />
                </Button>
              </Link>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
                  <Zap size={16} className="text-white" />
                </div>
                <h1 className="text-lg font-semibold text-text-primary">
                  Settings
                </h1>
              </div>
            </div>
          </header>
        )}

        {/* Mobile tab bar */}
        {isMobile && (
          <SettingsTabBar
            activeSection={activeSection}
            onSelectSection={setActiveSection}
          />
        )}

        {/* Section content */}
        <main ref={contentRef} className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {activeSection === "claude-md" && (
              <SettingsClaudeMdSection
                key="claude-md"
                content={claudeMdContent}
                loading={claudeMdLoading}
                saving={claudeMdSaving}
                lastSyncCount={claudeMdSyncCount}
                onContentChange={setClaudeMdContent}
                onSave={async (content) => { await updateClaudeMd(content); }}
              />
            )}
            {activeSection === "commands" && (
              <SettingsCommandsSection
                key="commands"
                commands={commands}
                loading={commandsLoading}
                onCreateCommand={() => setShowCommandDialog(true)}
                onEditCommand={handleCommandEdit}
                onDeleteCommand={deleteCommand}
              />
            )}
            {activeSection === "credentials" && (
              <SettingsCredentialsSection
                key="credentials"
                credentials={credentials}
                loading={credentialsLoading}
                onCreateCredential={() => setShowCredentialDialog(true)}
                onEditCredential={handleCredentialEdit}
                onDeleteCredential={deleteCredential}
              />
            )}
            {activeSection === "mcps" && (
              <SettingsMcpsSection
                key="mcps"
                mcps={mcps}
                loading={mcpsLoading}
                onAddMcp={() => setShowMcpDialog(true)}
              />
            )}
            {activeSection === "approvals" && (
              <SettingsApprovalsSection
                key="approvals"
                enabled={approvalsEnabled}
                loading={approvalsLoading}
                saving={approvalsSaving}
                onToggle={toggleApprovals}
              />
            )}
            {activeSection === "github" && (
              <SettingsGitHubSection
                key="github"
                connected={githubConnected}
                account={githubAccount}
                loading={githubLoading}
                loginUrl={githubLoginUrl}
                onDisconnect={githubDisconnect}
              />
            )}
          </AnimatePresence>
        </main>
      </div>

      <CredentialDialog
        open={showCredentialDialog}
        onClose={handleCloseCredentialDialog}
        onSave={handleCredentialSave}
        editCredential={editCredential}
      />

      <CommandCreateDialog
        open={showCommandDialog}
        onClose={handleCloseCommandDialog}
        onSave={handleCommandSave}
        editCommand={editCommand}
      />

      <McpInstallDialog
        open={showMcpDialog}
        onClose={() => setShowMcpDialog(false)}
        onInstalled={refetchMcps}
      />
    </div>
  );
}
