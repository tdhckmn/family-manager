import type { Theme } from "./types";

export interface AppPrefs {
  accentColor: string;
  wisdomTraditions: string[];
  wisdomPages: string[];
  disabledQuotes: string[];
  enabledQuotes: string[];
  tempUnit: "F" | "C";
  weatherZip: string;
  appIcon: string;
  theme: Theme;
  gcalEnabledCalendars: string[];
  focusBreathingId: string;
  focusVoiceGuide: boolean;
  focusNoiseType: string;
  focusNoiseVolume: number;
  focusAffirmationCategoryId: string;
}

export const DEFAULT_PREFS: AppPrefs = {
  accentColor: "#5db88a",
  wisdomTraditions: ["Stoic", "Taoist"],
  wisdomPages: ["home", "notes"],
  disabledQuotes: [],
  enabledQuotes: [],
  tempUnit: "F",
  weatherZip: "",
  appIcon: "mountain",
  theme: "dark",
  gcalEnabledCalendars: [],
  focusBreathingId: "relax",
  focusVoiceGuide: false,
  focusNoiseType: "brown",
  focusNoiseVolume: 0.55,
  focusAffirmationCategoryId: "",
};
