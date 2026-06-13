import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { useHouseholdUid } from "./household";

export interface AppPrefs {
  accentColor: string;
  wisdomTraditions: string[];
  wisdomPages: string[];
  disabledQuotes: string[];
  tempUnit: "F" | "C";
  weatherZip: string;
}

export const DEFAULT_PREFS: AppPrefs = {
  accentColor: "#5db88a",
  wisdomTraditions: ["Stoic", "Taoist"],
  wisdomPages: ["home", "notes"],
  disabledQuotes: [],
  tempUnit: "F",
  weatherZip: "",
};

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

export function PrefsProvider({ children }: { children: ReactNode }) {
  const uid = useHouseholdUid();
  const [prefs, setLocal] = useState<AppPrefs>(DEFAULT_PREFS);

  useEffect(() => {
    return onSnapshot(doc(db, "users", uid, "meta", "prefs"), snap => {
      if (snap.exists()) setLocal({ ...DEFAULT_PREFS, ...(snap.data() as Partial<AppPrefs>) });
    });
  }, [uid]);

  useEffect(() => { applyAccent(prefs.accentColor); }, [prefs.accentColor]);

  async function updatePrefs(partial: Partial<AppPrefs>) {
    const next = { ...prefs, ...partial };
    setLocal(next);
    await setDoc(doc(db, "users", uid, "meta", "prefs"), next, { merge: true });
  }

  return <PrefsContext.Provider value={{ prefs, updatePrefs }}>{children}</PrefsContext.Provider>;
}

export function usePrefs() {
  return useContext(PrefsContext);
}
