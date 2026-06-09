import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth } from "../../firebase";
import { Icon } from "../../components/Icon";
import { UserProfile } from "../../components/GlobalHeader";
import StarField from "../../components/StarField";
import { useTheme, type Theme } from "../../theme";
import {
  Panel, BG, SURFACE, BORDER, BORDER_HI, TEXT, TEXT_DIM, TEXT_MUTED,
  JADE, DANGER, INK, FONT,
} from "../shared/kit";

export default function Settings() {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [theme, setTheme] = useTheme();
  useEffect(() => onAuthStateChanged(auth, setUser), []);

  return (
    <div style={{ background: BG, minHeight: "100vh", fontFamily: FONT, color: TEXT, position: "relative" }}>
      <StarField />
      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Header */}
        <div style={{ padding: "14px 20px", minHeight: 60, borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: 12, boxSizing: "border-box" }}>
          <Link to="/" style={{ textDecoration: "none", color: TEXT_DIM, fontSize: 13, fontWeight: 600, opacity: 0.7, flexShrink: 0 }}
            onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.opacity = "1"}
            onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.opacity = "0.7"}>
            ← Home
          </Link>
          <div style={{ width: 1, height: 14, background: BORDER, flexShrink: 0 }} />
          <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: 1.2, textTransform: "uppercase", color: TEXT }}>Settings</span>
        </div>

        <div style={{ maxWidth: 620, margin: "0 auto", width: "100%", padding: "24px 20px 80px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Account */}
          <Panel title="Account" icon={<Icon name="shield" size={15} />} accent={JADE}>
            <div style={{ borderRadius: 12, background: "var(--surface)", border: `1px solid ${BORDER}`, overflow: "hidden" }}>
              <UserProfile user={user} />
            </div>
            <button
              onClick={() => signOut(auth).catch(console.error)}
              style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10, width: "100%", justifyContent: "center", background: "transparent", border: `1px solid ${DANGER}44`, borderRadius: 10, color: DANGER, fontSize: 13, fontWeight: 700, padding: "11px 0", cursor: "pointer", fontFamily: FONT, transition: "all 0.15s" }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = `${DANGER}12`}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = "transparent"}>
              <Icon name="signout" size={15} /> Sign out
            </button>
          </Panel>

          {/* Theme */}
          <Panel title="Theme" icon={<Icon name="sparkles" size={15} />} accent={JADE}>
            <div style={{ fontSize: 12, color: TEXT_DIM, marginBottom: 12 }}>
              Choose how Equanimity looks. Your choice is saved on this device.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <ThemeOption label="Dark" value="dark" current={theme} onPick={setTheme}
                swatchBg="#06091a" swatchSurface="rgba(255,255,255,0.12)" swatchText="#dedad0" />
              <ThemeOption label="Light" value="light" current={theme} onPick={setTheme}
                swatchBg="#f2f0e8" swatchSurface="rgba(20,22,45,0.10)" swatchText="#23222e" />
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function ThemeOption({ label, value, current, onPick, swatchBg, swatchSurface, swatchText }: {
  label: string; value: Theme; current: Theme; onPick: (t: Theme) => void;
  swatchBg: string; swatchSurface: string; swatchText: string;
}) {
  const active = current === value;
  return (
    <button onClick={() => onPick(value)}
      style={{ textAlign: "left", padding: 10, borderRadius: 14, cursor: "pointer", fontFamily: FONT,
        background: active ? "var(--surface-hi)" : "transparent",
        border: `1.5px solid ${active ? JADE : BORDER}`, transition: "all 0.15s" }}>
      {/* Mini preview */}
      <div style={{ height: 64, borderRadius: 9, background: swatchBg, border: `1px solid ${BORDER_HI}`, padding: 8, display: "flex", flexDirection: "column", gap: 5, overflow: "hidden" }}>
        <div style={{ height: 8, width: "60%", borderRadius: 3, background: swatchText, opacity: 0.85 }} />
        <div style={{ height: 6, width: "85%", borderRadius: 3, background: swatchSurface }} />
        <div style={{ height: 6, width: "70%", borderRadius: 3, background: swatchSurface }} />
        <div style={{ marginTop: "auto", height: 10, width: 34, borderRadius: 5, background: JADE }} />
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 9 }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: active ? JADE : TEXT }}>{label}</span>
        {active && (
          <span style={{ width: 18, height: 18, borderRadius: "50%", background: JADE, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: INK, fontSize: 11, fontWeight: 800, lineHeight: 1 }}>✓</span>
          </span>
        )}
      </div>
    </button>
  );
}
