import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Icon } from "./Icon";

const TEXT = "var(--text)";
const TEXT_DIM = "var(--text-dim)";
const BORDER = "var(--border)";
const JADE = "#5db88a";
const BLUE = "#5b8fd4";
const LAV  = "#a78bfa";

export type ToolKey = "calendar" | "finance" | "notes" | "chores" | "food" | "maintenance";

const YELLOW = "#e8c84a";
const ORANGE = "#e07a3c";
const PINK   = "#e070a8";

const TOOLS: { key: ToolKey; to: string; label: string; accent: string; icon: string }[] = [
  { key: "calendar",    to: "/calendar",    label: "Today",    accent: YELLOW, icon: "calendar" },
  { key: "finance",     to: "/finance",     label: "Finances", accent: JADE,   icon: "wallet" },
  { key: "notes",       to: "/notes",       label: "Notes",    accent: BLUE,   icon: "check"  },
  { key: "chores",      to: "/chores",      label: "Chores",   accent: PINK,   icon: "sparkles" },
  { key: "food",        to: "/food",        label: "Meals",    accent: LAV,    icon: "book" },
  { key: "maintenance", to: "/maintenance", label: "Home",     accent: ORANGE, icon: "wrench" },
];

function useIsMobile(maxWidth = 640): boolean {
  const query = `(max-width: ${maxWidth}px)`;
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false,
  );
  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = () => setIsMobile(mql.matches);
    handler();
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);
  return isMobile;
}

export default function ToolNav({ current }: { current: ToolKey }) {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [sheetOpen, setSheetOpen] = useState(false);

  const tools = TOOLS;
  const cur = tools.find(t => t.key === current) ?? tools[0];

  if (isMobile) {
    return (
      <>
        <button onClick={() => setSheetOpen(true)}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "none", cursor: "pointer", padding: 0, fontFamily: "'Montserrat',sans-serif" }}>
          <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", color: cur.accent }}>{cur.label}</span>
          <Icon name="chevronDown" size={15} color={cur.accent} />
        </button>

        {sheetOpen && (
          <div onClick={() => setSheetOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(3,5,15,0.72)", backdropFilter: "blur(4px)", display: "flex", alignItems: "flex-end" }}>
            <div onClick={e => e.stopPropagation()}
              style={{ width: "100%", background: "var(--panel)", borderTop: `1px solid ${BORDER}`, borderRadius: "20px 20px 0 0", padding: "10px 0 calc(10px + env(safe-area-inset-bottom))", boxShadow: "0 -12px 48px rgba(0,0,0,0.6)" }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--border-hi)", margin: "6px auto 10px" }} />
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: TEXT_DIM, padding: "4px 20px 8px", opacity: 0.6 }}>
                Switch tool
              </div>
              {tools.map(t => {
                const active = t.key === current;
                return (
                  <button key={t.key}
                    onClick={() => { setSheetOpen(false); if (!active) navigate(t.to); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left",
                      padding: "14px 20px", background: active ? `${t.accent}14` : "transparent", border: "none",
                      cursor: "pointer", fontFamily: "'Montserrat',sans-serif",
                    }}>
                    <Icon name={t.icon as import("./Icon").IconName} size={20} color={active ? t.accent : TEXT_DIM} />
                    <span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: active ? t.accent : TEXT }}>{t.label}</span>
                    {active && <span style={{ fontSize: 12, fontWeight: 700, color: t.accent }}>●</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", rowGap: 6 }}>
      {tools.map(t => {
        const active = t.key === current;
        return (
          <Link key={t.key} to={t.to}
            style={{
              textDecoration: "none", fontSize: 14, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase",
              color: active ? t.accent : TEXT_DIM, opacity: active ? 1 : 0.55, transition: "opacity 0.15s, color 0.15s",
            }}
            onMouseEnter={e => { if (!active) (e.currentTarget as HTMLAnchorElement).style.opacity = "0.9"; }}
            onMouseLeave={e => { if (!active) (e.currentTarget as HTMLAnchorElement).style.opacity = "0.55"; }}>
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
