import StarField from "../components/StarField";

const JADE    = "#5db88a";
const JADE_DIM = "#3d8a62";
const YELLOW  = "#e8c84a";
const BLUE    = "#5b8fd4";
const PINK    = "#e070a8";
const LAV     = "#a78bfa";
const ORANGE  = "#e07a3c";
const INK     = "#08101f";
const FONT    = "'Montserrat', sans-serif";

// Palette — always dark (Landing is always shown on dark bg)
const BG      = "#06091a";
const SURFACE = "rgba(255,255,255,0.05)";
const BORDER  = "rgba(255,255,255,0.08)";
const TEXT    = "#dedad0";
const TEXT_DIM = "rgba(222,218,208,0.6)";
const TEXT_MUTED = "rgba(222,218,208,0.38)";

function YinYang({ size }: { size: number }) {
  const YANG = "#5db88a";
  const YIN  = "#1a5c3e";
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ display: "block" }}>
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

interface Feature {
  color: string;
  emoji: string;
  title: string;
  desc: string;
}

const FEATURES: Feature[] = [
  { color: YELLOW, emoji: "📅", title: "Today & Calendar", desc: "See your day at a glance — chores, tasks due, meals, and subscription renewals all in one focused view." },
  { color: JADE,   emoji: "💰", title: "Finances",         desc: "50/30/20 budget with income, bills, subscriptions, savings goals, and per-account cash-flow planning." },
  { color: BLUE,   emoji: "📝", title: "Notes",            desc: "Markdown task tracker with optional due dates. Open items surface on your Calendar automatically." },
  { color: PINK,   emoji: "✅", title: "Chores",           desc: "Weekly board with day-of-week assignments and a completion tracker for your household." },
  { color: LAV,    emoji: "🍽️", title: "Meal Planner",     desc: "Plan the week's meals, build grocery lists, and add meals to days right from any recipe." },
  { color: ORANGE, emoji: "🔧", title: "Home Care",        desc: "Track recurring maintenance tasks — HVAC filters, oil changes, safety checks — with overdue alerts." },
];

interface PricingCard {
  label: string;
  price: string;
  period: string;
  savings?: string;
  accent: string;
  features: string[];
}

const PLANS: PricingCard[] = [
  {
    label: "Monthly",
    price: "$4",
    period: "/ month",
    accent: JADE,
    features: ["All 6 household tools", "14-day free trial", "Cancel anytime", "Light & dark themes"],
  },
  {
    label: "Yearly",
    price: "$36",
    period: "/ year",
    savings: "Save 25%",
    accent: YELLOW,
    features: ["Everything in Monthly", "25% off vs monthly", "14-day free trial", "Priority access to new features"],
  },
];

const PHILOSOPHY = [
  { tradition: "Stoic", quote: "You have power over your mind, not outside events. Realize this, and you will find strength.", author: "Marcus Aurelius" },
  { tradition: "Taoist", quote: "Nature does not hurry, yet everything is accomplished.", author: "Lao Tzu" },
];

