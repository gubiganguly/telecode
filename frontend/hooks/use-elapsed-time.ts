import { useState, useEffect, useRef } from "react";

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  if (totalSec < 60) return `${totalSec}s`;
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

/**
 * Returns a formatted elapsed-time string that updates every second
 * while `active` is true. Returns null when inactive.
 */
export function useElapsedTime(active: boolean) {
  const startRef = useRef<number | null>(null);
  const [elapsed, setElapsed] = useState<string | null>(null);

  useEffect(() => {
    if (!active) {
      startRef.current = null;
      setElapsed(null);
      return;
    }

    startRef.current = Date.now();
    setElapsed("0s");

    const timer = setInterval(() => {
      if (startRef.current) {
        setElapsed(formatElapsed(Date.now() - startRef.current));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [active]);

  return elapsed;
}
