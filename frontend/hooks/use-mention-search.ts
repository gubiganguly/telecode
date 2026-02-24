"use client";

import { useState, useRef, useCallback } from "react";
import { api } from "@/lib/api";
import type { MentionSuggestion } from "@/types/mentions";

const DEBOUNCE_MS = 150;
const URL_PATTERN = /^https?:\/\//i;

export function useMentionSearch(projectId: string) {
  const [results, setResults] = useState<MentionSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(
    (query: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);

      // If it looks like a URL, show a URL suggestion immediately
      if (URL_PATTERN.test(query)) {
        setResults([{ type: "url", label: query, path: query }]);
        setLoading(false);
        return;
      }

      setLoading(true);
      timerRef.current = setTimeout(async () => {
        try {
          const data = await api.searchFiles(projectId, query, 15);
          const suggestions: MentionSuggestion[] = data.results.map((r) => ({
            type: r.type === "directory" ? "folder" : "file",
            label: r.name,
            path: r.path,
          }));
          setResults(suggestions);
        } catch {
          setResults([]);
        } finally {
          setLoading(false);
        }
      }, DEBOUNCE_MS);
    },
    [projectId]
  );

  return { search, results, loading };
}
