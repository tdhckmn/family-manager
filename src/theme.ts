// Tiny theme store. The actual colors live in CSS variables (index.css); flipping
// the [data-theme] attribute on <html> re-colors the app. We persist the choice and
// expose a hook so components (Settings toggle, StarField) can react live.

import { useEffect, useState } from "react";

export type Theme = "dark" | "light";

const KEY = "equanimity-theme";
const listeners = new Set<() => void>();

function read(): Theme {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

let current: Theme = read();

/** Apply a theme: set the DOM attribute, persist, and notify subscribers. */
export function applyTheme(t: Theme): void {
  current = t;
  document.documentElement.setAttribute("data-theme", t);
  try { localStorage.setItem(KEY, t); } catch { /* ignore */ }
  listeners.forEach(l => l());
}

export function getTheme(): Theme {
  return current;
}

/** Call once at startup (before/at render) to reflect the saved choice. */
export function initTheme(): void {
  document.documentElement.setAttribute("data-theme", current);
}

/** React binding: [theme, setTheme] that stays in sync across components. */
export function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setLocal] = useState<Theme>(current);
  useEffect(() => {
    const l = () => setLocal(current);
    listeners.add(l);
    l(); // sync in case it changed before mount
    return () => { listeners.delete(l); };
  }, []);
  return [theme, applyTheme];
}
