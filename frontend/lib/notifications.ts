const STORAGE_KEY = "casperbot-notifications-enabled";

/** Whether browser notifications are supported */
export function isSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

/** Current permission state */
export function getPermission(): NotificationPermission | "unsupported" {
  if (!isSupported()) return "unsupported";
  return Notification.permission;
}

/** Whether the user has opted in via localStorage (default: true once granted) */
export function isEnabled(): boolean {
  if (!isSupported()) return false;
  if (Notification.permission !== "granted") return false;
  return localStorage.getItem(STORAGE_KEY) !== "false";
}

/** Toggle the localStorage preference */
export function setEnabled(enabled: boolean) {
  localStorage.setItem(STORAGE_KEY, String(enabled));
}

/** Request browser permission. Returns true if granted. */
export async function requestPermission(): Promise<boolean> {
  if (!isSupported()) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

/**
 * Show a browser notification.
 * Only fires if enabled + granted + (tab hidden OR different session).
 */
export function notify(
  title: string,
  options?: NotificationOptions & { activeSessionId?: string; eventSessionId?: string }
) {
  if (!isEnabled()) return;

  const { activeSessionId, eventSessionId, ...notifOptions } = options ?? {};

  // Only notify if tab is hidden OR the event is from a background session
  const isTabHidden = document.visibilityState === "hidden";
  const isBackgroundSession =
    activeSessionId != null &&
    eventSessionId != null &&
    activeSessionId !== eventSessionId;

  if (!isTabHidden && !isBackgroundSession) return;

  const notification = new Notification(title, {
    icon: "/favicon.ico",
    ...notifOptions,
  });

  notification.onclick = () => {
    window.focus();
    notification.close();
  };
}
