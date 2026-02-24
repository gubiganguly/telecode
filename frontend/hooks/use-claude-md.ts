"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

export function useClaudeMd() {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSyncCount, setLastSyncCount] = useState(0);

  const fetchClaudeMd = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getClaudeMd();
      setContent(data.content);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClaudeMd();
  }, [fetchClaudeMd]);

  const updateClaudeMd = async (newContent: string) => {
    setSaving(true);
    try {
      const result = await api.updateClaudeMd({ content: newContent });
      setContent(result.content);
      setLastSyncCount(result.synced_projects);
      return result;
    } finally {
      setSaving(false);
    }
  };

  return { content, loading, saving, lastSyncCount, updateClaudeMd, setContent };
}
