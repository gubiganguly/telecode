"use client";

import { useState, useEffect, useCallback } from "react";
import { Save, Loader2, CheckCircle2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjectClaudeMd } from "@/hooks/use-project-claude-md";

interface ProjectClaudeMdTabProps {
  projectId: string;
}

export function ProjectClaudeMdTab({ projectId }: ProjectClaudeMdTabProps) {
  const { content, loading, saving, save } = useProjectClaudeMd(projectId);
  const [localContent, setLocalContent] = useState(content);
  const [showSaved, setShowSaved] = useState(false);
  const hasChanges = localContent !== content;

  useEffect(() => {
    setLocalContent(content);
  }, [content]);

  const handleSave = useCallback(async () => {
    try {
      await save(localContent);
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 3000);
    } catch {
      // error handled upstream
    }
  }, [localContent, save]);

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
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-text-tertiary">
          Project-specific instructions for Claude
        </p>
        <div className="flex items-center gap-2">
          <AnimatePresence>
            {showSaved && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="flex items-center gap-1 text-xs text-success"
              >
                <CheckCircle2 size={12} />
                Saved
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
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Save size={14} />
            )}
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : (
        <>
          <textarea
            value={localContent}
            onChange={(e) => setLocalContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="# Project Instructions&#10;&#10;Add instructions specific to this project..."
            className="w-full min-h-[300px] resize-y rounded-lg border border-border bg-bg-input px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-border-focus focus:border-transparent"
            disabled={saving}
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-text-tertiary">
              Supports Markdown. Only affects this project.
            </p>
            {hasChanges && (
              <p className="text-xs text-text-tertiary">&#8984;S to save</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
