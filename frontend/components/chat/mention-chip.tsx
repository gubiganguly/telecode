"use client";

import { NodeViewWrapper } from "@tiptap/react";
import { File, Folder, Link } from "lucide-react";
import type { MentionType } from "@/types/mentions";

const ICONS = {
  file: File,
  folder: Folder,
  url: Link,
} as const;

interface MentionChipProps {
  node: {
    attrs: {
      id: string;
      label: string;
      mentionType: MentionType;
    };
  };
}

export function MentionChip({ node }: MentionChipProps) {
  const Icon = ICONS[node.attrs.mentionType] || File;

  return (
    <NodeViewWrapper as="span" className="inline">
      <span className="inline-flex items-center gap-1 bg-accent-muted text-accent rounded-md px-1.5 py-0.5 text-xs font-medium font-mono whitespace-nowrap align-baseline">
        <Icon size={10} className="shrink-0" />
        {node.attrs.label}
      </span>
    </NodeViewWrapper>
  );
}
