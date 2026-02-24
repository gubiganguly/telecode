"use client";

import { motion } from "framer-motion";
import { Terminal, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CommandList } from "@/components/settings/command-list";
import type { CommandInfo } from "@/types/api";

interface SettingsCommandsSectionProps {
  commands: CommandInfo[];
  loading: boolean;
  onCreateCommand: () => void;
  onEditCommand: (cmd: CommandInfo) => void;
  onDeleteCommand: (name: string) => Promise<void>;
}

export function SettingsCommandsSection({
  commands,
  loading,
  onCreateCommand,
  onEditCommand,
  onDeleteCommand,
}: SettingsCommandsSectionProps) {
  return (
    <motion.div
      key="commands"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="max-w-3xl mx-auto w-full px-6 py-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
            <Terminal size={18} />
            Slash Commands
          </h2>
          <p className="text-sm text-text-tertiary mt-0.5">
            Custom commands available in all projects
          </p>
        </div>
        <Button
          size="sm"
          className="gap-1.5"
          onClick={onCreateCommand}
        >
          <Plus size={16} />
          <span className="hidden sm:inline">New Command</span>
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : commands.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-bg-tertiary flex items-center justify-center mb-4">
            <Terminal size={24} className="text-text-tertiary" />
          </div>
          <h3 className="text-base font-medium text-text-primary mb-1">
            No commands yet
          </h3>
          <p className="text-sm text-text-tertiary mb-6 max-w-sm">
            Create custom slash commands to automate common workflows across
            all your projects.
          </p>
          <Button onClick={onCreateCommand} className="gap-1.5">
            <Plus size={16} />
            Create Your First Command
          </Button>
        </div>
      ) : (
        <CommandList
          commands={commands}
          onEdit={onEditCommand}
          onDelete={onDeleteCommand}
        />
      )}
    </motion.div>
  );
}
