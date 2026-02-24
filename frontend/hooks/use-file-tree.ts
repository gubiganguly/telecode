"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { api } from "@/lib/api";
import type { FileNode } from "@/types/api";

const POLL_INTERVAL_MS = 5000;

export function useFileTree(projectId: string, enabled: boolean) {
  const [tree, setTree] = useState<FileNode[]>([]);
  const [root, setRoot] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetch = useCallback(async () => {
    try {
      const data = await api.getFileTree(projectId);
      setTree(data.tree);
      setRoot(data.root);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load file tree");
    }
  }, [projectId]);

  // Initial fetch + polling
  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    setLoading(true);
    fetch().finally(() => setLoading(false));

    intervalRef.current = setInterval(fetch, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, fetch]);

  const refresh = useCallback(() => {
    setLoading(true);
    fetch().finally(() => setLoading(false));
  }, [fetch]);

  return { tree, root, loading, error, refresh };
}
