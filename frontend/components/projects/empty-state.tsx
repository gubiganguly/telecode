"use client";

import { motion } from "framer-motion";
import { FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  onCreateProject: () => void;
}

export function EmptyState({ onCreateProject }: EmptyStateProps) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-20 px-4 text-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="w-16 h-16 rounded-2xl bg-bg-tertiary flex items-center justify-center mb-6">
        <FolderPlus size={28} className="text-text-tertiary" />
      </div>
      <h2 className="text-xl font-semibold text-text-primary mb-2">
        No projects yet
      </h2>
      <p className="text-text-secondary text-sm max-w-xs mb-8">
        Create your first project to start coding with Claude Code from anywhere.
      </p>
      <Button onClick={onCreateProject} size="lg">
        Create Your First Project
      </Button>
    </motion.div>
  );
}
