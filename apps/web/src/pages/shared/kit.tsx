import { useState, useEffect, useRef, type ReactNode } from "react";
import { Link } from "react-router-dom";
import StarField from "../../components/StarField";
import ToolNav, { type ToolKey } from "../../components/ToolNav";
import GlobalHeader from "../../components/GlobalHeader";
import { WisdomCard, useDailyQuote } from "../../components/Wisdom";
import { Icon } from "../../components/Icon";
import { usePrefs } from "../../prefs";

// ── Date helpers re-exported from core ──────────────────────────────────────
export {
  DAY_NAMES, DAY_ABBR, MONTH_NAMES,
  toISODate, fromISODate, todayISO, daysUntil, relativeDay, prettyDate, weekKey, uid,
} from "@equanimity/core";

// ── Palette ─────────────────────────────────────────────────────────────────
export const BG = "var(--bg)";
export const SURFACE = "var(--surface)";
export const SURFACE_HI = "var(--surface-hi)";
export const BORDER = "var(--border)";
export const BORDER_HI = "var(--border-hi)";
export const TEXT = "var(--text)";
export const TEXT_DIM = "var(--text-dim)";
export const TEXT_MUTED = "var(--text-muted)";
export const JADE = "var(--accent)";
export const BLUE = "#5b8fd4";
export const LAV = "#a78bfa";
export const AMBER = "#d4a45b";
export const YELLOW = "#e8c84a";  // Today / calendar identity
export const ORANGE = "#e07a3c";  // Home Care / maintenance identity
export const PINK = "#e070a8";
export const TEAL = "#46b6ad";
export const DANGER = "#c0566a";
export const INK = "#08101f";  // fixed dark "ink" for text/icons on accent fills (both themes)

export const FONT = "'Montserrat', sans-serif";

// ── Responsive ────────────────────────────────────────────────────────────────
export function useIsMobile(maxWidth = 640): boolean {
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


/** Returns a Date that triggers a re-render each midnight, keeping day-sensitive components fresh. */
export function useCurrentDate(): Date {
  const [date, setDate] = useState(() => new Date());
  const idRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    function schedule() {
      const now = new Date();
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      idRef.current = setTimeout(() => {
        setDate(new Date());
      }, tomorrow.getTime() - now.getTime() + 100);
    }
    schedule();
    return () => { if (idRef.current !== null) clearTimeout(idRef.current); };
  }, [date]);
  return date;
}

// ── Buttons / inputs ────────────────────────────────────────────────────────
export function btn(bg: string, color?: string, border?: string): React.CSSProperties {
  const fg = color ?? (bg === "transparent" ? TEXT : "#06091a");
  return {
    background: bg, color: fg, border: border ? `1px solid ${border}` : "none",
    borderRadius: 8, cursor: "pointer", fontFamily: FONT, fontWeight: 700,
    padding: "7px 16px", fontSize: 13, display: "inline-flex", alignItems: "center",
    gap: 6, transition: "all 0.15s", lineHeight: 1.2,
  };
}

export const inputStyle: React.CSSProperties = {
  background: "var(--input-bg)", border: `1px solid ${BORDER}`, borderRadius: 8,
  padding: "9px 12px", fontSize: 14, color: TEXT, fontFamily: FONT,
  width: "100%", boxSizing: "border-box", outline: "none",
};

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: TEXT_DIM, letterSpacing: 1, textTransform: "uppercase" }}>{label}</span>
      {children}
    </label>
  );
}

export function Pill({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", color, background: `${color}18`, border: `1px solid ${color}30`, borderRadius: 20, padding: "2px 8px", whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

// ── Page shell (header bar + starfield + centered content) ────────────────────
export function PageShell({ tool, maxWidth = 900, children, headerExtra }: {
  tool: ToolKey;
  maxWidth?: number;
  children: ReactNode;
  headerExtra?: ReactNode;
}) {
  const { prefs } = usePrefs();
  const showWisdom = prefs.wisdomPages.includes(tool);
  const dailyQuote = useDailyQuote();

  return (
    <div style={{ background: BG, minHeight: "100vh", fontFamily: FONT, color: TEXT, position: "relative" }}>
      <StarField />
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{
          position: "sticky", top: 0, zIndex: 100,
          background: "var(--panel)", backdropFilter: "blur(14px)",
          borderBottom: `1px solid ${BORDER}`,
          display: "flex", alignItems: "center", gap: 12, rowGap: 10, flexWrap: "wrap",
          padding: "14px 20px", minHeight: 60, boxSizing: "border-box",
        }}>
          <Link to="/app" style={{ textDecoration: "none", color: TEXT_DIM, fontSize: 13, fontWeight: 600, opacity: 0.7, flexShrink: 0, transition: "opacity 0.15s", display: "flex", alignItems: "center", gap: 4 }}
            onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.opacity = "1"}
            onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.opacity = "0.7"}>
            <Icon name="chevronLeft" size={13} /> Home
          </Link>
          <div style={{ width: 1, height: 14, background: "var(--border)", flexShrink: 0 }} />
          <div style={{ minWidth: 0, flex: "1 1 auto" }}><ToolNav current={tool} /></div>
          {headerExtra && <div style={{ flexShrink: 0 }}>{headerExtra}</div>}
          <div style={{ flexShrink: 0, marginLeft: "auto" }}><GlobalHeader inline /></div>
        </div>
        <div style={{ maxWidth, margin: "0 auto", width: "100%", padding: "24px 20px 80px", boxSizing: "border-box" }}>
          {showWisdom && (
            <div style={{ marginBottom: 20 }}>
              <WisdomCard quote={dailyQuote} compact />
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}

/** Section card with a titled header — matches the Finance `Card` look. */
export function Panel({ title, icon, accent = JADE, action, children }: {
  title: string; icon?: ReactNode; accent?: string; action?: ReactNode; children: ReactNode;
}) {
  return (
    <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          {icon && <span style={{ display: "flex", alignItems: "center", color: accent, flexShrink: 0 }}>{icon}</span>}
          <span style={{ fontSize: 13, fontWeight: 800, color: TEXT, letterSpacing: -0.2 }}>{title}</span>
        </div>
        {action}
      </div>
      <div style={{ padding: "16px 18px" }}>{children}</div>
    </div>
  );
}

export function EmptyHint({ children }: { children: ReactNode }) {
  return <div style={{ color: TEXT_MUTED, fontSize: 13, fontStyle: "italic", padding: "8px 2px" }}>{children}</div>;
}
