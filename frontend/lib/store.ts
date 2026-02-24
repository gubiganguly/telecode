import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { v4 as uuidv4 } from "uuid";

import { api } from "./api";
import { wsManager } from "./websocket";
import { DEFAULT_MODEL } from "./constants";
import type { ProjectInfo, SessionInfo } from "@/types/api";
import type { ChatMessage, OutboundEvent } from "@/types/chat";

interface AppState {
  // Projects
  projects: ProjectInfo[];
  projectsTotal: number;
  projectsLoading: boolean;
  currentProject: ProjectInfo | null;

  // Sessions
  sessions: SessionInfo[];
  sessionsTotal: number;
  sessionsLoading: boolean;
  activeSessionId: string | null;
  isDraftMode: boolean;

  // Chat
  selectedModel: string;
  messages: Record<string, ChatMessage[]>;
  isStreaming: Record<string, boolean>;
  isWaitingForInput: Record<string, boolean>;

  // Project actions
  fetchProjects: () => Promise<void>;
  fetchProject: (id: string) => Promise<void>;
  createProject: (name: string, description?: string) => Promise<ProjectInfo>;
  deleteProject: (id: string, deleteFiles?: boolean, deleteRepo?: boolean) => Promise<void>;

  // Session actions
  fetchSessions: (projectId: string) => Promise<void>;
  createSession: (projectId: string, name?: string) => Promise<SessionInfo>;
  setActiveSession: (sessionId: string | null) => void;
  enterDraftMode: () => void;
  deleteSession: (id: string) => Promise<void>;
  renameSession: (id: string, name: string) => Promise<void>;

  // Chat actions
  setSelectedModel: (model: string) => void;
  sendMessage: (text: string, projectId: string, sessionId: string, displayText?: string) => void;
  cancelRequest: (sessionId: string) => void;
  handleWsEvent: (event: OutboundEvent) => void;
}

