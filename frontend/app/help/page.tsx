"use client";

import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence } from "framer-motion";
import { ArrowLeft, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HelpSidebar, type HelpSection } from "@/components/help/help-sidebar";
import { HelpTabBar } from "@/components/help/help-tab-bar";
import {
  OverviewSection,
  ProjectsSection,
  ClaudeMdSection,
  CommandsSection,
  McpsSection,
  ApprovalsSection,
  EnvVarsSection,
  ChatSection,
  GitHubSection,
  ArchitectureSection,
} from "@/components/help/help-sections";
import { useMobile } from "@/hooks/use-mobile";

export default function HelpPage() {
  const isMobile = useMobile();
  const [activeSection, setActiveSection] = useState<HelpSection>("overview");
  const contentRef = useRef<HTMLDivElement>(null);

  // Reset scroll when switching sections
  useEffect(() => {
    contentRef.current?.scrollTo(0, 0);
  }, [activeSection]);

  return (
    <div className="flex h-dvh overflow-hidden">
      {/* Desktop sidebar */}
      {!isMobile && (
        <HelpSidebar
          activeSection={activeSection}
          onSelectSection={setActiveSection}
        />
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        {isMobile && (
          <header className="sticky top-0 z-10 border-b border-border bg-bg-primary/80 backdrop-blur-md">
            <div className="px-4 py-4 flex items-center gap-3">
              <Link href="/projects">
                <Button variant="ghost" size="icon-sm">
                  <ArrowLeft size={18} />
                </Button>
              </Link>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
                  <HelpCircle size={16} className="text-white" />
                </div>
                <h1 className="text-lg font-semibold text-text-primary">
                  Help & Docs
                </h1>
              </div>
            </div>
          </header>
        )}

        {/* Mobile tab bar */}
        {isMobile && (
          <HelpTabBar
            activeSection={activeSection}
            onSelectSection={setActiveSection}
          />
        )}

        {/* Section content */}
        <main ref={contentRef} className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {activeSection === "overview" && <OverviewSection key="overview" />}
            {activeSection === "projects" && <ProjectsSection key="projects" />}
            {activeSection === "claude-md" && <ClaudeMdSection key="claude-md" />}
            {activeSection === "commands" && <CommandsSection key="commands" />}
            {activeSection === "mcps" && <McpsSection key="mcps" />}
            {activeSection === "approvals" && <ApprovalsSection key="approvals" />}
            {activeSection === "env-vars" && <EnvVarsSection key="env-vars" />}
            {activeSection === "chat" && <ChatSection key="chat" />}
            {activeSection === "github" && <GitHubSection key="github" />}
            {activeSection === "architecture" && <ArchitectureSection key="architecture" />}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
