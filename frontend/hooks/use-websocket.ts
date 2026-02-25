"use client";

import { useEffect, useState } from "react";
import { wsManager, type ConnectionStatus } from "@/lib/websocket";
import { useStore } from "@/lib/store";

export function useWebSocket() {
  const [status, setStatus] = useState<ConnectionStatus>(
    wsManager.getStatus()
  );
  const handleWsEvent = useStore((s) => s.handleWsEvent);

  useEffect(() => {
    wsManager.onEvent(handleWsEvent);
    wsManager.connect();

    const unsubStatus = wsManager.onStatusChange(setStatus);

    // On reconnect, re-subscribe to the active session so we get
    // replay of any events that happened while disconnected
    const unsubReconnect = wsManager.onReconnect(() => {
      const activeSessionId = useStore.getState().activeSessionId;
      if (activeSessionId) {
        wsManager.send({ type: "subscribe", session_id: activeSessionId });
      }
    });

    return () => {
      unsubStatus();
      unsubReconnect();
    };
    // Keep connection alive across route changes — don't disconnect on unmount
  }, [handleWsEvent]);

  return { status, isConnected: status === "connected" };
}
