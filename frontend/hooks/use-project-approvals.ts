"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

export function useProjectApprovals(projectId: string) {
  const [enabled, setEnabled] = useState<boolean | null>(null); // null = inherit
  const [globalDefault, setGlobalDefault] = useState(false);
  const [effective, setEffective] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getProjectApprovals(projectId);
      setEnabled(data.enabled);
      setGlobalDefault(data.global_default);
      setEffective(data.effective);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const set = async (value: boolean | null) => {
    setSaving(true);
    try {
      const data = await api.updateProjectApprovals(projectId, value);
      setEnabled(data.enabled);
      setGlobalDefault(data.global_default);
      setEffective(data.effective);
    } finally {
      setSaving(false);
    }
  };

  return { enabled, globalDefault, effective, loading, saving, set };
}
