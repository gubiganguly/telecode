"use client";

import { useCallback } from "react";
import { api } from "@/lib/api";
import type { MentionItem, ResolvedMention } from "@/types/mentions";

export function useMentionResolver(projectId: string) {
  const resolve = useCallback(
    async (mentions: MentionItem[]): Promise<ResolvedMention[]> => {
      const results = await Promise.allSettled(
        mentions.map(async (m): Promise<ResolvedMention> => {
          switch (m.type) {
            case "file": {
              const data = await api.readFileContent(projectId, m.path);
              return {
                type: m.type,
                label: m.label,
                path: m.path,
                content: data.content,
              };
            }
            case "folder": {
              const data = await api.readFolderListing(projectId, m.path);
              return {
                type: m.type,
                label: m.label,
                path: m.path,
                content: data.listing,
              };
            }
            case "url": {
              const data = await api.fetchUrlContent(m.path);
              return {
                type: m.type,
                label: m.label,
                path: m.path,
                content: data.content,
              };
            }
          }
        })
      );

      return results.map((r, i) => {
        if (r.status === "fulfilled") return r.value;
        return {
          type: mentions[i].type,
          label: mentions[i].label,
          path: mentions[i].path,
          content: "",
          error: String(r.reason),
        };
      });
    },
    [projectId]
  );

  return { resolve };
}

export function formatResolvedContext(resolved: ResolvedMention[]): string {
  return resolved
    .filter((r) => !r.error && r.content)
    .map((r) => {
      switch (r.type) {
        case "file":
          return `<attached_context>\n<file path="${r.path}">\n${r.content}\n</file>\n</attached_context>`;
        case "folder":
          return `<attached_context>\n<folder path="${r.path}">\n${r.content}\n</folder>\n</attached_context>`;
        case "url":
          return `<attached_context>\n<url href="${r.path}">\n${r.content}\n</url>\n</attached_context>`;
      }
    })
    .join("\n\n");
}
