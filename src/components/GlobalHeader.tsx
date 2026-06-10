import { useState, useRef, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { signOut, onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../firebase";
import { Icon } from "./Icon";
import MarkdownHelp from "./MarkdownHelp";

const BG_PANEL  = "rgba(10,13,30,0.96)";
const BORDER    = "rgba(255,255,255,0.10)";
const TEXT      = "#dedad0";
const TEXT_DIM  = "#7a7890";
const DANGER    = "#c0566a";
const JADE      = "#5db88a";

// Pages that render their own integrated gear — suppress the global one there
const PAGES_WITH_OWN_GEAR = ["/finance"];

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
  const onTodos = location.pathname === "/todos";

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
          background: open ? "rgba(255,255,255,0.08)" : "rgba(10,13,30,0.8)",
          border: `1px solid ${open ? "rgba(255,255,255,0.18)" : BORDER}`,
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
            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.18)";
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

            {onTodos && (
              <button
                onClick={() => { setOpen(false); setMdOpen(true); }}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  width: "100%", textAlign: "left", padding: "10px 16px",
                  background: "transparent", border: "none",
                  color: TEXT, fontSize: 13, fontWeight: 600,
                  cursor: "pointer", fontFamily: "'Montserrat', sans-serif",
                }}
                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)"}
                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = "transparent"}
              >
                <Icon name="book" size={15} /> Markdown guide
              </button>
            )}

            <Link
              to="/settings/household"
              onClick={() => setOpen(false)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                width: "100%", textAlign: "left", padding: "10px 16px",
                background: "transparent", color: TEXT, fontSize: 13, fontWeight: 600,
                textDecoration: "none", fontFamily: "'Montserrat', sans-serif",
              }}
              onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.06)"}
              onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.background = "transparent"}
            >
              <Icon name="gear" size={15} /> Household
            </Link>

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
