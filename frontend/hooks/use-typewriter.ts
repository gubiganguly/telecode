"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const TICK_MS = 30;

/** Adaptive speed: type faster when there's a big backlog */
function charsPerTick(buffered: number): number {
  if (buffered > 2000) return 20;
  if (buffered > 800) return 10;
  if (buffered > 200) return 4;
  if (buffered > 50) return 2;
  return 1;
}

/**
 * Typewriter effect that gradually reveals text.
 * When `enabled` is false, returns the full text immediately (no animation).
 * Speed adapts to the backlog — fast for large chunks, slow for short text.
 */
export function useTypewriter(text: string, enabled: boolean): string {
  const [displayLen, setDisplayLen] = useState(() => enabled ? text.length : 0);
  const textRef = useRef(text);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef(0);

  textRef.current = text;

  const tick = useCallback(() => {
    const now = performance.now();
    if (now - lastTickRef.current >= TICK_MS) {
      lastTickRef.current = now;
      setDisplayLen((prev) => {
        const target = textRef.current.length;
        if (prev >= target) return prev;
        const buffered = target - prev;
        return Math.min(prev + charsPerTick(buffered), target);
      });
    }
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const needsTyping = displayLen < text.length;

    if (needsTyping && !rafRef.current) {
      lastTickRef.current = performance.now();
      rafRef.current = requestAnimationFrame(tick);
    }

    if (!needsTyping && rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [enabled, displayLen, text.length, tick]);

  if (!enabled) return text;

  return text.slice(0, displayLen);
}
