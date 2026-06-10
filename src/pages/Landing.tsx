import { useState } from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import StarField from "../components/StarField";

const BG = "#06091a";
const TEXT = "#dedad0";
const TEXT_DIM = "#7a7890";
const JADE = "#5db88a";
const SURFACE = "rgba(255,255,255,0.04)";
const SURFACE_HOVER = "rgba(255,255,255,0.07)";
const BORDER = "rgba(255,255,255,0.08)";
const PURPLE = "#a78bfa";
const ORANGE = "#e07a35";
const BLUE = "#5b8fd4";
const PINK = "#d47b8f";
const TEAL = "#4db6ac";

const FEATURES = [
  { icon: "💰", label: "Budget Planning", desc: "50/30/20 rule · Sinking funds · Monthly goals", color: JADE },
  { icon: "🍽️", label: "Meal Planner", desc: "Weekly meals · Recipe library · Grocery lists", color: ORANGE },
  { icon: "✅", label: "Todos", desc: "Shared task list · Markdown notes · Due dates", color: BLUE },
  { icon: "🔧", label: "Home Maintenance", desc: "Track upkeep · Overdue alerts · Never forget", color: PURPLE },
  { icon: "🧹", label: "Chore Board", desc: "Assign chores · Weekly schedule · Check off", color: PINK },
  { icon: "📅", label: "Family Calendar", desc: "Daily overview · Meals · Tasks · Chores unified", color: TEAL },
];

