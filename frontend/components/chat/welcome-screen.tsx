"use client";

import { motion } from "framer-motion";
import { Zap, GitCommit, Bug, FlaskConical, FileCode } from "lucide-react";

interface WelcomeScreenProps {
  onQuickAction: (command: string) => void;
}

const quickActions = [
  { command: "/test", label: "Run Tests", icon: FlaskConical },
  { command: "/commit", label: "Commit", icon: GitCommit },
  { command: "/fix", label: "Fix Errors", icon: Bug },
  { command: "/review", label: "Review Code", icon: FileCode },
];

export function WelcomeScreen({ onQuickAction }: WelcomeScreenProps) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center flex-1 px-6 py-12"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mb-6">
        <Zap size={24} className="text-accent" />
      </div>

      <h2 className="text-xl font-semibold text-text-primary mb-2">
        What can I help you with?
      </h2>
      <p className="text-sm text-text-secondary text-center max-w-xs mb-8">
        Start typing a message or use a quick action below.
      </p>

      <div className="flex flex-wrap gap-2 justify-center">
        {quickActions.map(({ command, label, icon: Icon }) => (
          <motion.button
            key={command}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-bg-secondary text-sm text-text-secondary hover:text-text-primary hover:border-border-focus/50 transition-colors cursor-pointer"
            onClick={() => onQuickAction(command)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Icon size={14} />
            {label}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
