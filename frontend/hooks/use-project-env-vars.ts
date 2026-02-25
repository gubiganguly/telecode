"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import type { ProjectEnvVar } from "@/types/api";

export function useProjectEnvVars(projectId: string) {
  const [envVars, setEnvVars] = useState<ProjectEnvVar[]>([]);
  const [globalKeys, setGlobalKeys] = useState<string[]>([]);
  const [excludedCredentials, setExcludedCredentials] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getProjectEnvVars(projectId);
      setEnvVars(data.env_vars);
      setGlobalKeys(data.global_keys);
      setExcludedCredentials(data.excluded_credentials);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const create = async (name: string, envVar: string, value: string) => {
    const created = await api.createProjectEnvVar(projectId, name, envVar, value);
    setEnvVars((prev) => [...prev, created]);
    return created;
  };

  const update = async (envVarId: string, data: { name?: string; env_var?: string; value?: string }) => {
    const updated = await api.updateProjectEnvVar(projectId, envVarId, data);
    setEnvVars((prev) => prev.map((v) => (v.id === envVarId ? updated : v)));
    return updated;
  };

  const remove = async (envVarId: string) => {
    await api.deleteProjectEnvVar(projectId, envVarId);
    setEnvVars((prev) => prev.filter((v) => v.id !== envVarId));
  };

  const excludeCredential = async (envVar: string) => {
    await api.excludeCredential(projectId, envVar);
    await fetch();
  };

  const includeCredential = async (envVar: string) => {
    await api.includeCredential(projectId, envVar);
    await fetch();
  };

  return {
    envVars,
    globalKeys,
    excludedCredentials,
    loading,
    create,
    update,
    remove,
    excludeCredential,
    includeCredential,
    refetch: fetch,
  };
}
