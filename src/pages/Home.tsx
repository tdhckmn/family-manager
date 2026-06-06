import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { WisdomCard, quoteOfDay } from "../components/Wisdom";
import { Icon } from "../components/Icon";
import StarField from "../components/StarField";
import { useAuth } from "../auth";
import { FOOD_PLANNER_EMAIL } from "../components/AuthGate";

const BG = "#06091a";
const SURFACE = "rgba(255,255,255,0.04)";
const BORDER = "rgba(255,255,255,0.07)";
const TEXT = "#dedad0";
const TEXT_DIM = "#7a7890";

export default function Home() {
  const quote = useMemo(() => quoteOfDay(), []);
  const user = useAuth();
  const hasFoodPlanner = user.email?.toLowerCase() === FOOD_PLANNER_EMAIL;

  return (
    <div style={{ background: BG, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", position: "relative", overflow: "hidden", fontFamily: "'Montserrat', sans-serif" }}>

      <StarField />

      {/* Content */}
      <div style={{ position: "relative", zIndex: 1, maxWidth: 620, width: "100%", textAlign: "center" }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: "clamp(32px, 7vw, 52px)", fontWeight: 800, color: TEXT, letterSpacing: -0.5, margin: 0, lineHeight: 1.1 }}>
            Equanimity
          </h1>
          <p style={{ fontSize: 15, color: TEXT_DIM, marginTop: 12, marginBottom: 0, fontWeight: 500 }}>
            Finances &amp; focus for a steady mind.
          </p>
        </div>

        {/* Daily wisdom */}
        <div style={{ marginBottom: 28, textAlign: "left" }}>
          <WisdomCard quote={quote} compact />
        </div>

        {/* Nav grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <NavCard to="/finance"    icon={<Icon name="wallet" size={28} />} label="Finances"      desc="50/30/20 budget · Account plan · Income tracker" accent="#5db88a" delay={0} />
          <NavCard to="/todos"      icon={<Icon name="check" size={28} />}  label="Todos"         desc="Task tracker · Markdown notes" accent="#5b8fd4" delay={60} />
          {hasFoodPlanner && (
            <NavCard to="/food" icon={<Icon name="book" size={28} />} label="Meal Planner" desc="Weekly meals · Recipes · Shopping list" accent="#e07a35" delay={120} />
          )}
        </div>
      </div>
    </div>
  );
}

function NavCard({ to, icon, label, desc, accent, delay }: {
  to: string;
  icon: ReactNode;
  label: string;
  desc: string;
  accent: string;
  delay: number;
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
          borderRadius: 20,
          padding: "26px 22px",
          textAlign: "left",
          cursor: "pointer",
          transition: "all 0.2s ease",
          boxShadow: hovered ? `0 8px 32px ${accent}15` : "none",
          transform: hovered ? "translateY(-3px)" : "none",
          display: "flex",
          alignItems: "center",
          gap: 18,
          animationDelay: `${delay}ms`,
        }}
      >
        <div style={{ flexShrink: 0, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: 12, background: hovered ? `${accent}1a` : "rgba(255,255,255,0.04)", border: `1px solid ${hovered ? accent + "44" : BORDER}`, color: hovered ? accent : TEXT_DIM, transition: "all 0.2s" }}>
          {icon}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: hovered ? accent : TEXT, transition: "color 0.2s", marginBottom: 5 }}>
            {label}
          </div>
          <div style={{ fontSize: 12, color: TEXT_DIM, lineHeight: 1.5 }}>
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
