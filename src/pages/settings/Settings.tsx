import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth } from "../../firebase";
import { Icon } from "../../components/Icon";
import { UserProfile } from "../../components/GlobalHeader";
import StarField from "../../components/StarField";
import { useTheme, type Theme } from "../../theme";
import { useSubscription, isSubActive, isOwnerEmail, trialDaysLeft } from "../../subscription";
import {
  Panel, BG, SURFACE, BORDER, BORDER_HI, TEXT, TEXT_DIM, TEXT_MUTED,
  JADE, DANGER, YELLOW, INK, FONT,
} from "../shared/kit";

export default function Settings() {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [theme, setTheme] = useTheme();
  const [copied, setCopied] = useState(false);
  useEffect(() => onAuthStateChanged(auth, setUser), []);

  const { sub } = useSubscription(user?.uid ?? "");
  const active = isSubActive(sub);
  const daysLeft = trialDaysLeft(sub);
  const kioskUrl = `${window.location.origin}/calendar?kiosk=true`;

  function copyKioskUrl() {
    navigator.clipboard.writeText(kioskUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div style={{ background: BG, minHeight: "100vh", fontFamily: FONT, color: TEXT, position: "relative" }}>
      <StarField />
      <div style={{ position: "relative", zIndex: 1 }}>
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

          {/* Subscription */}
          {!isOwnerEmail(user?.email) && (
            <Panel title="Subscription" icon={<Icon name="card" size={15} />} accent={active ? JADE : YELLOW}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: "var(--surface)", border: `1px solid ${BORDER}`, borderRadius: 10 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: active ? JADE : YELLOW }}>
                    {sub?.override ? "Access granted" : sub?.status === "active" ? "Active" : sub?.status === "trialing" ? `Trial — ${daysLeft}d left` : sub?.status === "canceled" ? "Canceled" : "No subscription"}
                  </div>
                  {sub?.plan && <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 2 }}>{sub.plan} plan{sub.currentPeriodEnd ? ` · renews ${sub.currentPeriodEnd}` : ""}</div>}
                </div>
                <Link to="/subscribe"
                  style={{ fontSize: 12, fontWeight: 700, color: INK, background: active ? JADE : YELLOW, textDecoration: "none", padding: "7px 14px", borderRadius: 8 }}>
                  {active ? "Manage" : "Subscribe"}
                </Link>
              </div>
            </Panel>
          )}

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

          {/* Kiosk / display mode */}
          <Panel title="Kiosk Mode" icon={<Icon name="calendar" size={15} />} accent={YELLOW}>
            <p style={{ fontSize: 13, color: TEXT_DIM, lineHeight: 1.65, margin: "0 0 12px" }}>
              Open this URL on a wall-mounted display or tablet to show a full-screen clock and Today view. The device must be signed in to your account.
            </p>
            <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
              <div style={{ flex: 1, background: "var(--input-bg)", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "9px 12px", fontSize: 12, color: TEXT_MUTED, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {kioskUrl}
              </div>
              <button onClick={copyKioskUrl}
                style={{ padding: "9px 16px", borderRadius: 8, border: "none", background: copied ? JADE : "var(--surface-hi)", color: copied ? INK : TEXT, fontFamily: FONT, fontWeight: 700, fontSize: 13, cursor: "pointer", transition: "all 0.15s", flexShrink: 0 }}>
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <div style={{ marginTop: 10 }}>
              <a href={kioskUrl} target="_blank" rel="noreferrer"
                style={{ fontSize: 12, color: YELLOW, textDecoration: "none", fontWeight: 600 }}>
                Open kiosk view ↗
              </a>
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
