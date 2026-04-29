import { useMemo } from "react";
import { Link } from "react-router-dom";

export default function KidsHome() {
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
    <div style={{ background: "#0d0a1f", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 16px", overflowX: "hidden", position: "relative" }}>
      <div style={{ position: "fixed", inset: 0, background: "radial-gradient(ellipse 60% 40% at 20% 10%, rgba(139,52,196,0.18) 0%, transparent 60%), radial-gradient(ellipse 50% 30% at 80% 80%, rgba(232,84,122,0.15) 0%, transparent 60%)", pointerEvents: "none", zIndex: 0 }} />

      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
        {stars.map(s => (
          <div key={s.id} style={{ position: "absolute", width: 3, height: 3, borderRadius: "50%", background: "white", left: `${s.left}%`, top: `${s.top}%`, animation: `twinkle ${s.d}s ${s.delay}s infinite`, ["--op" as string]: s.op }} />
        ))}
      </div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 520, width: "100%", textAlign: "center" }}>
        <Link to="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", color: "#9b90c2", fontSize: 13, fontWeight: 700, marginBottom: 28, opacity: 0.7 }}>← Home</Link>

        <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: "clamp(32px, 9vw, 56px)", background: "linear-gradient(135deg, #f5c400 0%, #f57c20 40%, #e9529e 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", lineHeight: 1.1, letterSpacing: 1, marginBottom: 8 }}>
          Hickman Kids
        </div>
        <div style={{ fontSize: 13, color: "#9b90c2", fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 40 }}>
          Choose your tracker
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* Pete */}
          <Link to="/kids/pete" style={{ textDecoration: "none" }}>
            <div style={{ background: "#1e1640", border: "2px solid rgba(91,211,245,0.4)", borderRadius: 24, padding: "32px 20px", cursor: "pointer", transition: "all 0.2s cubic-bezier(0.34,1.56,0.64,1)" }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-6px)"; (e.currentTarget as HTMLDivElement).style.borderColor = "#5bd3f5"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 32px rgba(91,211,245,0.2)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ""; (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(91,211,245,0.4)"; (e.currentTarget as HTMLDivElement).style.boxShadow = ""; }}
            >
              <div style={{ fontSize: 52, display: "block", marginBottom: 12, animation: "bob 3s ease-in-out infinite" }}>⭐</div>
              <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: 28, color: "#5bd3f5", marginBottom: 6 }}>Pete</div>
              <div style={{ fontSize: 12, color: "#9b90c2", fontWeight: 600, lineHeight: 1.4 }}>Quest for Wonder<br/>Mario allowance tracker</div>
              <div style={{ display: "inline-block", marginTop: 16, fontSize: 18, opacity: 0.4 }}>→</div>
            </div>
          </Link>

          {/* Arbor */}
          <Link to="/kids/arbor" style={{ textDecoration: "none" }}>
            <div style={{ background: "#1e1640", border: "2px solid rgba(232,84,122,0.4)", borderRadius: 24, padding: "32px 20px", cursor: "pointer", transition: "all 0.2s cubic-bezier(0.34,1.56,0.64,1)" }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-6px)"; (e.currentTarget as HTMLDivElement).style.borderColor = "#e8547a"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 32px rgba(232,84,122,0.2)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ""; (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(232,84,122,0.4)"; (e.currentTarget as HTMLDivElement).style.boxShadow = ""; }}
            >
              <div style={{ fontSize: 52, display: "block", marginBottom: 12, animation: "bob 3s ease-in-out 1.5s infinite" }}>👑</div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, color: "#e8c14a", marginBottom: 6 }}>Arbor</div>
              <div style={{ fontSize: 12, color: "#9b90c2", fontWeight: 600, lineHeight: 1.4 }}>Royal Savings Jar<br/>Princess treasure tracker</div>
              <div style={{ display: "inline-block", marginTop: 16, fontSize: 18, opacity: 0.4 }}>→</div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
