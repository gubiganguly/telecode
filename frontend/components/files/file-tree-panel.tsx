"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FolderTree, RefreshCw, X, Loader2 } from "lucide-react";
import { FileTreeNode } from "./file-tree-node";
import type { FileNode } from "@/types/api";

interface FileTreePanelProps {
  open: boolean;
  onClose: () => void;
  tree: FileNode[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  projectName: string;
}

export function FileTreePanel({
  open,
  onClose,
  tree,
  loading,
  error,
  onRefresh,
  projectName,
}: FileTreePanelProps) {
  const [spinKey, setSpinKey] = useState(0);

  const handleRefresh = useCallback(() => {
    setSpinKey((k) => k + 1);
    onRefresh();
  }, [onRefresh]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 280, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          className="h-full border-l border-border bg-bg-secondary overflow-hidden flex-shrink-0"
        >
          <div className="flex flex-col h-full w-[280px]">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-border min-h-[52px]">
              <div className="flex items-center gap-2 min-w-0">
                <FolderTree size={16} className="text-accent flex-shrink-0" />
                <span className="text-sm font-semibold text-text-primary truncate">
                  {projectName}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleRefresh}
                  className="p-1.5 rounded-md hover:bg-bg-tertiary text-text-tertiary transition-colors cursor-pointer"
                  title="Refresh"
                >
                  <motion.span
                    key={spinKey}
                    className="flex"
                    animate={spinKey > 0 ? { rotate: 360 } : {}}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                  >
                    <RefreshCw size={14} />
                  </motion.span>
                </button>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-md hover:bg-bg-tertiary text-text-tertiary transition-colors cursor-pointer"
                  title="Close panel"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Tree content */}
            <div className="flex-1 overflow-y-auto py-1.5">
              {loading && tree.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={20} className="text-text-tertiary animate-spin" />
                </div>
              ) : error ? (
                <div className="px-3 py-8 text-center">
                  <p className="text-sm text-error">{error}</p>
                  <button
                    onClick={onRefresh}
                    className="mt-2 text-xs text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                  >
                    Try again
                  </button>
                </div>
              ) : tree.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                  <FolderTree size={24} className="text-text-tertiary mb-3" />
                  <p className="text-sm text-text-tertiary">Empty project</p>
                </div>
              ) : (
                tree.map((node) => (
                  <FileTreeNode key={node.name} node={node} depth={0} />
                ))
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
