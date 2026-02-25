"use client";

import { motion } from "framer-motion";
import { Key, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CredentialList } from "@/components/settings/credential-list";
import type { CredentialInfo } from "@/types/api";

interface SettingsCredentialsSectionProps {
  credentials: CredentialInfo[];
  loading: boolean;
  onCreateCredential: () => void;
  onEditCredential: (credential: CredentialInfo) => void;
  onDeleteCredential: (id: string) => Promise<void>;
}

export function SettingsCredentialsSection({
  credentials,
  loading,
  onCreateCredential,
  onEditCredential,
  onDeleteCredential,
}: SettingsCredentialsSectionProps) {
  return (
    <motion.div
      key="credentials"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="max-w-3xl mx-auto w-full px-6 py-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
            <Key size={18} />
            Credentials
          </h2>
          <p className="text-sm text-text-tertiary mt-0.5">
            Encrypted keys auto-injected into Claude CLI sessions
          </p>
        </div>
        <Button
          size="sm"
          className="gap-1.5"
          onClick={onCreateCredential}
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Add Credential</span>
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : credentials.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-bg-tertiary flex items-center justify-center mb-4">
            <Key size={24} className="text-text-tertiary" />
          </div>
          <h3 className="text-base font-medium text-text-primary mb-1">
            No credentials yet
          </h3>
          <p className="text-sm text-text-tertiary mb-6 max-w-sm">
            Add API keys to automatically inject them as environment
            variables in your Claude CLI sessions.
          </p>
          <Button onClick={onCreateCredential} className="gap-1.5">
            <Plus size={16} />
            Add Your First Credential
          </Button>
        </div>
      ) : (
        <CredentialList
          credentials={credentials}
          onEdit={onEditCredential}
          onDelete={onDeleteCredential}
        />
      )}
    </motion.div>
  );
}
