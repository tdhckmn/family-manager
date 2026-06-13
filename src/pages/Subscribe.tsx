import { useState } from "react";
import { Link } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, updateDoc } from "firebase/firestore";
import { useAuth } from "../auth";
import { useHousehold, daysLeft, subIsActive } from "../household";
import StarField from "../components/StarField";

const BG = "#06091a";
const TEXT = "#dedad0";
const TEXT_DIM = "#7a7890";
const JADE = "#5db88a";
const DANGER = "#c0566a";
const SURFACE = "rgba(255,255,255,0.04)";
const BORDER = "rgba(255,255,255,0.08)";
const AMBER = "#e0a435";

// Pre-configure your Stripe Payment Link in .env as VITE_STRIPE_PAYMENT_LINK
const STRIPE_LINK = import.meta.env.VITE_STRIPE_PAYMENT_LINK as string | undefined;

export default function Subscribe() {
  const user = useAuth();
  const household = useHousehold();
  const [signingOut, setSigningOut] = useState(false);

  const trialing = household.subStatus === "trialing";
  const trialDays = daysLeft(household.trialEndsAt);
  const expired = !subIsActive(household.subStatus);

  async function handleSignOut() {
    setSigningOut(true);
    try { await signOut(auth); } catch { setSigningOut(false); }
  }

  // If they somehow land here with an active sub, send them home
  if (subIsActive(household.subStatus)) {
    return <Link to="/app" style={{ color: JADE }}>Go to dashboard →</Link>;
  }

  return (
    <div style={{ background: BG, minHeight: "100vh", fontFamily: "'Montserrat', sans-serif", color: TEXT, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <StarField />
      <div style={{ position: "relative", zIndex: 5, maxWidth: 480, width: "100%", textAlign: "center" }}>

        {trialing && trialDays > 0 ? (
          <TrialBanner days={trialDays} />
        ) : (
          <ExpiredBanner />
        )}

        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 24, padding: "36px 40px", marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", color: JADE, opacity: 0.8, marginBottom: 12 }}>Subscribe to continue</div>
          <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: -1, marginBottom: 4 }}>
            $4<span style={{ fontSize: 18, fontWeight: 600, color: TEXT_DIM }}>/month</span>
          </div>
          <div style={{ fontSize: 13, color: TEXT_DIM, marginBottom: 28 }}>or $36/year — save 25%</div>

          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px", textAlign: "left" }}>
            {[
              "All household tools",
              "Unlimited household members",
              "Partner invitation & sharing",
              "Wall display / kiosk mode",
              "Your data stays private",
            ].map(item => (
              <li key={item} style={{ fontSize: 13, color: TEXT_DIM, padding: "5px 0", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ color: JADE }}>✓</span> {item}
              </li>
            ))}
          </ul>

          {STRIPE_LINK ? (
            <a
              href={`${STRIPE_LINK}?prefilled_email=${encodeURIComponent(user.email ?? "")}`}
              style={{ display: "block", background: JADE, border: "none", borderRadius: 12, color: "#0a1a12", fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 15, padding: "14px", cursor: "pointer", textDecoration: "none", marginBottom: 10 }}
            >
              Subscribe with Stripe →
            </a>
          ) : (
            <div style={{ background: `${AMBER}15`, border: `1px solid ${AMBER}44`, borderRadius: 12, padding: "14px 16px", marginBottom: 10, textAlign: "left" }}>
              <div style={{ fontSize: 12, color: AMBER, fontWeight: 700, marginBottom: 4 }}>Payments not yet configured</div>
              <div style={{ fontSize: 12, color: TEXT_DIM, lineHeight: 1.5 }}>
                Add <code style={{ background: "rgba(255,255,255,0.08)", padding: "1px 5px", borderRadius: 4 }}>VITE_STRIPE_PAYMENT_LINK</code> to <code style={{ background: "rgba(255,255,255,0.08)", padding: "1px 5px", borderRadius: 4 }}>.env</code> to enable payments.
              </div>
            </div>
          )}

          {trialing && trialDays > 0 && (
            <Link to="/app" style={{ display: "block", padding: "11px", borderRadius: 12, border: `1px solid ${BORDER}`, color: TEXT_DIM, textDecoration: "none", fontSize: 13, fontWeight: 600 }}>
              Continue trial ({trialDays} days left)
            </Link>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: 20 }}>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            style={{ background: "transparent", border: "none", color: DANGER, fontSize: 12, cursor: "pointer", fontFamily: "'Montserrat',sans-serif", fontWeight: 600 }}
          >
            Sign out
          </button>
          <span style={{ color: BORDER, fontSize: 12 }}>·</span>
          <a href="mailto:thomasdhickman@gmail.com" style={{ color: TEXT_DIM, fontSize: 12, textDecoration: "none" }}>Contact support</a>
        </div>
      </div>
    </div>
  );
}

function TrialBanner({ days }: { days: number }) {
  return (
    <div style={{ background: `${JADE}12`, border: `1px solid ${JADE}33`, borderRadius: 16, padding: "16px 24px", marginBottom: 20, textAlign: "center" }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: JADE, marginBottom: 4 }}>
        Your trial ends in {days} day{days !== 1 ? "s" : ""}
      </div>
      <div style={{ fontSize: 12, color: TEXT_DIM }}>Subscribe now to keep access to all your data</div>
    </div>
  );
}

function ExpiredBanner() {
  return (
    <div style={{ background: `${DANGER}12`, border: `1px solid ${DANGER}33`, borderRadius: 16, padding: "16px 24px", marginBottom: 20, textAlign: "center" }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: DANGER, marginBottom: 4 }}>Your trial has ended</div>
      <div style={{ fontSize: 12, color: TEXT_DIM }}>Subscribe to regain access. Your data is safe.</div>
    </div>
  );
}
