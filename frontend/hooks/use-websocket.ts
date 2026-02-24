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

    const unsub = wsManager.onStatusChange(setStatus);
    return () => {
      unsub();
    };
    // Keep connection alive across route changes — don't disconnect on unmount
  }, [handleWsEvent]);

  return { status, isConnected: status === "connected" };
}
