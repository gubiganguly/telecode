"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { Plus, Settings, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectCard } from "@/components/projects/project-card";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import { EmptyState } from "@/components/projects/empty-state";
import { useProjects } from "@/hooks/use-projects";

export default function ProjectsPage() {
  const router = useRouter();
  const { projects, loading, createProject, deleteProject } = useProjects();
  const [showCreate, setShowCreate] = useState(false);

  const handleCreate = async (name: string, description?: string) => {
    const project = await createProject(name, description);
    router.push(`/chat/${project.id}`);
    return project;
  };

  return (
    <div className="min-h-[100dvh] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-bg-primary/80 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <motion.div
            className="flex items-center gap-2.5"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <Zap size={16} className="text-white" />
            </div>
            <h1 className="text-lg font-semibold text-text-primary">
              CasperBot
            </h1>
          </motion.div>

          <motion.div
            className="flex items-center gap-2"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Link href="/settings">
              <Button variant="ghost" size="icon-sm">
                <Settings size={18} />
              </Button>
            </Link>
            <Button
              onClick={() => setShowCreate(true)}
              size="sm"
              className="gap-1.5"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">New Project</span>
            </Button>
          </motion.div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-6">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <EmptyState onCreateProject={() => setShowCreate(true)} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {projects.map((project, i) => (
              <ProjectCard
                key={project.id}
                project={project}
                onDelete={deleteProject}
                index={i}
              />
            ))}
          </div>
        )}
      </main>

      <CreateProjectDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={handleCreate}
      />
    </div>
  );
}
