"use client";

import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { SlashCommand } from "@/types/chat";

interface SlashCommandPaletteProps {
  query: string;
  visible: boolean;
  selectedIndex: number;
  onSelect: (command: SlashCommand) => void;
  commands: SlashCommand[];
}

export function SlashCommandPalette({
  query,
  visible,
  selectedIndex,
  onSelect,
  commands,
}: SlashCommandPaletteProps) {
  const filtered = filterCommands(commands, query);

  if (!visible || filtered.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="absolute bottom-full left-0 right-0 mb-2 mx-3 bg-bg-secondary border border-border rounded-xl shadow-xl overflow-hidden"
        initial={{ opacity: 0, y: 8, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.97 }}
        transition={{ duration: 0.12 }}
      >
        <div className="p-1.5 max-h-[240px] overflow-y-auto">
          {filtered.map((cmd, i) => (
            <button
              key={cmd.command}
              className={cn(
                "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left transition-colors cursor-pointer",
                i === selectedIndex
                  ? "bg-accent-muted text-text-primary"
                  : "text-text-secondary hover:bg-bg-tertiary"
              )}
              onClick={() => onSelect(cmd)}
              onMouseDown={(e) => e.preventDefault()} // Prevent blur
            >
              <span className="text-sm font-mono font-medium text-accent">
                {cmd.command}
              </span>
              <span className="text-sm text-text-secondary">{cmd.description}</span>
              {cmd.isCustom && (
                <span className="ml-auto text-[10px] text-text-tertiary bg-bg-tertiary px-1.5 py-0.5 rounded">
                  Custom
                </span>
              )}
            </button>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export function getFilteredCommands(
  commands: SlashCommand[],
  query: string
): SlashCommand[] {
  if (!query.startsWith("/")) return [];
  return filterCommands(commands, query);
}

function filterCommands(commands: SlashCommand[], query: string): SlashCommand[] {
  const q = query.slice(1).toLowerCase();
  return commands.filter(
    (cmd) =>
      cmd.command.slice(1).startsWith(q) ||
      cmd.label.toLowerCase().includes(q)
  );
}
