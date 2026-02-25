"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { api } from "@/lib/api";
import type { PreviewInfo } from "@/types/api";

const LOG_POLL_INTERVAL = 2_000;
const STATUS_POLL_INTERVAL = 5_000;

export function usePreview(projectId: string | undefined) {
  const [preview, setPreview] = useState<PreviewInfo | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logLineRef = useRef(0);

  const isRunning = preview?.status === "running";

  // Fetch initial status
  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    (async () => {
      try {
        const status = await api.getPreviewStatus(projectId);
        if (!cancelled) setPreview(status);
      } catch {
        // Not running or not supported — that's fine
      }
    })();
    return () => { cancelled = true; };
  }, [projectId]);

  // Poll logs while running
  useEffect(() => {
    if (!projectId || !isRunning) return;
    const interval = setInterval(async () => {
      try {
        const data = await api.getPreviewLogs(projectId, logLineRef.current);
        if (data.logs.length > 0) {
          setLogs((prev) => [...prev, ...data.logs]);
          logLineRef.current = data.total_lines;
        }
      } catch {
        // Ignore polling errors
      }
    }, LOG_POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [projectId, isRunning]);

  // Poll status while starting (to detect when it becomes running or errors)
  useEffect(() => {
    if (!projectId || !starting) return;
    const interval = setInterval(async () => {
      try {
        const status = await api.getPreviewStatus(projectId);
        if (status) {
          setPreview(status);
          if (status.status !== "running") return;
          setStarting(false);
        }
      } catch {
        // Ignore
      }
    }, STATUS_POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [projectId, starting]);

  const start = useCallback(async () => {
    if (!projectId) return;
    setStarting(true);
    setError(null);
    setLogs([]);
    logLineRef.current = 0;
    try {
      const info = await api.startPreview(projectId);
      setPreview(info);
      setStarting(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start preview");
      setStarting(false);
    }
  }, [projectId]);

  const stop = useCallback(async () => {
    if (!projectId || stopping) return;
    setStopping(true);
    setError(null);
    try {
      await api.stopPreview(projectId);
    } catch {
      // Ignore — preview may already be stopped
    } finally {
      setPreview(null);
      setLogs([]);
      logLineRef.current = 0;
      setStopping(false);
    }
  }, [projectId, stopping]);

  return {
    preview,
    logs,
    starting,
    stopping,
    error,
    isRunning,
    start,
    stop,
  };
}
