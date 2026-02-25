"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import type { TaskInfo } from "@/types/api";

const POLL_INTERVAL = 10_000; // 10 seconds

export function useActiveTasks() {
  const [tasks, setTasks] = useState<TaskInfo[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTasks = useCallback(async () => {
    try {
      const data = await api.listActiveTasks();
      setTasks(data.tasks);
    } catch {
      // Silently ignore — non-critical polling
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchTasks();
    const interval = setInterval(fetchTasks, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchTasks]);

  const cancelTask = useCallback(async (sessionId: string) => {
    try {
      await api.cancelTask(sessionId);
      // Optimistically remove from list
      setTasks((prev) => prev.filter((t) => t.session_id !== sessionId));
    } catch {
      // Ignore — will be refreshed on next poll
    }
  }, []);

  const runningCount = tasks.filter((t) => t.status === "running").length;

  return { tasks, loading, runningCount, cancelTask, refetch: fetchTasks };
}
