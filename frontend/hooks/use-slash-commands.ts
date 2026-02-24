"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { SLASH_COMMANDS } from "@/lib/constants";
import type { SlashCommand } from "@/types/chat";

export function useSlashCommands(): SlashCommand[] {
  const [commands, setCommands] = useState<SlashCommand[]>(SLASH_COMMANDS);

  useEffect(() => {
    api
      .listCommands()
      .then(({ commands: cmds }) => {
        setCommands(
          cmds.map((c) => ({
            command: c.command,
            label: c.name
              .split("-")
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
              .join(" "),
            description: c.description,
            isCustom: !c.is_builtin,
          }))
        );
      })
      .catch(() => {
        // Keep hardcoded fallback on error
      });
  }, []);

  return commands;
}
