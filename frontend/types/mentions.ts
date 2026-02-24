export type MentionType = "file" | "folder" | "url";

export interface MentionItem {
  id: string;
  type: MentionType;
  label: string;
  path: string;
}

export interface MentionSuggestion {
  type: MentionType;
  label: string;
  path: string;
}

export interface ResolvedMention {
  type: MentionType;
  label: string;
  path: string;
  content: string;
  error?: string;
}
