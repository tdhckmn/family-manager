import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

const BG = "#06091a";
const SURFACE = "rgba(255,255,255,0.04)";
const BORDER = "rgba(255,255,255,0.07)";
const TEXT = "#dedad0";
const TEXT_DIM = "#7a7890";

export default function Home() {
  const particles = useMemo(() =>
    Array.from({ length: 45 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: 1 + Math.random() * 2,
      delay: Math.random() * 8,
      duration: 4 + Math.random() * 6,
      op: 0.12 + Math.random() * 0.28,
    })), []);

  return (
    <div style={{ background: BG, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", position: "relative", overflow: "hidden", fontFamily: "'Nunito', sans-serif" }}>

      {/* Ambient gradients */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        background: "radial-gradient(ellipse 55% 35% at 10% 0%, rgba(40,90,70,0.22) 0%, transparent 60%), radial-gradient(ellipse 40% 30% at 90% 100%, rgba(20,40,80,0.25) 0%, transparent 60%)" }} />

      {/* Particles */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
        {particles.map(p => (
          <div key={p.id} style={{ position: "absolute", borderRadius: "50%", background: "rgba(93,184,138,0.55)", width: p.size, height: p.size, left: `${p.left}%`, top: `${p.top}%`, animation: `twinkle ${p.duration}s ${p.delay}s infinite`, ["--op" as string]: p.op }} />
        ))}
      </div>

      {/* Content */}
      <div style={{ position: "relative", zIndex: 1, maxWidth: 700, width: "100%", textAlign: "center" }}>

        {/* Header */}
        <div style={{ marginBottom: 52 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ width: 28, height: 2, background: "linear-gradient(90deg, transparent, rgba(93,184,138,0.5))", borderRadius: 2 }} />
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", color: "#5db88a", opacity: 0.8 }}>Family Hub</span>
            <div style={{ width: 28, height: 2, background: "linear-gradient(90deg, rgba(93,184,138,0.5), transparent)", borderRadius: 2 }} />
          </div>
          <h1 style={{ fontSize: "clamp(32px, 7vw, 52px)", fontWeight: 800, color: TEXT, letterSpacing: -0.5, margin: 0, lineHeight: 1.1 }}>
            Hickman Family
          </h1>
        </div>

        {/* Nav grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <NavCard to="/food"       icon="🍽️" label="Meal Planner"  desc="Weekly menu · Grocery list · AI recipes" accent="#c8787a" delay={0} />
          <NavCard to="/todos"      icon="✅" label="My Todos"      desc="Task tracker · Markdown notes · Daily wisdom" accent="#5db88a" delay={60} />
          <NavCard to="/finance"    icon="💰" label="Finances"      desc="50/30/20 budget · Account plan · Income tracker" accent="#d4a45b" delay={90} />
          <NavCard to="/kids/pete"  icon="⭐" label="Pete"          desc="Quest for Wonder · Behavior tracker · Allowance" accent="#5bd3f5" delay={120} />
          <NavCard to="/kids/arbor" icon="👑" label="Arbor"         desc="Royal Savings · Behavior tracker · Treasure jar" accent="#e8c14a" delay={180} />
        </div>
      </div>
    </div>
  );
}

function NavCard({ to, icon, label, desc, accent, delay }: {
  to: string;
  icon: string;
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
        <div style={{ fontSize: 36, flexShrink: 0, lineHeight: 1, filter: hovered ? "none" : "saturate(0.7)", transition: "filter 0.2s" }}>
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
