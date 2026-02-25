"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

export function useGlobalApprovals() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getGlobalApprovals();
      setEnabled(data.enabled);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const toggle = async (value: boolean) => {
    setSaving(true);
    try {
      await api.updateGlobalApprovals(value);
      setEnabled(value);
    } finally {
      setSaving(false);
    }
  };

  return { enabled, loading, saving, toggle };
}
