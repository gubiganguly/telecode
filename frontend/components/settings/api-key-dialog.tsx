"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { ApiKeyInfo } from "@/types/api";

const SERVICE_PRESETS: { label: string; service: string; envVar: string }[] = [
  { label: "Anthropic", service: "anthropic", envVar: "ANTHROPIC_API_KEY" },
  { label: "OpenAI", service: "openai", envVar: "OPENAI_API_KEY" },
  { label: "Google AI", service: "google", envVar: "GOOGLE_API_KEY" },
  { label: "AWS", service: "aws", envVar: "AWS_SECRET_ACCESS_KEY" },
  { label: "Stripe", service: "stripe", envVar: "STRIPE_SECRET_KEY" },
];

interface ApiKeyDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    service: string;
    env_var: string;
    value: string;
  }) => Promise<void>;
  editKey?: ApiKeyInfo | null;
}

export function ApiKeyDialog({
  open,
  onClose,
  onSave,
  editKey,
}: ApiKeyDialogProps) {
  const [name, setName] = useState("");
  const [service, setService] = useState("");
  const [envVar, setEnvVar] = useState("");
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      if (editKey) {
        setName(editKey.name);
        setService(editKey.service);
        setEnvVar(editKey.env_var);
        setValue("");
      } else {
        setName("");
        setService("");
        setEnvVar("");
        setValue("");
      }
      setError("");
    }
  }, [open, editKey]);

  const handlePresetSelect = (preset: (typeof SERVICE_PRESETS)[number]) => {
    setService(preset.service);
    if (!envVar) setEnvVar(preset.envVar);
    if (!name) setName(preset.label);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !service.trim() || !envVar.trim()) {
      setError("Name, service, and env variable are required");
      return;
    }
    if (!editKey && !value.trim()) {
      setError("API key value is required");
      return;
    }
    if (!/^[A-Z][A-Z0-9_]*$/.test(envVar.trim())) {
      setError("Env variable must be UPPER_SNAKE_CASE (e.g. MY_API_KEY)");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await onSave({
        name: name.trim(),
        service: service.trim(),
        env_var: envVar.trim(),
        value: value.trim(),
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save API key"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{editKey ? "Edit API Key" : "Add API Key"}</DialogTitle>

      {/* Service presets */}
      {!editKey && (
        <div className="flex flex-wrap gap-2 mb-4">
          {SERVICE_PRESETS.map((preset) => (
            <button
              key={preset.service}
              type="button"
              onClick={() => handlePresetSelect(preset)}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-colors cursor-pointer ${
                service === preset.service
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border text-text-secondary hover:border-text-tertiary hover:text-text-primary"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-text-secondary mb-1.5">
            Name
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Anthropic Production"
            maxLength={100}
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm text-text-secondary mb-1.5">
            Service
          </label>
          <Input
            value={service}
            onChange={(e) => setService(e.target.value)}
            placeholder="e.g. anthropic, openai, stripe"
            maxLength={50}
          />
        </div>

        <div>
          <label className="block text-sm text-text-secondary mb-1.5">
            Environment Variable
          </label>
          <Input
            value={envVar}
            onChange={(e) => setEnvVar(e.target.value.toUpperCase())}
            placeholder="e.g. ANTHROPIC_API_KEY"
            maxLength={100}
            className="font-mono text-xs"
          />
          <p className="text-xs text-text-tertiary mt-1">
            Auto-injected into Claude CLI subprocess
          </p>
        </div>

        <div>
          <label className="block text-sm text-text-secondary mb-1.5">
            {editKey ? "New Value" : "Value"}
            {editKey && (
              <span className="text-text-tertiary ml-1">(leave blank to keep current)</span>
            )}
          </label>
          <Input
            type="password"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={editKey ? "Enter new key to update" : "sk-..."}
          />
        </div>

        {error && <p className="text-sm text-error">{error}</p>}

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={saving}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button type="submit" disabled={saving} className="flex-1">
            {saving ? "Saving..." : editKey ? "Update Key" : "Add Key"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
