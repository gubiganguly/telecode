"use client";

import { useEffect, useState } from "react";

const THINKING_PHRASES = [
  "Thinking...",
  "Pondering...",
  "Reasoning...",
  "Contemplating...",
  "Discombobulating...",
  "Cogitating...",
  "Ruminating...",
  "Noodling on it...",
  "Untangling...",
  "Connecting dots...",
  "Brewing ideas...",
  "Crunching thoughts...",
  "Assembling neurons...",
  "Juggling concepts...",
  "Marinating...",
  "Percolating...",
  "Philosophizing...",
  "Brainstorming...",
  "Synthesizing...",
  "Calculating vibes...",
  "Mulling...",
  "Unscrambling...",
  "Defragmenting...",
  "Recombobulating...",
  "Calibrating synapses...",
  "Rearranging atoms...",
  "Manifesting thoughts...",
  "Wrangling tokens...",
  "Simmering...",
  "Decoding the universe...",
];

export function useThinkingPhrase(active: boolean): string {
  const [index, setIndex] = useState(
    () => Math.floor(Math.random() * THINKING_PHRASES.length)
  );

  useEffect(() => {
    if (!active) return;

    const interval = setInterval(() => {
      setIndex((prev) => {
        let next: number;
        do {
          next = Math.floor(Math.random() * THINKING_PHRASES.length);
        } while (next === prev && THINKING_PHRASES.length > 1);
        return next;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [active]);

  return THINKING_PHRASES[index];
}