export default function Landing({ onSignIn }: { onSignIn: () => void }) {
  return (
    <div style={{ background: BG, minHeight: "100vh", fontFamily: FONT, color: TEXT, overflowX: "hidden" }}>
      <StarField />
      <div style={{ position: "relative", zIndex: 1 }}>

        {/* ── Nav ──────────────────────────────────────────────────── */}
        <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 32px", maxWidth: 1100, margin: "0 auto", boxSizing: "border-box", width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ filter: "drop-shadow(0 0 10px rgba(93,184,138,0.35))" }}>
              <YinYang size={28} />
            </div>
            <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: -0.3 }}>Equanimity</span>
          </div>
          <button
            onClick={onSignIn}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              background: SURFACE, border: `1px solid ${BORDER}`,
              borderRadius: 8, color: TEXT, fontFamily: FONT,
              fontWeight: 700, fontSize: 13, padding: "9px 18px",
              cursor: "pointer", transition: "all 0.15s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.09)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.18)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = SURFACE; (e.currentTarget as HTMLButtonElement).style.borderColor = BORDER; }}
          >
            Sign in
          </button>
        </nav>

        {/* ── Hero ─────────────────────────────────────────────────── */}
        <section style={{ textAlign: "center", padding: "72px 24px 80px", maxWidth: 760, margin: "0 auto" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: `${JADE}18`, border: `1px solid ${JADE}40`, borderRadius: 100, padding: "5px 14px", marginBottom: 28 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: JADE, flexShrink: 0 }} />
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.8, textTransform: "uppercase", color: JADE }}>Stoic · Taoist</span>
          </div>
          <h1 style={{ fontSize: "clamp(36px, 6vw, 64px)", fontWeight: 800, lineHeight: 1.1, letterSpacing: -1.5, margin: "0 0 20px", color: TEXT }}>
            Finances &amp; focus<br />
            <span style={{ background: `linear-gradient(135deg, ${JADE}, ${JADE_DIM})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>for a steady mind</span>
          </h1>
          <p style={{ fontSize: 17, color: TEXT_DIM, lineHeight: 1.7, maxWidth: 540, margin: "0 auto 40px" }}>
            Six household tools — budget, tasks, chores, meals, home care, and calendar — wrapped in the clarity of Stoic and Taoist philosophy.
          </p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, flexWrap: "wrap" }}>
            <button
              onClick={onSignIn}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                background: "#fff", border: "none", borderRadius: 12,
                color: INK, fontFamily: FONT, fontWeight: 700,
                fontSize: 15, padding: "14px 28px", cursor: "pointer",
                boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
                transition: "transform 0.15s, box-shadow 0.15s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 6px 32px rgba(0,0,0,0.6)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = "none"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 24px rgba(0,0,0,0.5)"; }}
            >
              <GoogleIcon />
              Get started free
            </button>
            <span style={{ fontSize: 12, color: TEXT_MUTED }}>14-day trial · No credit card required</span>
          </div>
        </section>

        {/* ── Features grid ─────────────────────────────────────────── */}
        <section style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 96px" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h2 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 10px", letterSpacing: -0.5 }}>Everything your household needs</h2>
            <p style={{ fontSize: 14, color: TEXT_DIM, margin: 0 }}>Six integrated tools, one calm interface.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
            {FEATURES.map(f => (
              <div key={f.title}
                style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "24px 26px", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${f.color}cc, transparent)` }} />
                <div style={{ fontSize: 28, marginBottom: 12 }}>{f.emoji}</div>
                <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 8, color: TEXT }}>{f.title}</div>
                <p style={{ fontSize: 13, color: TEXT_DIM, lineHeight: 1.65, margin: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Philosophy ────────────────────────────────────────────── */}
        <section style={{ maxWidth: 860, margin: "0 auto", padding: "0 24px 96px" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <h2 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 10px", letterSpacing: -0.5 }}>Built on ancient wisdom</h2>
            <p style={{ fontSize: 14, color: TEXT_DIM, margin: 0 }}>Not a productivity app. A clarity tool.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
            {PHILOSOPHY.map(q => (
              <div key={q.tradition}
                style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "28px 32px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <div style={{ width: 3, height: 14, background: `linear-gradient(180deg, ${JADE}, ${JADE_DIM})`, borderRadius: 2 }} />
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: JADE }}>{q.tradition}</span>
                </div>
                <p style={{ fontSize: 15, color: "rgba(222,218,208,0.82)", fontStyle: "italic", lineHeight: 1.7, margin: "0 0 12px" }}>"{q.quote}"</p>
                <p style={{ fontSize: 12, color: TEXT_MUTED, fontWeight: 600, margin: 0 }}>— {q.author}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Pricing ───────────────────────────────────────────────── */}
        <section style={{ maxWidth: 800, margin: "0 auto", padding: "0 24px 96px" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h2 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 10px", letterSpacing: -0.5 }}>Simple, honest pricing</h2>
            <p style={{ fontSize: 14, color: TEXT_DIM, margin: 0 }}>Start free for 14 days. Cancel any time.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
            {PLANS.map(plan => (
              <div key={plan.label}
                style={{ background: SURFACE, border: `1px solid ${plan.accent}50`, borderRadius: 20, padding: "32px 28px", position: "relative" }}>
                {plan.savings && (
                  <div style={{ position: "absolute", top: -12, right: 20, background: YELLOW, color: INK, borderRadius: 100, padding: "4px 12px", fontSize: 11, fontWeight: 800, letterSpacing: 0.5 }}>
                    {plan.savings}
                  </div>
                )}
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: plan.accent, marginBottom: 12 }}>{plan.label}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 6 }}>
                  <span style={{ fontSize: 44, fontWeight: 800, color: TEXT, letterSpacing: -2 }}>{plan.price}</span>
                  <span style={{ fontSize: 14, color: TEXT_DIM }}>{plan.period}</span>
                </div>
                <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 24 }}>after 14-day free trial</div>
                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px", display: "flex", flexDirection: "column", gap: 10 }}>
                  {plan.features.map(f => (
                    <li key={f} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: TEXT_DIM }}>
                      <span style={{ width: 16, height: 16, borderRadius: "50%", background: `${plan.accent}25`, border: `1px solid ${plan.accent}60`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 9, color: plan.accent, fontWeight: 800 }}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={onSignIn}
                  style={{
                    width: "100%", padding: "13px 0", borderRadius: 10, border: "none",
                    background: `linear-gradient(135deg, ${plan.accent}, ${plan.accent}cc)`,
                    color: INK, fontFamily: FONT, fontWeight: 800, fontSize: 14,
                    cursor: "pointer", transition: "opacity 0.15s",
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.opacity = "0.88"}
                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.opacity = "1"}
                >
                  Start free trial
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* ── Footer CTA ────────────────────────────────────────────── */}
        <section style={{ textAlign: "center", padding: "0 24px 80px" }}>
          <div style={{ maxWidth: 480, margin: "0 auto" }}>
            <div style={{ marginBottom: 16, display: "flex", justifyContent: "center", filter: "drop-shadow(0 0 18px rgba(93,184,138,0.25))" }}>
              <YinYang size={40} />
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 10px", letterSpacing: -0.5 }}>Begin with stillness</h2>
            <p style={{ fontSize: 14, color: TEXT_DIM, lineHeight: 1.7, margin: "0 0 28px" }}>
              Join a small group of people using Equanimity to simplify household life — one mindful decision at a time.
            </p>
            <button
              onClick={onSignIn}
              style={{
                display: "inline-flex", alignItems: "center", gap: 10,
                background: "#fff", border: "none", borderRadius: 12,
                color: INK, fontFamily: FONT, fontWeight: 700,
                fontSize: 14, padding: "13px 28px", cursor: "pointer",
                boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
              }}
            >
              <GoogleIcon />
              Sign in with Google
            </button>
          </div>
        </section>

        {/* ── Footer ────────────────────────────────────────────────── */}
        <footer style={{ borderTop: `1px solid ${BORDER}`, padding: "24px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", maxWidth: 1100, margin: "0 auto", boxSizing: "border-box", width: "100%", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <YinYang size={16} />
            <span style={{ fontSize: 12, fontWeight: 700, color: TEXT_MUTED }}>Equanimity</span>
          </div>
          <span style={{ fontSize: 11, color: TEXT_MUTED }}>Stoic · Taoist · $4/month</span>
        </footer>

      </div>
    </div>
  );
}
