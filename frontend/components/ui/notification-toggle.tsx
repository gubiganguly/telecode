"use client";

import { Bell, BellOff } from "lucide-react";
import { useNotifications } from "@/hooks/use-notifications";
import { cn } from "@/lib/utils";

export function NotificationToggle() {
  const { supported, permission, enabled, request, toggle } =
    useNotifications();

  if (!supported) return null;

  const handleClick = async () => {
    if (permission === "default") {
      await request();
    } else if (permission === "granted") {
      toggle(!enabled);
    }
    // If denied, clicking does nothing useful — browser must be changed
  };

  const isDenied = permission === "denied";
  const isActive = permission === "granted" && enabled;

  return (
    <button
      onClick={handleClick}
      disabled={isDenied}
      className={cn(
        "p-1.5 rounded-md transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed",
        isActive
          ? "bg-accent-muted text-accent"
          : "hover:bg-bg-tertiary text-text-tertiary"
      )}
      title={
        isDenied
          ? "Notifications blocked by browser"
          : isActive
            ? "Notifications enabled — click to disable"
            : permission === "granted"
              ? "Notifications disabled — click to enable"
              : "Enable browser notifications"
      }
    >
      {isActive ? <Bell size={15} /> : <BellOff size={15} />}
    </button>
  );
}
