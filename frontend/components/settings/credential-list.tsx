"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Key, Pencil, Trash2, Copy, Check, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "@/lib/utils";
import { api } from "@/lib/api";
import type { CredentialInfo } from "@/types/api";

interface CredentialListProps {
  credentials: CredentialInfo[];
  onEdit: (credential: CredentialInfo) => void;
  onDelete: (id: string) => Promise<void>;
}

export function CredentialList({ credentials, onEdit, onDelete }: CredentialListProps) {
  const [deleteTarget, setDeleteTarget] = useState<CredentialInfo | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [revealedKeys, setRevealedKeys] = useState<Record<string, string>>({});
  const [loadingReveal, setLoadingReveal] = useState<string | null>(null);
  const [copiedValueId, setCopiedValueId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await onDelete(deleteTarget.id);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleCopyEnvVar = async (credential: CredentialInfo) => {
    await navigator.clipboard.writeText(credential.env_var);
    setCopiedId(credential.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggleReveal = async (credential: CredentialInfo) => {
    if (revealedKeys[credential.id]) {
      setRevealedKeys((prev) => {
        const next = { ...prev };
        delete next[credential.id];
        return next;
      });
      return;
    }

    setLoadingReveal(credential.id);
    try {
      const { value } = await api.getCredentialValue(credential.id);
      setRevealedKeys((prev) => ({ ...prev, [credential.id]: value }));
    } finally {
      setLoadingReveal(null);
    }
  };

  const handleCopyValue = async (credential: CredentialInfo) => {
    let value = revealedKeys[credential.id];
    if (!value) {
      const res = await api.getCredentialValue(credential.id);
      value = res.value;
    }
    await navigator.clipboard.writeText(value);
    setCopiedValueId(credential.id);
    setTimeout(() => setCopiedValueId(null), 2000);
  };

  return (
    <>
      <div className="space-y-3">
        {credentials.map((credential, i) => (
          <motion.div
            key={credential.id}
            className="group rounded-xl border border-border bg-bg-secondary p-4 transition-colors hover:border-border-focus/50"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: i * 0.04 }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                  <Key size={16} className="text-accent" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-medium text-text-primary truncate">
                    {credential.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="default" className="text-xs">
                      {credential.service}
                    </Badge>
                    <button
                      onClick={() => handleCopyEnvVar(credential)}
                      className="flex items-center gap-1 text-xs font-mono text-text-tertiary hover:text-text-secondary transition-colors cursor-pointer"
                    >
                      {credential.env_var}
                      {copiedId === credential.id ? (
                        <Check size={11} className="text-green-500" />
                      ) : (
                        <Copy size={11} />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onEdit(credential)}
                >
                  <Pencil size={14} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setDeleteTarget(credential)}
                  className="text-text-secondary hover:text-error"
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-border/50">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-mono text-text-tertiary truncate min-w-0">
                  {revealedKeys[credential.id] || credential.masked_value}
                </span>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    onClick={() => handleToggleReveal(credential)}
                    disabled={loadingReveal === credential.id}
                    className="p-1 rounded text-text-tertiary hover:text-text-secondary transition-colors cursor-pointer disabled:opacity-50"
                    title={revealedKeys[credential.id] ? "Hide value" : "Reveal value"}
                  >
                    {revealedKeys[credential.id] ? (
                      <EyeOff size={13} />
                    ) : (
                      <Eye size={13} />
                    )}
                  </button>
                  <button
                    onClick={() => handleCopyValue(credential)}
                    className="p-1 rounded text-text-tertiary hover:text-text-secondary transition-colors cursor-pointer"
                    title="Copy value"
                  >
                    {copiedValueId === credential.id ? (
                      <Check size={13} className="text-green-500" />
                    ) : (
                      <Copy size={13} />
                    )}
                  </button>
                </div>
              </div>
              <span className="text-xs text-text-tertiary shrink-0">
                {formatRelativeTime(credential.created_at)}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Delete confirmation */}
      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
      >
        <DialogTitle>Delete Credential</DialogTitle>
        <p className="text-sm text-text-secondary mb-2">
          Are you sure you want to delete{" "}
          <strong className="text-text-primary">{deleteTarget?.name}</strong>?
        </p>
        <p className="text-sm text-text-tertiary mb-6">
          The environment variable{" "}
          <code className="font-mono text-xs bg-bg-tertiary px-1.5 py-0.5 rounded">
            {deleteTarget?.env_var}
          </code>{" "}
          will no longer be injected into new Claude sessions.
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
            {deleting ? "Deleting..." : "Delete Credential"}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
