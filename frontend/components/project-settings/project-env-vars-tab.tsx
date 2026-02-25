"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Globe, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useProjectEnvVars } from "@/hooks/use-project-env-vars";

interface ProjectEnvVarsTabProps {
  projectId: string;
}

export function ProjectEnvVarsTab({ projectId }: ProjectEnvVarsTabProps) {
  const {
    envVars,
    globalKeys,
    excludedCredentials,
    loading,
    create,
    update,
    remove,
    excludeCredential,
    includeCredential,
  } = useProjectEnvVars(projectId);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formEnvVar, setFormEnvVar] = useState("");
  const [formValue, setFormValue] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setFormName("");
    setFormEnvVar("");
    setFormValue("");
    setFormError("");
  };

  const openAdd = () => {
    resetForm();
    setShowAdd(true);
  };

  const openEdit = (id: string) => {
    const v = envVars.find((e) => e.id === id);
    if (!v) return;
    setFormName(v.name);
    setFormEnvVar(v.env_var);
    setFormValue("");
    setFormError("");
    setEditId(id);
  };

  const handleCreate = async () => {
    if (!formName.trim() || !formEnvVar.trim() || !formValue.trim()) {
      setFormError("All fields are required");
      return;
    }
    if (!/^[A-Z][A-Z0-9_]*$/.test(formEnvVar.trim())) {
      setFormError("Variable name must be UPPER_SNAKE_CASE");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      await create(formName.trim(), formEnvVar.trim(), formValue.trim());
      setShowAdd(false);
      resetForm();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Failed to create env var"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editId) return;
    setSaving(true);
    setFormError("");
    try {
      const data: { name?: string; env_var?: string; value?: string } = {};
      const original = envVars.find((e) => e.id === editId);
      if (formName.trim() && formName.trim() !== original?.name)
        data.name = formName.trim();
      if (formEnvVar.trim() && formEnvVar.trim() !== original?.env_var) {
        if (!/^[A-Z][A-Z0-9_]*$/.test(formEnvVar.trim())) {
          setFormError("Variable name must be UPPER_SNAKE_CASE");
          setSaving(false);
          return;
        }
        data.env_var = formEnvVar.trim();
      }
      if (formValue.trim()) data.value = formValue.trim();
      if (Object.keys(data).length === 0) {
        setEditId(null);
        return;
      }
      await update(editId, data);
      setEditId(null);
      resetForm();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Failed to update env var"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await remove(deleteId);
    } catch {
      // ignore
    }
    setDeleteId(null);
  };

  const handleToggleCredential = async (key: string, currentlyEnabled: boolean) => {
    if (currentlyEnabled) {
      await excludeCredential(key);
    } else {
      await includeCredential(key);
    }
  };

  // Determine which global keys are overridden by project env vars
  const projectEnvVarNames = new Set(envVars.map((v) => v.env_var));
  const inheritedKeys = globalKeys.filter((k) => !projectEnvVarNames.has(k));
  const overriddenKeys = globalKeys.filter((k) => projectEnvVarNames.has(k));

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-12 rounded-lg bg-bg-tertiary/50 animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-text-tertiary">
          Environment variables injected into Claude&apos;s subprocess
        </p>
        <Button size="sm" onClick={openAdd} className="gap-1.5">
          <Plus size={14} />
          Add
        </Button>
      </div>

      {/* Inherited global keys */}
      {inheritedKeys.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-text-tertiary uppercase tracking-wider">
            Inherited from Global
          </p>
          {inheritedKeys.map((key) => {
            const isExcluded = excludedCredentials.includes(key);
            const isEnabled = !isExcluded;
            return (
              <div
                key={key}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-tertiary/30 border border-border/50",
                  isExcluded && "opacity-50"
                )}
              >
                <Globe size={13} className="text-text-tertiary shrink-0" />
                <code
                  className={cn(
                    "text-xs font-mono text-text-secondary flex-1 truncate",
                    isExcluded && "line-through"
                  )}
                >
                  {key}
                </code>
                <Switch
                  checked={isEnabled}
                  onCheckedChange={() => handleToggleCredential(key, isEnabled)}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Project-specific env vars */}
      {envVars.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-text-tertiary uppercase tracking-wider">
            Project Variables
          </p>
          {envVars.map((v) => (
            <div
              key={v.id}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-tertiary/30 border border-border/50 group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono text-text-primary truncate">
                    {v.env_var}
                  </code>
                  {overriddenKeys.includes(v.env_var) && (
                    <span className="text-[10px] text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded shrink-0">
                      overrides global
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[11px] text-text-tertiary truncate">
                    {v.name}
                  </span>
                  <ArrowRight size={10} className="text-text-tertiary shrink-0" />
                  <code className="text-[11px] font-mono text-text-tertiary truncate">
                    {v.masked_value}
                  </code>
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => openEdit(v.id)}
                  className="p-1 rounded hover:bg-bg-tertiary text-text-tertiary hover:text-text-secondary transition-colors cursor-pointer"
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={() => setDeleteId(v.id)}
                  className="p-1 rounded hover:bg-bg-tertiary text-text-tertiary hover:text-error transition-colors cursor-pointer"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {envVars.length === 0 && inheritedKeys.length === 0 && (
        <div className="text-center py-6">
          <p className="text-sm text-text-tertiary">
            No environment variables configured
          </p>
          <p className="text-xs text-text-tertiary mt-1">
            Add global credentials in Settings, or add project-specific variables
            here
          </p>
        </div>
      )}

      {/* Add dialog */}
      <Dialog open={showAdd} onClose={() => setShowAdd(false)}>
        <DialogTitle>Add Environment Variable</DialogTitle>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-text-secondary mb-1">
              Display Name
            </label>
            <Input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="My Database URL"
              maxLength={100}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">
              Variable Name
            </label>
            <Input
              value={formEnvVar}
              onChange={(e) => setFormEnvVar(e.target.value.toUpperCase())}
              placeholder="DATABASE_URL"
              maxLength={100}
              className="font-mono"
            />
            <p className="text-xs text-text-tertiary mt-1">
              UPPER_SNAKE_CASE (e.g. DATABASE_URL, MY_API_KEY)
            </p>
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">
              Value
            </label>
            <Input
              type="password"
              value={formValue}
              onChange={(e) => setFormValue(e.target.value)}
              placeholder="Enter value..."
            />
          </div>
          {formError && (
            <p className="text-sm text-error">{formError}</p>
          )}
          <div className="flex gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={() => setShowAdd(false)}
              className="flex-1"
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} className="flex-1" disabled={saving}>
              {saving ? "Adding..." : "Add Variable"}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editId} onClose={() => setEditId(null)}>
        <DialogTitle>Edit Environment Variable</DialogTitle>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-text-secondary mb-1">
              Display Name
            </label>
            <Input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              maxLength={100}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">
              Variable Name
            </label>
            <Input
              value={formEnvVar}
              onChange={(e) => setFormEnvVar(e.target.value.toUpperCase())}
              maxLength={100}
              className="font-mono"
            />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">
              New Value{" "}
              <span className="text-text-tertiary">(leave blank to keep current)</span>
            </label>
            <Input
              type="password"
              value={formValue}
              onChange={(e) => setFormValue(e.target.value)}
              placeholder="Enter new value..."
            />
          </div>
          {formError && (
            <p className="text-sm text-error">{formError}</p>
          )}
          <div className="flex gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={() => setEditId(null)}
              className="flex-1"
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdate} className="flex-1" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
        <DialogTitle>Delete Environment Variable</DialogTitle>
        <p className="text-sm text-text-secondary">
          Are you sure you want to delete{" "}
          <code className="font-mono text-text-primary">
            {envVars.find((v) => v.id === deleteId)?.env_var}
          </code>
          ?
          {overriddenKeys.includes(
            envVars.find((v) => v.id === deleteId)?.env_var ?? ""
          ) && (
            <span className="block mt-1 text-xs text-text-tertiary">
              The global value will be inherited again.
            </span>
          )}
        </p>
        <div className="flex gap-3 pt-4">
          <Button
            variant="ghost"
            onClick={() => setDeleteId(null)}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            className="flex-1 bg-error hover:bg-error/90"
          >
            Delete
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
