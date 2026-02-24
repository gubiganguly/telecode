"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { Send, Square, Mic } from "lucide-react";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import {
  SlashCommandPalette,
  getFilteredCommands,
} from "./slash-command-palette";
import { ChatEditor, type ChatEditorRef } from "./chat-editor";
import { cn } from "@/lib/utils";
import { useSlashCommands } from "@/hooks/use-slash-commands";
import { useElapsedTime } from "@/hooks/use-elapsed-time";
import { useStore } from "@/lib/store";
import type { SlashCommand } from "@/types/chat";
import type { MentionItem } from "@/types/mentions";

const STALE_THRESHOLD_MS = 30_000;

interface ChatInputProps {
  projectId: string;
  sessionId: string | null;
  onSend: (text: string, mentions: MentionItem[]) => void;
  onCancel: () => void;
  isStreaming: boolean;
  disabled?: boolean;
}

export function ChatInput({
  projectId,
  sessionId,
  onSend,
  onCancel,
  isStreaming,
  disabled,
}: ChatInputProps) {
  const [editorText, setEditorText] = useState("");
  const [selectedCmdIndex, setSelectedCmdIndex] = useState(0);
  const editorRef = useRef<ChatEditorRef>(null);
  const commands = useSlashCommands();

  const filteredCommands = useMemo(
    () => getFilteredCommands(commands, editorText),
    [commands, editorText]
  );
  const showPalette = editorText.startsWith("/") && filteredCommands.length > 0;

  const handleSubmit = useCallback(
    (text: string, mentions: MentionItem[]) => {
      if (!text.trim() || disabled || isStreaming) return;
      onSend(text, mentions);
    },
    [disabled, isStreaming, onSend]
  );

  const handleSelectCommand = useCallback(
    (cmd: SlashCommand) => {
      // Clear editor and insert command text
      editorRef.current?.clear();
      // We need to set the editor content to the command
      // For now, submit the command directly since slash commands
      // are typically sent immediately or the user continues typing
      setSelectedCmdIndex(0);
      // Insert the command text — the editor will handle it
      // For slash commands, we send them with the command prefix
      onSend(cmd.command, []);
    },
    [onSend]
  );

  const handleEditorKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (showPalette) {
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedCmdIndex((i) => Math.max(0, i - 1));
          return;
        }
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedCmdIndex((i) =>
            Math.min(filteredCommands.length - 1, i + 1)
          );
          return;
        }
        if (e.key === "Tab" || (e.key === "Enter" && !e.shiftKey)) {
          e.preventDefault();
          handleSelectCommand(filteredCommands[selectedCmdIndex]);
          return;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          editorRef.current?.clear();
          return;
        }
      }
    },
    [showPalette, filteredCommands, selectedCmdIndex, handleSelectCommand]
  );

  const handleManualSend = useCallback(() => {
    const text = editorRef.current?.getText() ?? "";
    if (!text.trim() || disabled) return;
    // For manual send button, we just send text without mentions extracted
    // The ChatEditor's onSubmit handles mentions when Enter is pressed
    onSend(text, []);
    editorRef.current?.clear();
  }, [disabled, onSend]);

  const hasText = editorText.trim().length > 0;

  const handleTranscript = useCallback(
    (text: string) => {
      editorRef.current?.insertText(text);
    },
    []
  );

  const { isListening, isSupported, toggle: toggleMic } = useSpeechRecognition({
    onTranscript: handleTranscript,
  });

  // Elapsed time & staleness detection
  const elapsed = useElapsedTime(isStreaming);
  const lastEventAt = useStore(
    (s) => (sessionId ? s.lastEventAt[sessionId] : undefined) ?? 0
  );
  const [isStale, setIsStale] = useState(false);

  useEffect(() => {
    if (!isStreaming || !lastEventAt) {
      setIsStale(false);
      return;
    }
    // Check immediately
    setIsStale(Date.now() - lastEventAt > STALE_THRESHOLD_MS);
    // Re-check every second
    const timer = setInterval(() => {
      setIsStale(Date.now() - lastEventAt > STALE_THRESHOLD_MS);
    }, 1000);
    return () => clearInterval(timer);
  }, [isStreaming, lastEventAt]);

  return (
    <div className="relative border-t border-border bg-bg-primary pb-[env(safe-area-inset-bottom)]">
      <SlashCommandPalette
        query={editorText}
        visible={showPalette && !isStreaming}
        selectedIndex={selectedCmdIndex}
        onSelect={handleSelectCommand}
        commands={commands}
      />

      <div className="flex items-end gap-2 px-3 py-3 max-w-3xl mx-auto">
        <div
          className={cn(
            "flex-1 relative rounded-xl border border-border bg-bg-input px-4 py-3",
            "focus-within:ring-2 focus-within:ring-border-focus focus-within:border-transparent",
            "transition-colors",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          onKeyDown={handleEditorKeyDown}
        >
          <ChatEditor
            ref={editorRef}
            projectId={projectId}
            onSubmit={handleSubmit}
            disabled={disabled || isStreaming}
            placeholder="Send a message... (use @ to mention files)"
            onTextChange={(text) => {
              setEditorText(text);
              setSelectedCmdIndex(0);
            }}
          />
        </div>

        {/* Mic button — only shown when browser supports Speech Recognition */}
        {isSupported && !isStreaming && (
          <button
            onClick={toggleMic}
            className={cn(
              "shrink-0 w-10 h-10 flex items-center justify-center rounded-xl transition-colors cursor-pointer",
              isListening
                ? "bg-error/15 text-error mic-pulse"
                : "bg-bg-tertiary text-text-secondary hover:text-text-primary hover:bg-bg-tertiary/80"
            )}
            title={isListening ? "Stop listening" : "Voice input"}
          >
            <Mic size={16} />
          </button>
        )}

        {/* Send / Cancel button */}
        {isStreaming ? (
          <div className="flex items-center gap-2 shrink-0">
            {elapsed && (
              <span
                className={cn(
                  "text-xs tabular-nums transition-colors",
                  isStale ? "text-warning" : "text-text-tertiary"
                )}
                title={isStale ? "No response from server" : "Elapsed time"}
              >
                {elapsed}
                {isStale && (
                  <span className="block text-[10px] leading-tight">
                    unresponsive
                  </span>
                )}
              </span>
            )}
            <button
              onClick={onCancel}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-error/10 text-error hover:bg-error/20 transition-colors cursor-pointer"
              title="Stop generating"
            >
              <Square size={16} fill="currentColor" />
            </button>
          </div>
        ) : (
          <button
            onClick={handleManualSend}
            disabled={!hasText || disabled}
            className={cn(
              "shrink-0 w-10 h-10 flex items-center justify-center rounded-xl transition-colors cursor-pointer",
              hasText
                ? "bg-accent text-white hover:bg-accent-hover"
                : "bg-bg-tertiary text-text-tertiary cursor-not-allowed"
            )}
            title="Send message"
          >
            <Send size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
