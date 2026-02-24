"use client";

import { motion } from "framer-motion";
import { Key, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiKeyList } from "@/components/settings/api-key-list";
import type { ApiKeyInfo } from "@/types/api";

interface SettingsApiKeysSectionProps {
  keys: ApiKeyInfo[];
  loading: boolean;
  onCreateKey: () => void;
  onEditKey: (key: ApiKeyInfo) => void;
  onDeleteKey: (id: string) => Promise<void>;
}

export function SettingsApiKeysSection({
  keys,
  loading,
  onCreateKey,
  onEditKey,
  onDeleteKey,
}: SettingsApiKeysSectionProps) {
  return (
    <motion.div
      key="api-keys"
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
            API Keys
          </h2>
          <p className="text-sm text-text-tertiary mt-0.5">
            Encrypted keys auto-injected into Claude CLI sessions
          </p>
        </div>
        <Button
          size="sm"
          className="gap-1.5"
          onClick={onCreateKey}
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Add Key</span>
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : keys.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-bg-tertiary flex items-center justify-center mb-4">
            <Key size={24} className="text-text-tertiary" />
          </div>
          <h3 className="text-base font-medium text-text-primary mb-1">
            No API keys yet
          </h3>
          <p className="text-sm text-text-tertiary mb-6 max-w-sm">
            Add API keys to automatically inject them as environment
            variables in your Claude CLI sessions.
          </p>
          <Button onClick={onCreateKey} className="gap-1.5">
            <Plus size={16} />
            Add Your First Key
          </Button>
        </div>
      ) : (
        <ApiKeyList
          keys={keys}
          onEdit={onEditKey}
          onDelete={onDeleteKey}
        />
      )}
    </motion.div>
  );
}
