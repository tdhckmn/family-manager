import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./auth";
import { applyTheme } from "./theme";
import { type AppPrefs, DEFAULT_PREFS } from "@equanimity/core";

export type { AppPrefs } from "@equanimity/core";
export { DEFAULT_PREFS } from "@equanimity/core";

const PrefsContext = createContext<{
  prefs: AppPrefs;
  updatePrefs: (p: Partial<AppPrefs>) => Promise<void>;
}>({ prefs: DEFAULT_PREFS, updatePrefs: async () => {} });

function applyAccent(hex: string) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  document.documentElement.style.setProperty("--accent", hex);
  document.documentElement.style.setProperty("--accent-rgb", `${r},${g},${b}`);
}

const CACHE_KEY = (uid: string) => `eq_prefs_${uid}`;

function readCache(uid: string): AppPrefs | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY(uid));
    return raw ? { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<AppPrefs>) } : null;
  } catch { return null; }
}

function writeCache(uid: string, prefs: AppPrefs) {
  try { localStorage.setItem(CACHE_KEY(uid), JSON.stringify(prefs)); } catch { /* quota */ }
}

export function PrefsProvider({ children }: { children: ReactNode }) {
  const user = useAuth();

  // Initialize from localStorage so returning users see their real prefs on frame 1.
  // applyAccent is called inside the initializer (not in an effect) so the CSS var is
  // set synchronously — no single-frame wrong-color flash.
  const [prefs, setLocal] = useState<AppPrefs>(() => {
    const cached = readCache(user.uid);
    const initial = cached ?? DEFAULT_PREFS;
    applyAccent(initial.accentColor);
    return initial;
  });

  useEffect(() => {
    // Re-read cache if uid changes after mount (household member switch, etc.)
    const cached = readCache(user.uid);
    if (cached) { setLocal(cached); applyAccent(cached.accentColor); }

    return onSnapshot(doc(db, "users", user.uid, "meta", "prefs"), snap => {
      const data: AppPrefs = snap.exists()
        ? { ...DEFAULT_PREFS, ...(snap.data() as Partial<AppPrefs>) }
        : DEFAULT_PREFS;
      setLocal(data);
      writeCache(user.uid, data);
    });
  }, [user.uid]);

  useEffect(() => { applyAccent(prefs.accentColor); }, [prefs.accentColor]);
  useEffect(() => { applyTheme(prefs.theme); }, [prefs.theme]);

  async function updatePrefs(partial: Partial<AppPrefs>) {
    const next = { ...prefs, ...partial };
    setLocal(next);
    writeCache(user.uid, next);
    await setDoc(doc(db, "users", user.uid, "meta", "prefs"), next, { merge: true });
  }

  return <PrefsContext.Provider value={{ prefs, updatePrefs }}>{children}</PrefsContext.Provider>;
}

export function usePrefs() {
  return useContext(PrefsContext);
}
