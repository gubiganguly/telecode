"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";

export function useProjects() {
  const projects = useStore((s) => s.projects);
  const loading = useStore((s) => s.projectsLoading);
  const total = useStore((s) => s.projectsTotal);
  const fetchProjects = useStore((s) => s.fetchProjects);
  const createProject = useStore((s) => s.createProject);
  const deleteProject = useStore((s) => s.deleteProject);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return { projects, loading, total, createProject, deleteProject, refetch: fetchProjects };
}
