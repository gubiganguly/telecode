"use client";

import { type ReactNode } from "react";
import { useWebSocket } from "@/hooks/use-websocket";
import { ConnectionStatus } from "@/components/layout/connection-status";
import { AuthGuard } from "@/components/auth/auth-guard";

function WebSocketInit() {
  useWebSocket();
  return null;
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <WebSocketInit />
      <ConnectionStatus />
      {children}
    </AuthGuard>
  );
}
