"use client";

import { useState, useEffect, useCallback } from "react";
import {
  isSupported,
  getPermission,
  isEnabled,
  setEnabled as setEnabledPref,
  requestPermission,
} from "@/lib/notifications";

export function useNotifications() {
  const [permission, setPermission] = useState<
    NotificationPermission | "unsupported"
  >("default");
  const [enabled, setEnabledState] = useState(false);

  // Sync state on mount
  useEffect(() => {
    setPermission(getPermission());
    setEnabledState(isEnabled());
  }, []);

  const request = useCallback(async () => {
    if (!isSupported()) return false;
    const granted = await requestPermission();
    setPermission(getPermission());
    if (granted) {
      setEnabledPref(true);
      setEnabledState(true);
    }
    return granted;
  }, []);

  const toggle = useCallback(
    (value: boolean) => {
      setEnabledPref(value);
      setEnabledState(value);
    },
    []
  );

  return {
    /** Whether the browser supports notifications */
    supported: isSupported(),
    /** Current browser permission: "granted" | "denied" | "default" | "unsupported" */
    permission,
    /** Whether notifications are enabled (granted + user preference) */
    enabled,
    /** Request browser permission */
    request,
    /** Toggle enabled preference (only works if permission is granted) */
    toggle,
  };
}
