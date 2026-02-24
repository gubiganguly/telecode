"use client";

import {
  useEffect,
  useCallback,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import { useEditor, EditorContent, ReactRenderer } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Mention from "@tiptap/extension-mention";
import Placeholder from "@tiptap/extension-placeholder";
import tippy, { type Instance as TippyInstance } from "tippy.js";
import {
  MentionSuggestionList,
  type MentionSuggestionListRef,
} from "./mention-suggestion-list";
import { api } from "@/lib/api";
import type { MentionItem, MentionSuggestion } from "@/types/mentions";

// Extend Mention to add a custom `mentionType` attribute
const CustomMention = Mention.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      mentionType: {
        default: "file",
        parseHTML: (element: HTMLElement) => element.getAttribute("data-mention-type"),
        renderHTML: (attributes: Record<string, unknown>) => ({
          "data-mention-type": attributes.mentionType as string,
        }),
      },
    };
  },
});

const URL_PATTERN = /^https?:\/\//i;

export interface ChatEditorRef {
  focus: () => void;
  clear: () => void;
  getText: () => string;
  isEmpty: () => boolean;
  insertText: (text: string) => void;
}

interface ChatEditorProps {
  projectId: string;
  onSubmit: (text: string, mentions: MentionItem[]) => void;
  disabled?: boolean;
  placeholder?: string;
  onTextChange?: (text: string) => void;
}

export const ChatEditor = forwardRef<ChatEditorRef, ChatEditorProps>(
  ({ projectId, onSubmit, disabled, placeholder, onTextChange }, ref) => {
    const projectIdRef = useRef(projectId);
    useEffect(() => {
      projectIdRef.current = projectId;
    }, [projectId]);

    const onSubmitRef = useRef(onSubmit);
    useEffect(() => {
      onSubmitRef.current = onSubmit;
    }, [onSubmit]);

    // Track whether the suggestion popup is currently open
    const suggestionOpenRef = useRef(false);

    const extractMentions = useCallback(
      (editor: ReturnType<typeof useEditor>): MentionItem[] => {
        if (!editor) return [];
        const mentions: MentionItem[] = [];
        editor.state.doc.descendants((node) => {
          if (node.type.name === "mention") {
            mentions.push({
              id: node.attrs.id,
              type: node.attrs.mentionType || "file",
              label: node.attrs.label || node.attrs.id,
              path: node.attrs.id,
            });
          }
        });
        return mentions;
      },
      []
    );

    /* eslint-disable react-hooks/refs -- refs are only read in async callbacks, not during render */
    const editor = useEditor({
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({
          heading: false,
          blockquote: false,
          codeBlock: false,
          bulletList: false,
          orderedList: false,
          horizontalRule: false,
          listItem: false,
        }),
        Placeholder.configure({
          placeholder: placeholder || "Send a message...",
        }),
        CustomMention.configure({
          HTMLAttributes: {
            class: "mention-chip",
          },
          suggestion: {
            char: "@",
            allowSpaces: true,
            items: async ({ query }): Promise<MentionSuggestion[]> => {
              // URL suggestion
              if (URL_PATTERN.test(query)) {
                return [{ type: "url", label: query, path: query }];
              }

              try {
                const data = await api.searchFiles(
                  projectIdRef.current,
                  query,
                  15
                );
                return data.results.map((r) => ({
                  type: r.type === "directory" ? ("folder" as const) : ("file" as const),
                  label: r.name,
                  path: r.path,
                }));
              } catch {
                return [];
              }
            },
            render: () => {
              let component: ReactRenderer<MentionSuggestionListRef> | null =
                null;
              let popup: TippyInstance[] | null = null;

              return {
                onStart: (props) => {
                  suggestionOpenRef.current = true;

                  component = new ReactRenderer(MentionSuggestionList, {
                    props: {
                      ...props,
                      items: props.items,
                      command: (item: MentionSuggestion) => {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        (props.command as any)({
                          id: item.path,
                          label: item.label,
                          mentionType: item.type,
                        });
                      },
                    },
                    editor: props.editor,
                  });

                  if (!props.clientRect) return;

                  popup = tippy("body", {
                    getReferenceClientRect:
                      props.clientRect as () => DOMRect,
                    appendTo: () => document.body,
                    content: component.element,
                    showOnCreate: true,
                    interactive: true,
                    trigger: "manual",
                    placement: "top-start",
                    offset: [0, 8],
                  });
                },

                onUpdate: (props) => {
                  component?.updateProps({
                    ...props,
                    items: props.items,
                    command: (item: MentionSuggestion) => {
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      (props.command as any)({
                        id: item.path,
                        label: item.label,
                        mentionType: item.type,
                      });
                    },
                  });

                  if (props.clientRect && popup?.[0]) {
                    popup[0].setProps({
                      getReferenceClientRect:
                        props.clientRect as () => DOMRect,
                    });
                  }
                },

                onKeyDown: (props) => {
                  if (props.event.key === "Escape") {
                    popup?.[0]?.hide();
                    return true;
                  }
                  return component?.ref?.onKeyDown(props) ?? false;
                },

                onExit: () => {
                  // Delay clearing the flag so the Enter keydown handler
                  // (which fires synchronously) still sees it as open
                  setTimeout(() => {
                    suggestionOpenRef.current = false;
                  }, 50);

                  popup?.[0]?.destroy();
                  component?.destroy();
                },
              };
            },
          },
          renderText: ({ node }) => `@${node.attrs.label ?? node.attrs.id}`,
        }),
      ],
      editorProps: {
        attributes: {
          class: "chat-editor-content",
        },
      },
      editable: !disabled,
      onUpdate: ({ editor: ed }) => {
        onTextChange?.(ed.getText());
      },
    });
    /* eslint-enable react-hooks/refs */

    // Handle Enter to submit (at the editor level, after suggestion handling)
    useEffect(() => {
      if (!editor) return;

      const handleKeyDown = (event: KeyboardEvent) => {
        if (
          event.key === "Enter" &&
          !event.shiftKey &&
          !event.isComposing
        ) {
          // Don't submit if the suggestion dropdown is open
          if (suggestionOpenRef.current) return;

          event.preventDefault();
          const text = editor.getText().trim();
          if (!text) return;

          const mentions = extractMentions(editor);
          onSubmitRef.current(text, mentions);
          editor.commands.clearContent();
        }
      };

      const el = editor.view.dom;
      el.addEventListener("keydown", handleKeyDown);
      return () => el.removeEventListener("keydown", handleKeyDown);
    }, [editor, extractMentions]);

    // Sync disabled state
    useEffect(() => {
      if (editor) {
        editor.setEditable(!disabled);
      }
    }, [editor, disabled]);

    useImperativeHandle(ref, () => ({
      focus: () => editor?.commands.focus(),
      clear: () => editor?.commands.clearContent(),
      getText: () => editor?.getText() ?? "",
      isEmpty: () => editor?.isEmpty ?? true,
      insertText: (text: string) => {
        editor?.commands.focus();
        editor?.commands.insertContent(text);
      },
    }));

    return <EditorContent editor={editor} />;
  }
);

ChatEditor.displayName = "ChatEditor";
