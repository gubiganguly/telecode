// --- Inbound (frontend → backend) ---

export type InboundMessage =
  | SendMessagePayload
  | CancelPayload
  | PingPayload
  | SubscribePayload
  | UnsubscribePayload;

export interface SendMessagePayload {
  type: "send_message";
  message: string;
  session_id: string;
  project_id: string;
  model?: string;
  max_budget_usd?: number;
}

export interface CancelPayload {
  type: "cancel";
  session_id: string;
}

export interface PingPayload {
  type: "ping";
}

export interface SubscribePayload {
  type: "subscribe";
  session_id: string;
}

export interface UnsubscribePayload {
  type: "unsubscribe";
  session_id: string;
}

// --- Outbound (backend → frontend) ---

export type OutboundEvent =
  | MessageStartEvent
  | TextDeltaEvent
  | ThinkingDeltaEvent
  | ToolUseStartEvent
  | ToolResultEvent
  | MessageCompleteEvent
  | InputRequiredEvent
  | SessionCreatedEvent
  | SessionRenamedEvent
  | CancelledEvent
  | PongEvent
  | ErrorEvent
  | TaskReplayEvent;

export interface MessageStartEvent {
  type: "message_start";
  session_id: string;
}

export interface TextDeltaEvent {
  type: "text_delta";
  session_id: string;
  text: string;
}

export interface ThinkingDeltaEvent {
  type: "thinking_delta";
  session_id: string;
  thinking: string;
}

export interface ToolUseStartEvent {
  type: "tool_use_start";
  session_id: string;
  tool_name: string;
  tool_id: string;
  input: Record<string, unknown>;
}

export interface ToolResultEvent {
  type: "tool_result";
  session_id: string;
  tool_id: string;
  output: string;
  is_error: boolean;
}

export interface MessageCompleteEvent {
  type: "message_complete";
  session_id: string;
  result_text: string;
  usage?: Record<string, number>;
  cost_usd?: number;
}

export interface InputRequiredEvent {
  type: "input_required";
  session_id: string;
}

export interface SessionCreatedEvent {
  type: "session_created";
  session_id: string;
  project_id: string;
}

export interface SessionRenamedEvent {
  type: "session_renamed";
  session_id: string;
  name: string;
}

export interface CancelledEvent {
  type: "cancelled";
  session_id: string;
}

export interface PongEvent {
  type: "pong";
}

export interface ErrorEvent {
  type: "error";
  session_id?: string;
  error: string;
  code?: string;
}

export interface TaskReplayEvent {
  type: "task_replay";
  session_id: string;
  events: OutboundEvent[];
  is_complete: boolean;
}

// --- Frontend chat model ---

export type MessageRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  thinking: string;
  toolUses: ToolUse[];
  isStreaming: boolean;
  isComplete: boolean;
  timestamp: string;
  usage?: Record<string, number>;
  costUsd?: number;
}

export interface ToolUse {
  toolId: string;
  toolName: string;
  input: Record<string, unknown>;
  output?: string;
  isError?: boolean;
  isComplete: boolean;
}

export type SessionStatus = "idle" | "streaming" | "waiting_for_input";

export interface SlashCommand {
  command: string;
  label: string;
  description: string;
  isCustom?: boolean;
}
