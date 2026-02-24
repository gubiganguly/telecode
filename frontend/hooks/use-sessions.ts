"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";

export function useSessions(projectId: string) {
  const sessions = useStore((s) => s.sessions);
  const loading = useStore((s) => s.sessionsLoading);
  const activeSessionId = useStore((s) => s.activeSessionId);
  const fetchSessions = useStore((s) => s.fetchSessions);
  const createSession = useStore((s) => s.createSession);
  const setActiveSession = useStore((s) => s.setActiveSession);
  const deleteSession = useStore((s) => s.deleteSession);
  const renameSession = useStore((s) => s.renameSession);

  useEffect(() => {
    fetchSessions(projectId);
  }, [projectId, fetchSessions]);

  return {
    sessions,
    loading,
    activeSessionId,
    createSession,
    setActiveSession,
    deleteSession,
    renameSession,
  };
}
