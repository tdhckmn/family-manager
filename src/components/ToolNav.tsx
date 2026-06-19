import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Icon } from "./Icon";

const TEXT = "var(--text)";
const TEXT_DIM = "var(--text-dim)";
const BORDER = "var(--border)";
const BLUE = "#5b8fd4";
const LAV  = "#a78bfa";

export type ToolKey = "calendar" | "finance" | "notes" | "chores" | "food" | "maintenance" | "focus" | "wisdom";

const YELLOW = "#e8c84a";
const ORANGE = "#e07a3c";
const PINK   = "#e070a8";
const TEAL   = "#46b6ad";
const GOLD   = "#d4a45b";

const TOOLS: { key: ToolKey; to: string; label: string; accent: string; icon: string }[] = [
  { key: "calendar",    to: "/app/calendar",    label: "Today",    accent: YELLOW,   icon: "calendar" },
  { key: "finance",     to: "/app/finance",     label: "Finances", accent: "#5db88a", icon: "wallet" },
  { key: "notes",       to: "/app/notes",       label: "Notes",    accent: BLUE,     icon: "check"  },
  { key: "chores",      to: "/app/chores",      label: "Chores",   accent: PINK,     icon: "sparkles" },
  { key: "food",        to: "/app/food",        label: "Meals",    accent: LAV,      icon: "utensils" },
  { key: "maintenance", to: "/app/maintenance", label: "Home",     accent: ORANGE,   icon: "wrench" },
  { key: "focus",       to: "/app/focus",       label: "Focus",    accent: TEAL,     icon: "moon" },
  { key: "wisdom",      to: "/app/wisdom",      label: "Wisdom",   accent: GOLD,     icon: "star" },
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
  const popRef = useRef<HTMLDivElement>(null);

  const tools = TOOLS;
  const cur = tools.find(t => t.key === current) ?? tools[0];

  useEffect(() => {
    if (!sheetOpen || isMobile) return;
    function handler(e: MouseEvent) {
      if (popRef.current && !popRef.current.contains(e.target as Node)) setSheetOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [sheetOpen, isMobile]);

  if (isMobile) {
    return (
      <>
        <button onClick={() => setSheetOpen(true)}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "none", cursor: "pointer", padding: 0, fontFamily: "'Montserrat',sans-serif" }}>
          <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", color: cur.accent }}>{cur.label}</span>
          <Icon name="chevronDown" size={15} color={cur.accent} />
        </button>

        {sheetOpen && createPortal(
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
                    {active && <span style={{ width: 5, height: 5, borderRadius: "50%", background: t.accent, display: "inline-block", flexShrink: 0 }} />}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body
        )}
      </>
    );
  }

  return (
    <div ref={popRef} style={{ position: "relative" }}>
      <button
        onClick={() => setSheetOpen(open => !open)}
        style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "none", cursor: "pointer", padding: 0, fontFamily: "'Montserrat',sans-serif" }}>
        <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", color: cur.accent }}>{cur.label}</span>
        <span style={{ display: "flex", transform: sheetOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
          <Icon name="chevronDown" size={15} color={cur.accent} />
        </span>
      </button>

      {sheetOpen && (
        <div style={{
          position: "absolute", top: "calc(100% + 10px)", left: 0, zIndex: 1100,
          background: "var(--panel)", border: `1px solid ${BORDER}`,
          borderRadius: 14, padding: 8,
          boxShadow: "0 8px 32px rgba(0,0,0,0.45)",
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6,
          minWidth: 340,
        }}>
          {tools.map(t => {
            const active = t.key === current;
            return (
              <button key={t.key}
                onClick={() => { setSheetOpen(false); if (!active) navigate(t.to); }}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  gap: 6, padding: "12px 8px", borderRadius: 10, cursor: "pointer",
                  background: active ? `${t.accent}14` : "transparent",
                  border: `1px solid ${active ? t.accent + "44" : "transparent"}`,
                  fontFamily: "'Montserrat',sans-serif",
                  transition: "background 0.12s",
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = "var(--surface-hi)"; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}>
                <Icon name={t.icon as import("./Icon").IconName} size={20} color={active ? t.accent : TEXT_DIM} />
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: active ? t.accent : TEXT }}>
                  {t.label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
