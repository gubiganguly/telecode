"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { ApiKeyInfo, ApiKeyCreate, ApiKeyUpdate } from "@/types/api";

export function useApiKeys() {
  const [keys, setKeys] = useState<ApiKeyInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchKeys = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listApiKeys();
      setKeys(data.keys);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const createKey = async (data: ApiKeyCreate) => {
    const key = await api.createApiKey(data);
    setKeys((prev) => [key, ...prev]);
    return key;
  };

  const updateKey = async (id: string, data: ApiKeyUpdate) => {
    const updated = await api.updateApiKey(id, data);
    setKeys((prev) => prev.map((k) => (k.id === id ? updated : k)));
    return updated;
  };

  const deleteKey = async (id: string) => {
    await api.deleteApiKey(id);
    setKeys((prev) => prev.filter((k) => k.id !== id));
  };

  return { keys, loading, createKey, updateKey, deleteKey, refetch: fetchKeys };
}
