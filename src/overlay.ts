import { useSyncExternalStore, useEffect } from "react";

// Tracks how many full-screen overlays (detail viewers, etc.) are open, so the
// global fixed gear can hide itself and not overlap their headers/controls.
let count = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());

/** Register a full-screen overlay for as long as the calling component is mounted. */
export function useOverlay(active = true): void {
  useEffect(() => {
    if (!active) return;
    count++;
    emit();
    return () => { count = Math.max(0, count - 1); emit(); };
  }, [active]);
}

/** True while any full-screen overlay is open. */
export function useOverlayOpen(): boolean {
  return useSyncExternalStore(
    cb => { listeners.add(cb); return () => listeners.delete(cb); },
    () => count > 0,
    () => false,
  );
}