export default function Landing() {
  const [signingIn, setSigningIn] = useState(false);

  async function handleSignIn() {
    setSigningIn(true);
    try { await signInWithPopup(auth, googleProvider); }
    catch (err) { console.error("Sign-in failed:", err); setSigningIn(false); }
  }

  return (
    <div style={{ background: BG, minHeight: "100vh", fontFamily: "'Montserrat', sans-serif", color: TEXT, overflowX: "hidden" }}>
      <StarField />

      {/* Nav */}
      <nav style={{ position: "relative", zIndex: 10, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 32px", maxWidth: 1080, margin: "0 auto" }}>
        <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.3 }}>Equanimity</div>
        <button
          onClick={handleSignIn}
          disabled={signingIn}
          style={{ background: JADE, border: "none", borderRadius: 10, color: "#0a1a12", fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 13, padding: "9px 22px", cursor: "pointer", opacity: signingIn ? 0.7 : 1, transition: "opacity 0.15s" }}
        >
          {signingIn ? "Signing in…" : "Sign in"}
        </button>
      </nav>

      {/* Hero */}
      <section style={{ position: "relative", zIndex: 5, textAlign: "center", padding: "72px 24px 80px", maxWidth: 700, margin: "0 auto" }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 4, textTransform: "uppercase", color: JADE, opacity: 0.8, marginBottom: 16 }}>
          Stoic · Taoist · Household
        </div>
        <h1 style={{ fontSize: "clamp(38px, 8vw, 64px)", fontWeight: 800, margin: "0 0 20px", letterSpacing: -1, lineHeight: 1.05 }}>
          Run your household
          <br />
          <span style={{ color: JADE }}>with calm clarity.</span>
        </h1>
        <p style={{ fontSize: 18, color: TEXT_DIM, margin: "0 0 40px", lineHeight: 1.6, maxWidth: 520, marginLeft: "auto", marginRight: "auto" }}>
          Budget, meals, chores, and home maintenance — all in one private family workspace. No clutter, no ads, no noise.
        </p>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <button
            onClick={handleSignIn}
            disabled={signingIn}
            style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff", border: "none", borderRadius: 12, color: "#1f1f1f", fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 16, padding: "14px 32px", cursor: "pointer", boxShadow: "0 4px 20px rgba(0,0,0,0.4)", opacity: signingIn ? 0.7 : 1, transition: "opacity 0.15s" }}
          >
            <GoogleIcon />
            {signingIn ? "Signing in…" : "Start free trial"}
          </button>
          <div style={{ fontSize: 12, color: TEXT_DIM, opacity: 0.7 }}>14 days free · $4/month after · Cancel anytime</div>
        </div>
      </section>

      {/* Features */}
      <section style={{ position: "relative", zIndex: 5, maxWidth: 900, margin: "0 auto", padding: "0 24px 80px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", color: TEXT_DIM, marginBottom: 10 }}>Everything a household needs</div>
          <h2 style={{ fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>Six tools. One calm workspace.</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
          {FEATURES.map(f => <FeatureCard key={f.label} {...f} />)}
        </div>
      </section>

      {/* Pricing */}
      <section style={{ position: "relative", zIndex: 5, maxWidth: 520, margin: "0 auto 80px", padding: "0 24px" }}>
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 24, padding: "40px 40px 36px", textAlign: "center" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", color: JADE, opacity: 0.8, marginBottom: 12 }}>Simple pricing</div>
          <div style={{ fontSize: 48, fontWeight: 800, letterSpacing: -1, marginBottom: 4 }}>
            $4<span style={{ fontSize: 20, fontWeight: 600, color: TEXT_DIM }}>/month</span>
          </div>
          <div style={{ fontSize: 14, color: TEXT_DIM, marginBottom: 28 }}>or $36/year — save 25%</div>
          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 32px", textAlign: "left", display: "inline-block" }}>
            {[
              "Unlimited household members",
              "All 6 tools included",
              "Wall display / kiosk mode",
              "Partner invitation",
              "Private — your data stays yours",
            ].map(item => (
              <li key={item} style={{ fontSize: 14, color: TEXT_DIM, padding: "5px 0", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ color: JADE, fontSize: 16 }}>✓</span> {item}
              </li>
            ))}
          </ul>
          <button
            onClick={handleSignIn}
            disabled={signingIn}
            style={{ width: "100%", background: JADE, border: "none", borderRadius: 12, color: "#0a1a12", fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 15, padding: "14px", cursor: "pointer", opacity: signingIn ? 0.7 : 1, transition: "opacity 0.15s" }}
          >
            {signingIn ? "Signing in…" : "Start 14-day free trial"}
          </button>
          <div style={{ fontSize: 11, color: TEXT_DIM, marginTop: 12, opacity: 0.6 }}>No credit card required to start</div>
        </div>
      </section>

      {/* Kiosk callout */}
      <section style={{ position: "relative", zIndex: 5, maxWidth: 700, margin: "0 auto 80px", padding: "0 24px", textAlign: "center" }}>
        <div style={{ background: "rgba(93,184,138,0.06)", border: `1px solid ${JADE}33`, borderRadius: 20, padding: "32px 40px" }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>📺</div>
          <h3 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 10px" }}>Works as a wall display</h3>
          <p style={{ fontSize: 14, color: TEXT_DIM, margin: 0, lineHeight: 1.6 }}>
            Mount a tablet on your wall and open Equanimity's kiosk mode — a full-screen daily view of meals, chores, and reminders. Like Skylight, but without the $100 hardware or $10/month software fee.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ position: "relative", zIndex: 5, textAlign: "center", padding: "24px", borderTop: `1px solid ${BORDER}`, color: TEXT_DIM, fontSize: 12 }}>
        © 2026 Equanimity · Private household management · $4/month
      </footer>
    </div>
  );
}

function FeatureCard({ icon, label, desc, color }: { icon: string; label: string; desc: string; color: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ background: hovered ? SURFACE_HOVER : SURFACE, border: `1px solid ${hovered ? color + "44" : BORDER}`, borderRadius: 16, padding: "22px 24px", transition: "all 0.2s", cursor: "default" }}
    >
      <div style={{ fontSize: 26, marginBottom: 10 }}>{icon}</div>
      <div style={{ fontSize: 15, fontWeight: 800, color: hovered ? color : TEXT, marginBottom: 6, transition: "color 0.2s" }}>{label}</div>
      <div style={{ fontSize: 12, color: TEXT_DIM, lineHeight: 1.5 }}>
        {desc.split(" · ").map((s, i, arr) => (
          <span key={i}>{s}{i < arr.length - 1 && <span style={{ opacity: 0.4 }}> · </span>}</span>
        ))}
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z"/>
    </svg>
  );
}