export const useStore = create<AppState>()(
  immer((set, get) => ({
    // Initial state
    projects: [],
    projectsTotal: 0,
    projectsLoading: false,
    currentProject: null,
    sessions: [],
    sessionsTotal: 0,
    sessionsLoading: false,
    activeSessionId: null,
    isDraftMode: false,
    selectedModel: DEFAULT_MODEL,
    messages: {},
    isStreaming: {},
    isWaitingForInput: {},

    // Project actions
    fetchProjects: async () => {
      set((s) => {
        s.projectsLoading = true;
      });
      try {
        const data = await api.listProjects();
        set((s) => {
          s.projects = data.projects;
          s.projectsTotal = data.total;
          s.projectsLoading = false;
        });
      } catch {
        set((s) => {
          s.projectsLoading = false;
        });
      }
    },

    fetchProject: async (id: string) => {
      try {
        const project = await api.getProject(id);
        set((s) => {
          s.currentProject = project;
        });
      } catch {
        // ignore
      }
    },

    createProject: async (name: string, description?: string) => {
      const project = await api.createProject({ name, description });
      set((s) => {
        s.projects.unshift(project);
        s.projectsTotal++;
      });
      return project;
    },

    deleteProject: async (id: string, deleteFiles = false, deleteRepo = false) => {
      await api.deleteProject(id, deleteFiles, deleteRepo);
      set((s) => {
        s.projects = s.projects.filter((p) => p.id !== id);
        s.projectsTotal--;
      });
    },

    // Session actions
    fetchSessions: async (projectId: string) => {
      set((s) => {
        s.sessionsLoading = true;
      });
      try {
        const data = await api.listSessions(projectId);
        set((s) => {
          s.sessions = data.sessions;
          s.sessionsTotal = data.total;
          s.sessionsLoading = false;
        });
      } catch {
        set((s) => {
          s.sessionsLoading = false;
        });
      }
    },

    createSession: async (projectId: string, name?: string) => {
      const session = await api.createSession({ project_id: projectId, name });
      set((s) => {
        s.sessions.unshift(session);
        s.sessionsTotal++;
        s.activeSessionId = session.id;
      });
      return session;
    },

    setActiveSession: (sessionId: string | null) => {
      set((s) => {
        s.activeSessionId = sessionId;
        if (sessionId !== null) {
          s.isDraftMode = false;
        }
      });
    },

    enterDraftMode: () => {
      set((s) => {
        s.activeSessionId = null;
        s.isDraftMode = true;
      });
    },

    deleteSession: async (id: string) => {
      await api.deleteSession(id);
      set((s) => {
        s.sessions = s.sessions.filter((sess) => sess.id !== id);
        s.sessionsTotal--;
        if (s.activeSessionId === id) {
          s.activeSessionId = s.sessions.length > 0 ? s.sessions[0].id : null;
        }
        delete s.messages[id];
        delete s.isStreaming[id];
        delete s.isWaitingForInput[id];
      });
    },

    renameSession: async (id: string, name: string) => {
      await api.updateSession(id, { name });
      set((s) => {
        const sess = s.sessions.find((sess) => sess.id === id);
        if (sess) sess.name = name;
      });
    },

    // Chat actions
    setSelectedModel: (model: string) => {
      set((s) => {
        s.selectedModel = model;
      });
    },

    sendMessage: (text: string, projectId: string, sessionId: string, displayText?: string) => {
      const sent = wsManager.send({
        type: "send_message",
        message: text,
        session_id: sessionId,
        project_id: projectId,
        model: get().selectedModel,
      });

      if (!sent) {
        // WebSocket not connected — show error instead of phantom message
        set((s) => {
          if (!s.messages[sessionId]) s.messages[sessionId] = [];
          s.messages[sessionId].push({
            id: uuidv4(),
            role: "assistant",
            content: "Unable to send message — not connected to server. Please wait for reconnection.",
            thinking: "",
            toolUses: [],
            isStreaming: false,
            isComplete: true,
            timestamp: new Date().toISOString(),
          });
        });
        return;
      }

      // Only add user message to state after successful send
      set((s) => {
        if (!s.messages[sessionId]) s.messages[sessionId] = [];
        const msgs = s.messages[sessionId];

        // If the last assistant message has a pending AskUserQuestion,
        // mark it complete with the user's answer so the card shows
        // the answered summary instead of staying interactive.
        const lastMsg = msgs[msgs.length - 1];
        if (lastMsg?.role === "assistant") {
          for (const tool of lastMsg.toolUses) {
            if (
              tool.toolName === "AskUserQuestion" &&
              !tool.isComplete
            ) {
              tool.isComplete = true;
              tool.output = text;
            }
          }
          if (!lastMsg.isComplete) {
            lastMsg.isComplete = true;
          }
        }

        msgs.push({
          id: uuidv4(),
          role: "user",
          content: displayText || text,
          thinking: "",
          toolUses: [],
          isStreaming: false,
          isComplete: true,
          timestamp: new Date().toISOString(),
        });
        s.isStreaming[sessionId] = true;
        s.isWaitingForInput[sessionId] = false;
      });
    },

    cancelRequest: (sessionId: string) => {
      wsManager.send({ type: "cancel", session_id: sessionId });
    },

    handleWsEvent: (event: OutboundEvent) => {
      const sid =
        "session_id" in event ? (event.session_id as string) : null;

      if (event.type === "session_created") {
        // Refresh sessions list
        const proj = get().currentProject;
        if (proj) get().fetchSessions(proj.id);
        return;
      }

      if (event.type === "session_renamed") {
        set((s) => {
          const sess = s.sessions.find(
            (sess) => sess.id === event.session_id
          );
          if (sess) sess.name = event.name;
        });
        return;
      }

      if (event.type === "error" && !sid) {
        // Global error — could show a toast
        return;
      }

      if (!sid) return;

      set((s) => {
        if (!s.messages[sid]) s.messages[sid] = [];
        const msgs = s.messages[sid];

        switch (event.type) {
          case "message_start": {
            // Mark any previous incomplete assistant message as done
            // (e.g. after input_required → user answered → new turn)
            const prev = msgs[msgs.length - 1];
            if (prev?.role === "assistant" && !prev.isComplete) {
              prev.isComplete = true;
              prev.isStreaming = false;
              for (const tool of prev.toolUses) {
                if (!tool.isComplete) tool.isComplete = true;
              }
            }

            msgs.push({
              id: uuidv4(),
              role: "assistant",
              content: "",
              thinking: "",
              toolUses: [],
              isStreaming: true,
              isComplete: false,
              timestamp: new Date().toISOString(),
            });
            s.isStreaming[sid] = true;
            s.isWaitingForInput[sid] = false;
            break;
          }

          case "text_delta": {
            const last = msgs[msgs.length - 1];
            if (last?.role === "assistant") {
              // Text arriving after tools means all tools have finished
              for (const tool of last.toolUses) {
                if (!tool.isComplete) tool.isComplete = true;
              }
              last.content += event.text;
            }
            break;
          }

          case "thinking_delta": {
            const last = msgs[msgs.length - 1];
            if (last?.role === "assistant") {
              last.thinking += event.thinking;
            }
            break;
          }

          case "tool_use_start": {
            const last = msgs[msgs.length - 1];
            if (last?.role === "assistant") {
              // A new tool starting means all previous tools have finished
              for (const prev of last.toolUses) {
                if (!prev.isComplete) prev.isComplete = true;
              }
              last.toolUses.push({
                toolId: event.tool_id,
                toolName: event.tool_name,
                input: event.input,
                isComplete: false,
              });
            }
            break;
          }

          case "tool_result": {
            const last = msgs[msgs.length - 1];
            if (last?.role === "assistant") {
              const tool = last.toolUses.find(
                (t) => t.toolId === event.tool_id
              );
              if (tool) {
                tool.output = event.output;
                tool.isError = event.is_error;
                tool.isComplete = true;
              }
            }
            break;
          }

          case "input_required": {
            // AskUserQuestion detected — stop streaming but keep the
            // question tool interactive (don't mark isComplete).
            const lastInput = msgs[msgs.length - 1];
            if (lastInput?.role === "assistant") {
              lastInput.isStreaming = false;
            }
            s.isStreaming[sid] = false;
            s.isWaitingForInput[sid] = true;
            break;
          }

          case "message_complete": {
            const last = msgs[msgs.length - 1];
            if (last?.role === "assistant") {
              last.isStreaming = false;
              last.isComplete = true;
              last.usage = event.usage;
              last.costUsd = event.cost_usd;
              // Mark any tools that didn't receive an explicit tool_result
              for (const tool of last.toolUses) {
                if (!tool.isComplete) tool.isComplete = true;
              }
            }
            s.isStreaming[sid] = false;
            s.isWaitingForInput[sid] = false;
            break;
          }

          case "cancelled": {
            const last = msgs[msgs.length - 1];
            if (last?.role === "assistant") {
              last.isStreaming = false;
              for (const tool of last.toolUses) {
                if (!tool.isComplete) tool.isComplete = true;
              }
            }
            s.isStreaming[sid] = false;
            s.isWaitingForInput[sid] = false;
            break;
          }

          case "error": {
            // If there's an in-progress assistant message, mark it done
            const lastErr = msgs[msgs.length - 1];
            if (lastErr?.role === "assistant" && lastErr.isStreaming) {
              lastErr.isStreaming = false;
              lastErr.isComplete = true;
              for (const tool of lastErr.toolUses) {
                if (!tool.isComplete) tool.isComplete = true;
              }
            }
            s.isStreaming[sid] = false;
            s.isWaitingForInput[sid] = false;
            // Add error as a system message
            msgs.push({
              id: uuidv4(),
              role: "assistant",
              content: `Error: ${event.error}`,
              thinking: "",
              toolUses: [],
              isStreaming: false,
              isComplete: true,
              timestamp: new Date().toISOString(),
            });
            break;
          }
        }
      });
    },
  }))
);
