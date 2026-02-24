"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  Folder,
  FolderOpen,
  FileText,
  FileCode,
  FileJson,
  Image,
  File,
  FileType,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { FileNode } from "@/types/api";

const FILE_ICON_MAP: Record<string, typeof FileText> = {
  ts: FileCode,
  tsx: FileCode,
  js: FileCode,
  jsx: FileCode,
  py: FileCode,
  rs: FileCode,
  go: FileCode,
  rb: FileCode,
  java: FileCode,
  c: FileCode,
  cpp: FileCode,
  h: FileCode,
  css: FileCode,
  scss: FileCode,
  html: FileCode,
  json: FileJson,
  yaml: FileJson,
  yml: FileJson,
  toml: FileJson,
  png: Image,
  jpg: Image,
  jpeg: Image,
  gif: Image,
  svg: Image,
  webp: Image,
  ico: Image,
  md: FileType,
  mdx: FileType,
  txt: FileText,
  log: FileText,
};

function getFileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  return FILE_ICON_MAP[ext] || File;
}

interface FileTreeNodeProps {
  node: FileNode;
  depth: number;
}

export function FileTreeNode({ node, depth }: FileTreeNodeProps) {
  const [expanded, setExpanded] = useState(depth < 1);

  const toggle = useCallback(() => {
    if (node.type === "directory") {
      setExpanded((prev) => !prev);
    }
  }, [node.type]);

  const isDir = node.type === "directory";
  const Icon = isDir
    ? expanded
      ? FolderOpen
      : Folder
    : getFileIcon(node.name);

  return (
    <div>
      <button
        onClick={toggle}
        className={cn(
          "flex items-center gap-1.5 w-full text-left py-[3px] pr-2 rounded-md transition-colors text-[13px] leading-tight",
          isDir
            ? "hover:bg-bg-tertiary/60 text-text-primary cursor-pointer"
            : "text-text-secondary cursor-default"
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {isDir ? (
          <motion.span
            animate={{ rotate: expanded ? 90 : 0 }}
            transition={{ duration: 0.15 }}
            className="flex-shrink-0 text-text-tertiary"
          >
            <ChevronRight size={14} />
          </motion.span>
        ) : (
          <span className="w-[14px] flex-shrink-0" />
        )}
        <Icon
          size={14}
          className={cn(
            "flex-shrink-0",
            isDir ? "text-accent" : "text-text-tertiary"
          )}
        />
        <span className="truncate font-mono">{node.name}</span>
      </button>

      {isDir && node.children && (
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              {node.children.map((child) => (
                <FileTreeNode
                  key={child.name}
                  node={child}
                  depth={depth + 1}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
