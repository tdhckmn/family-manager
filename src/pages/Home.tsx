import { useMemo, useState, useEffect, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { WisdomCard, quoteOfDay } from "../components/Wisdom";
import { Icon } from "../components/Icon";
import StarField from "../components/StarField";

const BG = "#06091a";
const SURFACE = "rgba(255,255,255,0.04)";
const BORDER = "rgba(255,255,255,0.07)";
const TEXT = "#dedad0";
const TEXT_DIM = "#7a7890";

function YinYang({ size }: { size: number }) {
  const YANG = "#5db88a";
  const YIN  = "#1a5c3e";
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ display: "block", opacity: 0.72 }}>
      <circle cx="50" cy="50" r="45" fill={YIN} />
      <path d="M50,5 A45,45,0,0,1,50,95 Z" fill={YANG} />
      <circle cx="50" cy="27.5" r="22.5" fill={YANG} />
      <circle cx="50" cy="72.5" r="22.5" fill={YIN} />
      <circle cx="50" cy="27.5" r="7.5" fill={YIN} />
      <circle cx="50" cy="72.5" r="7.5" fill={YANG} />
      <circle cx="50" cy="50" r="45" fill="none" stroke={YANG} strokeWidth="1.5" />
    </svg>
  );
}

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
  const quote = useMemo(() => quoteOfDay(), []);
  const isMobile = useIsMobile();

  return (
    <div style={{ background: BG, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", position: "relative", overflow: "hidden", fontFamily: "'Montserrat', sans-serif" }}>

      <StarField />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 620, width: "100%" }}>

        {/* Header */}
        <div style={{ marginBottom: 32, textAlign: "center" }}>
          {/* Yin yang */}
          <div style={{
            marginBottom: 12,
            display: "flex",
            justifyContent: "center",
            filter: "drop-shadow(0 0 20px rgba(93,184,138,0.22))",
            userSelect: "none",
          }}>
            <YinYang size={isMobile ? 52 : 62} />
          </div>
          <h1 style={{ fontSize: "clamp(28px, 7vw, 52px)", fontWeight: 800, color: TEXT, letterSpacing: -0.5, margin: 0, lineHeight: 1.1 }}>
            Equanimity
          </h1>
          <p style={{ fontSize: 15, color: TEXT_DIM, marginTop: 12, marginBottom: 0, fontWeight: 500 }}>
            Finances &amp; focus for a steady mind.
          </p>
        </div>

        {/* Daily wisdom */}
        <div style={{ marginBottom: 28 }}>
          <WisdomCard quote={quote} compact />
        </div>

        {/* Nav grid */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
          <NavCard to="/finance"    icon={<Icon name="wallet" size={24} />} label="Finances"     desc="Budget · Account plan · Income" accent="#5db88a" isMobile={isMobile} />
          <NavCard to="/todos"      icon={<Icon name="check"  size={24} />} label="Notes"        desc="Markdown notes · Tasks · Journaling"         accent="#5b8fd4" isMobile={isMobile} />
          <NavCard to="/food" icon={<Icon name="book" size={24} />} label="Meal Planner" desc="Weekly meals · Recipes · Shopping" accent="#a78bfa" isMobile={isMobile} />
        </div>
      </div>
    </div>
  );
}

function NavCard({ to, icon, label, desc, accent, isMobile }: {
  to: string;
  icon: ReactNode;
  label: string;
  desc: string;
  accent: string;
  isMobile: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link to={to} style={{ textDecoration: "none" }}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: hovered ? "rgba(255,255,255,0.06)" : SURFACE,
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
          background: hovered ? `${accent}1a` : "rgba(255,255,255,0.04)",
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
        <div style={{ marginLeft: "auto", fontSize: 14, color: TEXT_DIM, opacity: hovered ? 0.7 : 0.2, transition: "opacity 0.2s", flexShrink: 0 }}>→</div>
      </div>
    </Link>
  );
}
