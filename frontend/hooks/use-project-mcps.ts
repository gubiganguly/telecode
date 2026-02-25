"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { McpServerConfig } from "@/types/api";

export function useProjectMcps(projectId: string) {
  const [mcps, setMcps] = useState<McpServerConfig[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMcps = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getProjectMcps(projectId);
      setMcps(data.mcps);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchMcps();
  }, [fetchMcps]);

  return { mcps, loading, refetch: fetchMcps };
}
