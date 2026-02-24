"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Save, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";

interface SettingsClaudeMdSectionProps {
  content: string;
  loading: boolean;
  saving: boolean;
  lastSyncCount: number;
  onContentChange: (content: string) => void;
  onSave: (content: string) => Promise<void>;
}

export function SettingsClaudeMdSection({
  content,
  loading,
  saving,
  lastSyncCount,
  onContentChange,
  onSave,
}: SettingsClaudeMdSectionProps) {
  const [localContent, setLocalContent] = useState(content);
  const [showSaved, setShowSaved] = useState(false);
  const hasChanges = localContent !== content;

  useEffect(() => {
    setLocalContent(content);
  }, [content]);

  const handleSave = useCallback(async () => {
    try {
      await onSave(localContent);
      onContentChange(localContent);
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 3000);
    } catch {
      // error handled upstream
    }
  }, [localContent, onSave, onContentChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (hasChanges && !saving) {
          handleSave();
        }
      }
    },
    [hasChanges, saving, handleSave]
  );

  return (
    <motion.div
      key="claude-md"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="max-w-3xl mx-auto w-full px-6 py-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
            <FileText size={18} />
            CLAUDE.md
          </h2>
          <p className="text-sm text-text-tertiary mt-0.5">
            Project instructions shared across all projects
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AnimatePresence>
            {showSaved && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="flex items-center gap-1.5 text-sm text-success"
              >
                <CheckCircle2 size={14} />
                <span>Saved to {lastSyncCount} project{lastSyncCount !== 1 ? "s" : ""}</span>
              </motion.div>
            )}
          </AnimatePresence>
          <Button
            size="sm"
            className="gap-1.5"
            disabled={!hasChanges || saving}
            onClick={handleSave}
          >
            {saving ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={14} />
                Save
              </>
            )}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : (
        <div className="space-y-3">
          <Textarea
            value={localContent}
            onChange={(e) => setLocalContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="# Project Instructions&#10;&#10;Add instructions that Claude should follow across all your projects..."
            className="min-h-[400px] font-mono text-[13px] leading-relaxed"
            disabled={saving}
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-text-tertiary">
              Supports Markdown. Changes are synced to all existing projects.
            </p>
            {hasChanges && (
              <p className="text-xs text-text-tertiary">
                &#8984;S to save
              </p>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
