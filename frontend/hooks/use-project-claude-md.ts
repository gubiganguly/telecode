"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

export function useProjectClaudeMd(projectId: string) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getProjectClaudeMd(projectId);
      setContent(data.content);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const save = async (newContent: string) => {
    setSaving(true);
    try {
      await api.updateProjectClaudeMd(projectId, newContent);
      setContent(newContent);
    } finally {
      setSaving(false);
    }
  };

  return { content, loading, saving, setContent, save };
}
