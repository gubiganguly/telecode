"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { ProjectCommandInfo } from "@/types/api";

export function useProjectCommands(projectId: string) {
  const [commands, setCommands] = useState<ProjectCommandInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCommands = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getProjectCommands(projectId);
      setCommands(data.commands);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchCommands();
  }, [fetchCommands]);

  const createCommand = async (name: string, content: string) => {
    const command = await api.createProjectCommand(projectId, name, content);
    setCommands((prev) => [...prev, command].sort((a, b) => a.name.localeCompare(b.name)));
    return command;
  };

  const updateCommand = async (name: string, content: string) => {
    const updated = await api.updateProjectCommand(projectId, name, content);
    setCommands((prev) => prev.map((c) => (c.name === name ? updated : c)));
    return updated;
  };

  const deleteCommand = async (name: string) => {
    await api.deleteProjectCommand(projectId, name);
    setCommands((prev) => prev.filter((c) => c.name !== name));
  };

  return { commands, loading, createCommand, updateCommand, deleteCommand, refetch: fetchCommands };
}
