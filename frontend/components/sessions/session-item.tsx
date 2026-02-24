"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, Pencil, MessageCircleQuestion } from "lucide-react";
import { cn, truncate } from "@/lib/utils";
import type { SessionInfo } from "@/types/api";
import type { SessionStatus } from "@/types/chat";

interface SessionItemProps {
  session: SessionInfo;
  isActive: boolean;
  status: SessionStatus;
  onSelect: () => void;
  onDelete: () => void;
  onRename: (name: string) => void;
}

export function SessionItem({
  session,
  isActive,
  status,
  onSelect,
  onDelete,
  onRename,
}: SessionItemProps) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(session.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const startEditing = () => {
    setEditName(session.name);
    setEditing(true);
  };

  const handleRenameSubmit = () => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== session.name) {
      onRename(trimmed);
    } else {
      setEditName(session.name);
    }
    setEditing(false);
  };

  return (
    <div
      className={cn(
        "group relative flex items-center gap-2 rounded-lg px-3 py-2.5 cursor-pointer transition-colors",
        isActive
          ? "bg-accent-muted border-l-2 border-accent"
          : "hover:bg-bg-tertiary"
      )}
      onClick={onSelect}
    >
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            ref={inputRef}
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRenameSubmit();
              if (e.key === "Escape") {
                setEditName(session.name);
                setEditing(false);
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-transparent border-none outline-none text-sm text-text-primary p-0"
          />
        ) : (
          <>
            <div className="flex items-center gap-1.5">
              <AnimatePresence mode="wait">
                {status === "streaming" && (
                  <motion.span
                    key="streaming"
                    title="Running..."
                    className="shrink-0 w-1.5 h-1.5 rounded-full bg-accent session-pulse"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  />
                )}
                {status === "waiting_for_input" && (
                  <motion.span
                    key="waiting"
                    title="Waiting for your input"
                    className="shrink-0 text-warning"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  >
                    <MessageCircleQuestion size={12} />
                  </motion.span>
                )}
              </AnimatePresence>
              <AnimatePresence mode="wait">
                <motion.p
                  key={session.name}
                  initial={{ opacity: 0, y: 4, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -4, filter: "blur(4px)" }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="text-sm text-text-primary truncate"
                >
                  {session.name}
                </motion.p>
              </AnimatePresence>
            </div>
            {session.last_message && (
              <p className="text-xs text-text-tertiary truncate mt-0.5">
                {truncate(session.last_message, 50)}
              </p>
            )}
          </>
        )}
      </div>

      {/* Action buttons - visible on hover */}
      {!editing && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            className="p-1 rounded hover:bg-bg-secondary text-text-tertiary hover:text-text-primary cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              startEditing();
            }}
          >
            <Pencil size={12} />
          </button>
          <button
            className="p-1 rounded hover:bg-error/10 text-text-tertiary hover:text-error cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}
    </div>
  );
}
