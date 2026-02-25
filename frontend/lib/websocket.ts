import {
  WS_URL,
  WS_RECONNECT_BASE_MS,
  WS_RECONNECT_MAX_MS,
  WS_PING_INTERVAL_MS,
} from "./constants";
import { getToken, clearToken } from "./auth";
import type { InboundMessage, OutboundEvent } from "@/types/chat";

export type ConnectionStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "reconnecting";

export type EventHandler = (event: OutboundEvent) => void;

class WebSocketManager {
  private ws: WebSocket | null = null;
  private _status: ConnectionStatus = "disconnected";
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private eventHandler: EventHandler | null = null;
  private statusListeners = new Set<(status: ConnectionStatus) => void>();
  private reconnectCallbacks = new Set<() => void>();

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    if (this.ws?.readyState === WebSocket.CONNECTING) return;

    this.setStatus("connecting");

    try {
      const token = getToken();
      if (!token) {
        this.setStatus("disconnected");
        return;
      }
      const url = `${WS_URL}?token=${encodeURIComponent(token)}`;
      this.ws = new WebSocket(url);
    } catch {
      this.setStatus("reconnecting");
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      const wasReconnect = this.reconnectAttempt > 0;
      this.reconnectAttempt = 0;
      this.setStatus("connected");
      this.startPing();
      if (wasReconnect) {
        this.reconnectCallbacks.forEach((cb) => cb());
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const data: OutboundEvent = JSON.parse(event.data);
        if (data.type === "pong") return;
        this.eventHandler?.(data);
      } catch {
        // ignore malformed messages
      }
    };

    this.ws.onclose = (event) => {
      this.stopPing();
      if (event.code === 1008) {
        clearToken();
        window.location.href = "/login";
        return;
      }
      if (this._status !== "disconnected") {
        this.setStatus("reconnecting");
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = () => {
      // onclose fires after onerror
    };
  }

  disconnect(): void {
    this.stopPing();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    const ws = this.ws;
    this.ws = null;
    this.setStatus("disconnected");
    ws?.close();
  }

  send(message: InboundMessage): boolean {
    if (this.ws?.readyState !== WebSocket.OPEN) return false;
    try {
      this.ws.send(JSON.stringify(message));
      return true;
    } catch {
      return false;
    }
  }

  onEvent(handler: EventHandler): void {
    this.eventHandler = handler;
  }

  onStatusChange(listener: (status: ConnectionStatus) => void): () => void {
    this.statusListeners.add(listener);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  getStatus(): ConnectionStatus {
    return this._status;
  }

  onReconnect(callback: () => void): () => void {
    this.reconnectCallbacks.add(callback);
    return () => {
      this.reconnectCallbacks.delete(callback);
    };
  }

  private setStatus(status: ConnectionStatus): void {
    this._status = status;
    this.statusListeners.forEach((l) => l(status));
  }

  private scheduleReconnect(): void {
    const delay = Math.min(
      WS_RECONNECT_BASE_MS * Math.pow(2, this.reconnectAttempt) +
        Math.random() * 1000,
      WS_RECONNECT_MAX_MS
    );
    this.reconnectAttempt++;
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  private startPing(): void {
    this.pingTimer = setInterval(() => {
      this.send({ type: "ping" });
    }, WS_PING_INTERVAL_MS);
  }

  private stopPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }
}

export const wsManager = new WebSocketManager();
