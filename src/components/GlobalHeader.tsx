import { useState, useRef, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { signOut, onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../firebase";
import { Icon } from "./Icon";
import MarkdownHelp from "./MarkdownHelp";
import { isOwnerEmail } from "../subscription";

const BG_PANEL  = "var(--panel)";
const BORDER    = "var(--border)";
const TEXT      = "var(--text)";
const TEXT_DIM  = "var(--text-dim)";
const DANGER    = "#c0566a";
const JADE      = "#5db88a";

// Pages that render their own integrated gear, or are themselves a settings surface —
// suppress the global gear there.
const PAGES_WITH_OWN_GEAR = ["/finance", "/settings"];

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
        <div style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0, background: `${JADE}22`, border: `1px solid ${JADE}55`, color: JADE, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800 }}>
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

export default function GlobalHeader() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [mdOpen, setMdOpen] = useState(false);
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const ref = useRef<HTMLDivElement>(null);
  const onNotes = location.pathname === "/notes";

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
  if (PAGES_WITH_OWN_GEAR.includes(location.pathname)) return null;

  function handleSignOut() {
    setOpen(false);
    signOut(auth).catch(console.error);
  }

  return (
    <div
      ref={ref}
      style={{
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
              to="/settings"
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
                to="/admin"
                onClick={() => setOpen(false)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  width: "100%", textAlign: "left", padding: "10px 16px",
                  background: "transparent", border: "none", textDecoration: "none",
                  color: JADE, fontSize: 13, fontWeight: 600,
                  cursor: "pointer", fontFamily: "'Montserrat', sans-serif",
                }}
                onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.background = `${JADE}12`}
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
