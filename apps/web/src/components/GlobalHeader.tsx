import { useState, useRef, useEffect, type FormEvent } from "react";
import { useLocation, Link } from "react-router-dom";
import { signOut, onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../firebase";
import { Icon } from "./Icon";
import MarkdownHelp from "./MarkdownHelp";
import { isOwnerEmail } from "../household";
import { useOverlayOpen } from "../overlay";
import { usePrefs } from "../prefs";
import { useNoise, NOISE_OPTIONS } from "../noise";

const BG_PANEL  = "var(--panel)";
const BORDER    = "var(--border)";
const TEXT      = "var(--text)";
const TEXT_DIM  = "var(--text-dim)";
const DANGER    = "#c0566a";

// Pages that render their own integrated gear, or embed GlobalHeader inline via PageShell.
const PAGES_WITH_OWN_GEAR = [
  "/app/finance", "/app/settings",
  "/app/chores", "/app/calendar", "/app/focus", "/app/wisdom", "/app/maintenance",
  "/app/notes", "/app/food",
];

/** Avatar + Google name/email block, shared across settings menus. */
export function UserProfile({ user }: { user: User | null }) {
  const name = user?.displayName || "Signed in";
  const email = user?.email || "";
  const initial = (user?.displayName || user?.email || "?").charAt(0).toUpperCase();

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "12px 16px" }}>
      {user?.photoURL ? (
        <img src={user.photoURL} alt="" referrerPolicy="no-referrer"
          style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0, objectFit: "cover", border: `1px solid ${BORDER}` }} />
      ) : (
        <div style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0, background: "rgba(var(--accent-rgb),0.13)", border: "1px solid rgba(var(--accent-rgb),0.33)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800 }}>
          {initial}
        </div>
      )}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
        {email && <div style={{ fontSize: 11, color: TEXT_DIM, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{email}</div>}
      </div>
    </div>
  );
}

