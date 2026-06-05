import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";

const BG_PANEL  = "rgba(10,13,30,0.96)";
const BORDER    = "rgba(255,255,255,0.10)";
const TEXT      = "#dedad0";
const TEXT_DIM  = "#7a7890";
const DANGER    = "#c0566a";
const SURFACE_HI = "rgba(255,255,255,0.06)";

// Pages that render their own integrated gear — suppress the global one there
const PAGES_WITH_OWN_GEAR = ["/finance"];

export default function GlobalHeader() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
        fontFamily: "'Nunito', sans-serif",
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
        ⚙
      </button>

      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 8px)",
          right: 0,
          minWidth: 170,
          background: BG_PANEL,
          border: `1px solid ${BORDER}`,
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          backdropFilter: "blur(16px)",
        }}>
          <div style={{ padding: "6px 0" }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: TEXT_DIM, padding: "4px 16px 8px", opacity: 0.6 }}>
              Settings
            </div>

            <Link
              to="/accounts"
              onClick={() => setOpen(false)}
              style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", color: TEXT, fontSize: 13, fontWeight: 600 }}
              onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.background = SURFACE_HI}
              onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.background = "transparent"}
            >
              <span style={{ fontSize: 15 }}>🏦</span> Accounts
            </Link>

            <div style={{ height: 1, background: BORDER, margin: "4px 0" }} />

            <button
              onClick={handleSignOut}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                width: "100%", textAlign: "left", padding: "10px 16px",
                background: "transparent", border: "none",
                color: DANGER, fontSize: 13, fontWeight: 600,
                cursor: "pointer", fontFamily: "'Nunito', sans-serif",
              }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = `${DANGER}12`}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = "transparent"}
            >
              <span style={{ fontSize: 15 }}>→</span> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
