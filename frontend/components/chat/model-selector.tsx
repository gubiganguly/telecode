"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check, Sparkles, Zap, Bolt } from "lucide-react";
import { MODELS } from "@/lib/constants";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const MODEL_ICONS: Record<string, typeof Sparkles> = {
  "claude-opus-4-6": Sparkles,
  "claude-sonnet-4-6": Zap,
  "claude-haiku-4-5": Bolt,
};

export function ModelSelector() {
  const [open, setOpen] = useState(false);
  const selectedModel = useStore((s) => s.selectedModel);
  const setSelectedModel = useStore((s) => s.setSelectedModel);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const current = MODELS.find((m) => m.id === selectedModel) ?? MODELS[0];
  const Icon = MODEL_ICONS[current.id] ?? Sparkles;

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer",
          "text-text-secondary hover:text-text-primary hover:bg-bg-tertiary",
          open && "bg-bg-tertiary text-text-primary"
        )}
      >
        <Icon size={13} className="text-accent" />
        <span className="hidden sm:inline">{current.label}</span>
        <ChevronDown
          size={12}
          className={cn("transition-transform", open && "rotate-180")}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute right-0 top-full mt-1 z-50 w-52 bg-bg-secondary border border-border rounded-xl shadow-xl overflow-hidden"
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.12 }}
          >
            <div className="p-1.5">
              {MODELS.map((model) => {
                const MIcon = MODEL_ICONS[model.id] ?? Sparkles;
                const isActive = model.id === selectedModel;
                return (
                  <button
                    key={model.id}
                    className={cn(
                      "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left transition-colors cursor-pointer",
                      isActive
                        ? "bg-accent-muted"
                        : "hover:bg-bg-tertiary"
                    )}
                    onClick={() => {
                      setSelectedModel(model.id);
                      setOpen(false);
                    }}
                  >
                    <MIcon
                      size={14}
                      className={cn(
                        isActive ? "text-accent" : "text-text-tertiary"
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          "text-sm font-medium",
                          isActive ? "text-text-primary" : "text-text-secondary"
                        )}
                      >
                        {model.label}
                      </p>
                      <p className="text-[11px] text-text-tertiary">
                        {model.description}
                      </p>
                    </div>
                    {isActive && (
                      <Check size={14} className="text-accent shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
