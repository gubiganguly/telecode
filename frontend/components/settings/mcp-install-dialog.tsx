"use client";

import { useState, useEffect } from "react";
import { Loader2, Plug, CheckCircle2 } from "lucide-react";
import { Dialog, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

interface McpInstallDialogProps {
  open: boolean;
  onClose: () => void;
  onInstalled: () => void;
}

export function McpInstallDialog({
  open,
  onClose,
  onInstalled,
}: McpInstallDialogProps) {
  const [query, setQuery] = useState("");
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{
    name: string;
    message: string;
    command_executed: string;
  } | null>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setError("");
      setSuccess(null);
      setInstalling(false);
    }
  }, [open]);

  const handleInstall = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = query.trim();
    if (!trimmed) {
      setError("Describe the MCP you want to install");
      return;
    }
    if (trimmed.length < 3) {
      setError("Please be more specific (at least 3 characters)");
      return;
    }

    setInstalling(true);
    setError("");
    setSuccess(null);

    try {
      const result = await api.installMcp({ query: trimmed });
      setSuccess({
        name: result.name,
        message: result.message,
        command_executed: result.command_executed,
      });
      onInstalled();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to install MCP"
      );
    } finally {
      setInstalling(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Add MCP Server</DialogTitle>

      {success ? (
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-success/10 border border-success/20">
            <CheckCircle2 size={20} className="text-success shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-text-primary">
                {success.message}
              </p>
              <p className="text-xs font-mono text-text-tertiary mt-1 break-all">
                {success.command_executed}
              </p>
            </div>
          </div>
          <Button onClick={onClose} className="w-full">
            Done
          </Button>
        </div>
      ) : (
        <form onSubmit={handleInstall} className="space-y-4">
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">
              What MCP do you want to install?
            </label>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder='e.g. "add the context7 mcp" or "playwright browser automation"'
              maxLength={500}
              disabled={installing}
              autoFocus
            />
            <p className="text-xs text-text-tertiary mt-1.5">
              Describe the MCP in plain English. We&apos;ll figure out the rest.
            </p>
          </div>

          {error && <p className="text-sm text-error">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={installing}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={installing}
              className="flex-1 gap-1.5"
            >
              {installing ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Installing...
                </>
              ) : (
                <>
                  <Plug size={14} />
                  Install
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
