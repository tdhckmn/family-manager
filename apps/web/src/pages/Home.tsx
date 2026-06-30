import { useState, useEffect, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { WisdomCard, useDailyQuote, AppIcon } from "../components/Wisdom";
import { Icon } from "../components/Icon";
import StarField from "../components/StarField";
import { usePrefs } from "../prefs";

const BG = "var(--bg)";
const SURFACE = "var(--surface)";
const BORDER = "var(--border)";
const TEXT = "var(--text)";
const TEXT_DIM = "var(--text-dim)";

function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < breakpoint);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [breakpoint]);
  return isMobile;
}

export default function Home() {
  const { prefs } = usePrefs();
  const isMobile = useIsMobile();
  const quote = useDailyQuote();
  const accent = prefs.accentColor;
  const showWisdom = prefs.wisdomPages.includes("home");

  return (
    <div style={{ background: BG, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", position: "relative", overflow: "hidden", fontFamily: "'Montserrat', sans-serif" }}>

      <StarField />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 620, width: "100%" }}>

        {/* Header */}
        <div style={{ marginBottom: 32, textAlign: "center" }}>
          <div style={{
            marginBottom: 12,
            display: "flex",
            justifyContent: "center",
            filter: `drop-shadow(0 0 22px ${accent}38)`,
            userSelect: "none",
          }}>
            <AppIcon size={isMobile ? 52 : 62} color={accent} traditions={prefs.wisdomTraditions} appIcon={prefs.appIcon} />
          </div>
          <h1 style={{ fontSize: "clamp(28px, 7vw, 52px)", fontWeight: 800, color: TEXT, letterSpacing: -0.5, margin: 0, lineHeight: 1.1 }}>
            Equanimity
          </h1>
          <p style={{ fontSize: 15, color: TEXT_DIM, marginTop: 12, marginBottom: 0, fontWeight: 500 }}>
            Household management &amp; focus for a steady mind.
          </p>
        </div>

        {/* Daily wisdom */}
        {showWisdom && (
          <div style={{ marginBottom: 28 }}>
            <WisdomCard quote={quote} compact />
          </div>
        )}

        {/* Nav grid */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
          <NavCard to="/app/calendar"   icon={<Icon name="calendar" size={24} />} label="Today"        desc="Your day · Chores · Meals · Due"        accent="#e8c84a" isMobile={isMobile} />
          <NavCard to="/app/finance"    icon={<Icon name="wallet"   size={24} />} label="Finances"     desc="Budget · Account plan · Income"         accent="#5db88a" isMobile={isMobile} />
          <NavCard to="/app/notes"      icon={<Icon name="check"    size={24} />} label="Notes"        desc="Markdown notes · Tasks · Journaling"    accent="#5b8fd4" isMobile={isMobile} />
          <NavCard to="/app/chores"     icon={<Icon name="sparkles" size={24} />} label="Chores"       desc="Weekly board · Assignments · Tracking"  accent="#e070a8" isMobile={isMobile} />
          <NavCard to="/app/food"       icon={<Icon name="utensils" size={24} />} label="Meal Planner" desc="Weekly meals · Recipes · Shopping"       accent="#a78bfa" isMobile={isMobile} />
          <NavCard to="/app/maintenance" icon={<Icon name="wrench"  size={24} />} label="Home Care"    desc="Maintenance · Overdue · Reminders"        accent="#e07a3c" isMobile={isMobile} />
          <NavCard to="/app/focus"      icon={<Icon name="moon"    size={24} />} label="Focus"         desc="Breathing exercises · Focus noise"         accent="#46b6ad" isMobile={isMobile} />
          <NavCard to="/app/wisdom"     icon={<Icon name="star"    size={24} />} label="Wisdom"        desc="Quote library · Traditions · Daily wisdom"  accent="#d4a45b" isMobile={isMobile} />
        </div>
      </div>
    </div>
  );
}

function NavCard({ to, icon, label, desc, accent, isMobile }: {
  to: string; icon: ReactNode; label: string; desc: string; accent: string; isMobile: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link to={to} style={{ textDecoration: "none" }}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: hovered ? "var(--surface-hi)" : SURFACE,
          border: `1px solid ${hovered ? accent + "55" : BORDER}`,
          borderRadius: 18,
          padding: isMobile ? "18px 20px" : "22px 20px",
          cursor: "pointer",
          transition: "all 0.2s ease",
          boxShadow: hovered ? `0 8px 32px ${accent}15` : "none",
          transform: hovered ? "translateY(-2px)" : "none",
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <div style={{
          flexShrink: 0, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center",
          width: 40, height: 40, borderRadius: 11,
          background: hovered ? `${accent}1a` : "var(--surface)",
          border: `1px solid ${hovered ? accent + "44" : BORDER}`,
          color: hovered ? accent : TEXT_DIM, transition: "all 0.2s",
        }}>
          {icon}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: hovered ? accent : TEXT, transition: "color 0.2s", marginBottom: 3 }}>
            {label}
          </div>
          <div style={{ fontSize: 12, color: TEXT_DIM, lineHeight: 1.4, whiteSpace: isMobile ? "nowrap" : "normal", overflow: "hidden", textOverflow: "ellipsis" }}>
            {desc.split(" · ").map((item, i, arr) => (
              <span key={i}>{item}{i < arr.length - 1 && <span style={{ opacity: 0.4 }}> · </span>}</span>
            ))}
          </div>
        </div>
        <Icon name="chevronRight" size={14} style={{ marginLeft: "auto", opacity: hovered ? 0.7 : 0.2, transition: "opacity 0.2s", flexShrink: 0 }} />
      </div>
    </Link>
  );
}
