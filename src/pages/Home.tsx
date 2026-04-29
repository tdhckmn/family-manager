import { useMemo } from "react";
import { Link } from "react-router-dom";

export default function Home() {
  const stars = useMemo(() =>
    Array.from({ length: 70 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      d: 2 + Math.random() * 4,
      delay: Math.random() * 5,
      op: 0.3 + Math.random() * 0.7,
    })), []
  );

  return (
    <div style={{ background: "#0d0a1f", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 16px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "fixed", inset: 0, background: "radial-gradient(ellipse 60% 40% at 20% 10%, rgba(139,52,196,0.18) 0%, transparent 60%), radial-gradient(ellipse 50% 30% at 80% 80%, rgba(245,196,0,0.12) 0%, transparent 60%)", pointerEvents: "none", zIndex: 0 }} />

      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
        {stars.map(s => (
          <div key={s.id} style={{ position: "absolute", width: 3, height: 3, borderRadius: "50%", background: "white", left: `${s.left}%`, top: `${s.top}%`, animation: `twinkle ${s.d}s ${s.delay}s infinite`, ["--op" as string]: s.op }} />
        ))}
      </div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 640, width: "100%", textAlign: "center" }}>
        <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: "clamp(36px, 9vw, 60px)", background: "linear-gradient(135deg, #f5c400 0%, #f57c20 40%, #e9529e 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", lineHeight: 1.1, marginBottom: 8 }}>
          Hickman Family
        </div>
        <div style={{ fontSize: 13, color: "#9b90c2", fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 40 }}>
          The Family Hub
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>

          {/* Meal Planner */}
          <NavCard to="/food" borderColor="rgba(200,16,46,0.4)" hoverBorder="#C8102E" hoverShadow="rgba(200,16,46,0.25)">
            <div style={{ fontSize: 48, marginBottom: 12, animation: "bob 3s ease-in-out infinite" }}>🍽️</div>
            <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: 22, color: "#F5C400", marginBottom: 6 }}>Meal Planner</div>
            <div style={{ fontSize: 11, color: "#9b90c2", fontWeight: 600, lineHeight: 1.5 }}>Weekly menu<br/>Grocery list<br/>AI recipes</div>
          </NavCard>

          {/* Pete */}
          <NavCard to="/kids/pete" borderColor="rgba(91,211,245,0.4)" hoverBorder="#5bd3f5" hoverShadow="rgba(91,211,245,0.2)">
            <div style={{ fontSize: 48, marginBottom: 12, animation: "bob 3s ease-in-out 0.5s infinite" }}>⭐</div>
            <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: 22, color: "#5bd3f5", marginBottom: 6 }}>Pete</div>
            <div style={{ fontSize: 11, color: "#9b90c2", fontWeight: 600, lineHeight: 1.5 }}>Quest for Wonder<br/>Behavior tracker<br/>Allowance</div>
          </NavCard>

          {/* Arbor */}
          <NavCard to="/kids/arbor" borderColor="rgba(232,84,122,0.4)" hoverBorder="#e8547a" hoverShadow="rgba(232,84,122,0.2)">
            <div style={{ fontSize: 48, marginBottom: 12, animation: "bob 3s ease-in-out 1s infinite" }}>👑</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: "#e8c14a", marginBottom: 6 }}>Arbor</div>
            <div style={{ fontSize: 11, color: "#9b90c2", fontWeight: 600, lineHeight: 1.5 }}>Royal Savings<br/>Behavior tracker<br/>Treasure jar</div>
          </NavCard>

        </div>
      </div>
    </div>
  );
}

function NavCard({ to, borderColor, hoverBorder, hoverShadow, children }: {
  to: string;
  borderColor: string;
  hoverBorder: string;
  hoverShadow: string;
  children: React.ReactNode;
}) {
  return (
    <Link to={to} style={{ textDecoration: "none" }}>
      <div
        style={{ background: "#1e1640", border: `2px solid ${borderColor}`, borderRadius: 24, padding: "28px 16px", cursor: "pointer", transition: "all 0.2s cubic-bezier(0.34,1.56,0.64,1)", textAlign: "center" }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLDivElement;
          el.style.transform = "translateY(-6px)";
          el.style.borderColor = hoverBorder;
          el.style.boxShadow = `0 8px 32px ${hoverShadow}`;
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLDivElement;
          el.style.transform = "";
          el.style.borderColor = borderColor;
          el.style.boxShadow = "";
        }}
      >
        {children}
        <div style={{ marginTop: 16, fontSize: 16, opacity: 0.3 }}>→</div>
      </div>
    </Link>
  );
}
