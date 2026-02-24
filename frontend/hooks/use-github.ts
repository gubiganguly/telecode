"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { GitHubAccountInfo } from "@/types/api";

export function useGitHub() {
  const [connected, setConnected] = useState(false);
  const [account, setAccount] = useState<GitHubAccountInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const status = await api.getGitHubStatus();
      setConnected(status.connected);
      setAccount(status.account);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const disconnect = async () => {
    await api.disconnectGitHub();
    setConnected(false);
    setAccount(null);
  };

  const loginUrl = api.getGitHubLoginUrl();

  return { connected, account, loading, disconnect, loginUrl, refetch: fetchStatus };
}
