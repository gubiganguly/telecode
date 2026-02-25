"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { CredentialInfo, CredentialCreate, CredentialUpdate } from "@/types/api";

export function useCredentials() {
  const [credentials, setCredentials] = useState<CredentialInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCredentials = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listCredentials();
      setCredentials(data.credentials);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCredentials();
  }, [fetchCredentials]);

  const createCredential = async (data: CredentialCreate) => {
    const credential = await api.createCredential(data);
    setCredentials((prev) => [credential, ...prev]);
    return credential;
  };

  const updateCredential = async (id: string, data: CredentialUpdate) => {
    const updated = await api.updateCredential(id, data);
    setCredentials((prev) => prev.map((c) => (c.id === id ? updated : c)));
    return updated;
  };

  const deleteCredential = async (id: string) => {
    await api.deleteCredential(id);
    setCredentials((prev) => prev.filter((c) => c.id !== id));
  };

  return { credentials, loading, createCredential, updateCredential, deleteCredential, refetch: fetchCredentials };
}
