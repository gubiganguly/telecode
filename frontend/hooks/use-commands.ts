"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { CommandInfo, CommandCreate, CommandUpdate } from "@/types/api";

export function useCommands() {
  const [commands, setCommands] = useState<CommandInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCommands = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listCommands();
      setCommands(data.commands);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCommands();
  }, [fetchCommands]);

  const createCommand = async (data: CommandCreate) => {
    const command = await api.createCommand(data);
    setCommands((prev) => [...prev, command].sort((a, b) => a.name.localeCompare(b.name)));
    return command;
  };

  const updateCommand = async (name: string, data: CommandUpdate) => {
    const updated = await api.updateCommand(name, data);
    setCommands((prev) => prev.map((c) => (c.name === name ? updated : c)));
    return updated;
  };

  const deleteCommand = async (name: string) => {
    await api.deleteCommand(name);
    setCommands((prev) => prev.filter((c) => c.name !== name));
  };

  return { commands, loading, createCommand, updateCommand, deleteCommand, refetch: fetchCommands };
}
