"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { McpServerConfig } from "@/types/api";

export function useMcps() {
  const [mcps, setMcps] = useState<McpServerConfig[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMcps = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listMcps();
      setMcps(data.mcps);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMcps();
  }, [fetchMcps]);

  return { mcps, loading, refetch: fetchMcps };
}