export default function GlobalHeader({ inline = false }: { inline?: boolean }) {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [mdOpen, setMdOpen] = useState(false);
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const ref = useRef<HTMLDivElement>(null);
  const onNotes = location.pathname === "/app/notes";
  const overlayOpen = useOverlayOpen();
  const { prefs, updatePrefs } = usePrefs();
  const { on, noiseType, toggle, changeType } = useNoise();
  function cycleNoise() {
    const idx = NOISE_OPTIONS.findIndex(n => n.type === noiseType);
    changeType(NOISE_OPTIONS[(idx + 1) % NOISE_OPTIONS.length].type);
  }

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Finance (and any future page) manages its own gear
  if (!inline && PAGES_WITH_OWN_GEAR.includes(location.pathname)) return null;
  // A full-screen detail viewer is open — it has its own header controls.
  if (overlayOpen) return null;

  function handleSignOut() {
    setOpen(false);
    signOut(auth).catch(console.error);
  }

  return (
    <div
      ref={ref}
      style={inline ? {
        position: "relative",
        fontFamily: "'Montserrat', sans-serif",
      } : {
        position: "fixed",
        top: 14,
        right: 16,
        zIndex: 1000,
        fontFamily: "'Montserrat', sans-serif",
      }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        title="Settings"
        style={{
          background: open ? "var(--surface-hi)" : "var(--panel)",
          border: `1px solid ${open ? "var(--border-hi)" : BORDER}`,
          borderRadius: 8,
          color: open ? TEXT : TEXT_DIM,
          fontSize: 16,
          width: 34,
          height: 34,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backdropFilter: "blur(8px)",
          transition: "all 0.15s",
        }}
        onMouseEnter={e => {
          if (!open) {
            (e.currentTarget as HTMLButtonElement).style.color = TEXT;
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-hi)";
          }
        }}
        onMouseLeave={e => {
          if (!open) {
            (e.currentTarget as HTMLButtonElement).style.color = TEXT_DIM;
            (e.currentTarget as HTMLButtonElement).style.borderColor = BORDER;
          }
        }}
      >
        <Icon name="gear" size={17} />
      </button>

      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 8px)",
          right: 0,
          minWidth: 220,
          background: BG_PANEL,
          border: `1px solid ${BORDER}`,
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          backdropFilter: "blur(16px)",
        }}>
          <div style={{ padding: "4px 0" }}>
            <UserProfile user={user} />

            <div style={{ height: 1, background: BORDER, margin: "4px 0" }} />

            <Link
              to="/app/settings"
              onClick={() => setOpen(false)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                width: "100%", textAlign: "left", padding: "10px 16px",
                background: "transparent", border: "none", textDecoration: "none",
                color: TEXT, fontSize: 13, fontWeight: 600,
                cursor: "pointer", fontFamily: "'Montserrat', sans-serif",
              }}
              onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.background = "rgba(125,125,150,0.10)"}
              onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.background = "transparent"}
            >
              <Icon name="gear" size={15} /> Settings
            </Link>

            {isOwnerEmail(user?.email) && (
              <Link
                to="/app/admin"
                onClick={() => setOpen(false)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  width: "100%", textAlign: "left", padding: "10px 16px",
                  background: "transparent", border: "none", textDecoration: "none",
                  color: "var(--accent)", fontSize: 13, fontWeight: 600,
                  cursor: "pointer", fontFamily: "'Montserrat', sans-serif",
                }}
                onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.background = "rgba(var(--accent-rgb),0.07)"}
                onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.background = "transparent"}
              >
                <Icon name="shield" size={15} /> Admin
              </Link>
            )}

            {onNotes && (
              <button
                onClick={() => { setOpen(false); setMdOpen(true); }}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  width: "100%", textAlign: "left", padding: "10px 16px",
                  background: "transparent", border: "none",
                  color: TEXT, fontSize: 13, fontWeight: 600,
                  cursor: "pointer", fontFamily: "'Montserrat', sans-serif",
                }}
                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-hi)"}
                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = "transparent"}
              >
                <Icon name="book" size={15} /> Markdown guide
              </button>
            )}

            <div style={{ height: 1, background: "var(--border)", margin: "4px 0" }} />

            {/* Theme toggle */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 16px" }}>
              <Icon name="sparkles" size={14} color={TEXT_DIM} />
              <span style={{ fontSize: 12, color: TEXT_DIM, fontWeight: 600, flex: 1 }}>Theme</span>
              <div style={{ display: "flex", background: "var(--surface)", borderRadius: 7, padding: 2, border: "1px solid var(--border)" }}>
                {(["dark", "light"] as const).map(t => (
                  <button key={t} onClick={() => updatePrefs({ theme: t })}
                    style={{ padding: "3px 10px", borderRadius: 5, border: "none", cursor: "pointer", fontFamily: "'Montserrat', sans-serif", fontSize: 11, fontWeight: 800, textTransform: "capitalize",
                      background: prefs.theme === t ? TEXT_DIM : "transparent",
                      color: prefs.theme === t ? "var(--bg)" : TEXT_DIM }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Weather: °F / °C + location */}
            <div style={{ padding: "8px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Icon name="sun" size={14} color={TEXT_DIM} />
                <span style={{ fontSize: 12, color: TEXT_DIM, fontWeight: 600, flex: 1 }}>Temperature</span>
                <div style={{ display: "flex", background: "var(--surface)", borderRadius: 7, padding: 2, border: "1px solid var(--border)" }}>
                  {(["F", "C"] as const).map(u => (
                    <button key={u} onClick={() => updatePrefs({ tempUnit: u })}
                      style={{ padding: "3px 9px", borderRadius: 5, border: "none", cursor: "pointer", fontFamily: "'Montserrat', sans-serif", fontSize: 11, fontWeight: 800,
                        background: prefs.tempUnit === u ? "#e8c84a" : "transparent",
                        color: prefs.tempUnit === u ? "#06091a" : TEXT_DIM }}>
                      °{u}
                    </button>
                  ))}
                </div>
              </div>
              <WeatherZipRow zip={prefs.weatherZip} onZip={z => updatePrefs({ weatherZip: z })} />
            </div>

            {/* Noise toggle */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 16px" }}>
              <Icon name="moon" size={14} color={TEXT_DIM} />
              <button
                onClick={cycleNoise}
                style={{ flex: 1, background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left", fontFamily: "'Montserrat', sans-serif", fontSize: 12, color: TEXT_DIM, fontWeight: 600, textTransform: "capitalize" }}
                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = TEXT}
                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = TEXT_DIM}
              >{noiseType} noise</button>
              <button
                onClick={toggle}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "3px 10px", borderRadius: 7,
                  border: `1px solid ${on ? "var(--accent)" : BORDER}`,
                  background: on ? "rgba(var(--accent-rgb),0.12)" : "var(--surface)",
                  color: on ? "var(--accent)" : TEXT_DIM,
                  fontSize: 11, fontWeight: 700, cursor: "pointer",
                  fontFamily: "'Montserrat', sans-serif", transition: "all 0.15s",
                }}
              >
                {on ? <Icon name="stop" size={10} /> : <Icon name="play" size={10} />}
                {on ? "On" : "Off"}
              </button>
            </div>

            <div style={{ height: 1, background: "var(--border)", margin: "4px 0" }} />

            <button
              onClick={handleSignOut}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                width: "100%", textAlign: "left", padding: "10px 16px",
                background: "transparent", border: "none",
                color: DANGER, fontSize: 13, fontWeight: 600,
                cursor: "pointer", fontFamily: "'Montserrat', sans-serif",
              }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = `${DANGER}12`}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = "transparent"}
            >
              <Icon name="signout" size={15} /> Sign out
            </button>
          </div>
        </div>
      )}

      {mdOpen && <MarkdownHelp onClose={() => setMdOpen(false)} />}
    </div>
  );
}

function WeatherZipRow({ zip, onZip }: { zip: string; onZip: (z: string) => void }) {
  const [draft, setDraft] = useState(zip);
  useEffect(() => { setDraft(zip); }, [zip]);
  function commit() { if (draft.trim() !== zip) onZip(draft.trim()); }
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <Icon name="target" size={14} color={TEXT_DIM} />
      <span style={{ fontSize: 12, color: TEXT_DIM, fontWeight: 600, flex: 1 }}>Location</span>
      <form onSubmit={(e: FormEvent) => { e.preventDefault(); commit(); }} style={{ display: "flex", gap: 4 }}>
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          placeholder="ZIP / city"
          style={{ width: 90, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 7, padding: "3px 8px", color: TEXT_DIM, fontSize: 12, fontFamily: "'Montserrat', sans-serif", outline: "none" }}
        />
        {zip && (
          <button type="button" onClick={() => { setDraft(""); onZip(""); }} title="Use device location"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 7, padding: "3px 6px", cursor: "pointer", display: "flex", alignItems: "center" }}>
            <Icon name="x" size={11} color={TEXT_DIM} />
          </button>
        )}
      </form>
    </div>
  );
}
