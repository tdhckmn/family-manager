import { useState } from "react";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { Link } from "react-router-dom";
import { db, auth } from "../firebase";
import StarField from "../components/StarField";
import { useAuth } from "../auth";
import { useSubscription, type Subscription, trialDaysLeft, isSubActive } from "../subscription";

const JADE    = "#5db88a";
const JADE_DIM = "#3d8a62";
const YELLOW  = "#e8c84a";
const DANGER  = "#c0566a";
const INK     = "#08101f";
const FONT    = "'Montserrat', sans-serif";

const BG         = "#06091a";
const SURFACE    = "rgba(255,255,255,0.05)";
const BORDER     = "rgba(255,255,255,0.08)";
const TEXT       = "#dedad0";
const TEXT_DIM   = "rgba(222,218,208,0.6)";
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

const MONTHLY_LINK = import.meta.env.VITE_STRIPE_MONTHLY_LINK as string | undefined;
const YEARLY_LINK  = import.meta.env.VITE_STRIPE_YEARLY_LINK  as string | undefined;

export default function Subscribe() {
  const user = useAuth();
  const { sub } = useSubscription(user.uid);

  const [coupon, setCoupon] = useState("");
  const [couponMsg, setCouponMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [redeemLoading, setRedeemLoading] = useState(false);

  const daysLeft = trialDaysLeft(sub);
  const onTrial = sub?.status === "trialing" && daysLeft > 0;
  const trialExpired = sub?.status === "trialing" && daysLeft === 0;

  async function redeemCoupon() {
    if (!coupon.trim()) return;
    setRedeemLoading(true);
    setCouponMsg(null);
    try {
      const cRef = doc(db, "coupons", coupon.trim().toUpperCase());
      const snap = await getDoc(cRef);
      if (!snap.exists()) {
        setCouponMsg({ ok: false, text: "Invalid coupon code." });
        return;
      }
      const data = snap.data() as { active?: boolean; plan?: "monthly" | "yearly"; expiresAt?: string };
      if (data.active === false) {
        setCouponMsg({ ok: false, text: "This coupon has been used or deactivated." });
        return;
      }
      if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
        setCouponMsg({ ok: false, text: "This coupon has expired." });
        return;
      }
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const subData: Subscription = {
        status: "override",
        override: true,
        overrideReason: `coupon:${coupon.trim().toUpperCase()}`,
        couponCode: coupon.trim().toUpperCase(),
        plan: data.plan || "monthly",
        currentPeriodEnd: futureDate.toISOString().split("T")[0],
        createdAt: new Date().toISOString().split("T")[0],
      };
      await setDoc(doc(db, "users", user.uid, "sub", "info"), subData);
      await setDoc(cRef, { ...data, active: false, usedBy: user.uid, usedAt: new Date().toISOString() });
      setCouponMsg({ ok: true, text: "Coupon applied! Welcome to Equanimity." });
    } catch {
      setCouponMsg({ ok: false, text: "Error redeeming coupon. Try again." });
    } finally {
      setRedeemLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.06)", border: `1px solid ${BORDER}`,
    borderRadius: 8, color: TEXT, fontFamily: FONT, fontWeight: 700,
    fontSize: 13, padding: "9px 12px", outline: "none",
  };

  return (
    <div style={{ background: BG, minHeight: "100vh", fontFamily: FONT, color: TEXT, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <StarField />
      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 520 }}>

        {/* Back link (when visited as a route from within the app) */}
        {isSubActive(sub) && (
          <div style={{ marginBottom: 20 }}>
            <Link to="/" style={{ color: TEXT_DIM, textDecoration: "none", fontSize: 13, fontWeight: 600 }}>← Back</Link>
          </div>
        )}

        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 14, filter: "drop-shadow(0 0 16px rgba(93,184,138,0.3))" }}>
            <YinYang size={44} />
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 8px", letterSpacing: -0.5 }}>
            {onTrial
              ? `${daysLeft} day${daysLeft !== 1 ? "s" : ""} left in your trial`
              : isSubActive(sub)
              ? "Manage subscription"
              : "Subscribe to Equanimity"}
          </h1>
          <p style={{ fontSize: 13, color: TEXT_DIM, margin: 0 }}>
            {onTrial
              ? "You have full access during your trial. Subscribe now to continue after it ends."
              : trialExpired
              ? "Your free trial has ended. Subscribe to regain access."
              : isSubActive(sub)
              ? "Your subscription is active. Plans and billing below."
              : "Start your 14-day free trial — no credit card required."}
          </p>
        </div>

        {/* Active sub info */}
        {isSubActive(sub) && sub && (
          <div style={{ background: `${JADE}12`, border: `1px solid ${JADE}40`, borderRadius: 12, padding: "14px 18px", marginBottom: 20 }}>
            <div style={{ fontSize: 13, color: JADE, fontWeight: 700, marginBottom: 4 }}>
              {sub.override ? "Access granted" : sub.status === "active" ? "Active subscription" : "Trial active"}
            </div>
            {sub.plan && <div style={{ fontSize: 12, color: TEXT_DIM }}>Plan: {sub.plan}</div>}
            {sub.currentPeriodEnd && <div style={{ fontSize: 12, color: TEXT_DIM }}>Renews / expires: {sub.currentPeriodEnd}</div>}
          </div>
        )}

        {/* Trial progress bar */}
        {onTrial && sub?.trialEnd && (
          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "14px 18px", marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: TEXT_DIM, fontWeight: 600 }}>Free trial</span>
              <span style={{ fontSize: 12, color: daysLeft <= 3 ? DANGER : JADE, fontWeight: 700 }}>{daysLeft}d remaining</span>
            </div>
            <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 2, background: daysLeft <= 3 ? DANGER : JADE, width: `${(daysLeft / 14) * 100}%`, transition: "width 0.3s" }} />
            </div>
          </div>
        )}

        {/* Pricing */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
          <div style={{ background: SURFACE, border: `1px solid ${JADE}45`, borderRadius: 16, padding: "22px 18px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: JADE, marginBottom: 10 }}>Monthly</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 3, marginBottom: 18 }}>
              <span style={{ fontSize: 36, fontWeight: 800, letterSpacing: -1.5 }}>$4</span>
              <span style={{ fontSize: 13, color: TEXT_DIM }}>/mo</span>
            </div>
            <a href={MONTHLY_LINK || "#"} onClick={!MONTHLY_LINK ? e => e.preventDefault() : undefined}
              style={{ display: "block", textAlign: "center", padding: "11px 0", borderRadius: 9, background: `linear-gradient(135deg, ${JADE}, ${JADE_DIM})`, color: INK, fontFamily: FONT, fontWeight: 800, fontSize: 13, textDecoration: "none", opacity: MONTHLY_LINK ? 1 : 0.5, cursor: MONTHLY_LINK ? "pointer" : "not-allowed" }}>
              {MONTHLY_LINK ? "Subscribe" : "Coming soon"}
            </a>
          </div>
          <div style={{ background: SURFACE, border: `1px solid ${YELLOW}45`, borderRadius: 16, padding: "22px 18px", position: "relative" }}>
            <div style={{ position: "absolute", top: -10, right: 12, background: YELLOW, color: INK, borderRadius: 100, padding: "3px 10px", fontSize: 10, fontWeight: 800 }}>SAVE 25%</div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: YELLOW, marginBottom: 10 }}>Yearly</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 3, marginBottom: 18 }}>
              <span style={{ fontSize: 36, fontWeight: 800, letterSpacing: -1.5 }}>$36</span>
              <span style={{ fontSize: 13, color: TEXT_DIM }}>/yr</span>
            </div>
            <a href={YEARLY_LINK || "#"} onClick={!YEARLY_LINK ? e => e.preventDefault() : undefined}
              style={{ display: "block", textAlign: "center", padding: "11px 0", borderRadius: 9, background: `linear-gradient(135deg, ${YELLOW}, #c9a830)`, color: INK, fontFamily: FONT, fontWeight: 800, fontSize: 13, textDecoration: "none", opacity: YEARLY_LINK ? 1 : 0.5, cursor: YEARLY_LINK ? "pointer" : "not-allowed" }}>
              {YEARLY_LINK ? "Subscribe" : "Coming soon"}
            </a>
          </div>
        </div>

        {/* Coupon */}
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "18px 20px", marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: TEXT_DIM, marginBottom: 10 }}>Have a coupon code?</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={coupon} onChange={e => { setCoupon(e.target.value.toUpperCase()); setCouponMsg(null); }}
              placeholder="ENTER CODE"
              style={{ ...inputStyle, flex: 1, letterSpacing: 1.2 }} />
            <button onClick={redeemCoupon} disabled={redeemLoading || !coupon.trim()}
              style={{ padding: "9px 16px", borderRadius: 8, border: "none", background: coupon.trim() ? JADE : "rgba(255,255,255,0.08)", color: coupon.trim() ? INK : TEXT_MUTED, fontFamily: FONT, fontWeight: 700, fontSize: 13, cursor: coupon.trim() ? "pointer" : "default" }}>
              {redeemLoading ? "…" : "Apply"}
            </button>
          </div>
          {couponMsg && (
            <div style={{ marginTop: 8, fontSize: 12, fontWeight: 600, color: couponMsg.ok ? JADE : DANGER }}>{couponMsg.text}</div>
          )}
        </div>

        <div style={{ textAlign: "center" }}>
          <button onClick={() => signOut(auth).catch(console.error)}
            style={{ background: "none", border: "none", color: TEXT_MUTED, fontFamily: FONT, fontSize: 12, cursor: "pointer", padding: "6px 0" }}>
            Sign out ({user.email})
          </button>
        </div>

        {!isSubActive(sub) && (MONTHLY_LINK || YEARLY_LINK) && (
          <div style={{ marginTop: 18, textAlign: "center", fontSize: 11, color: TEXT_MUTED, lineHeight: 1.6 }}>
            After subscribing via Stripe, this page will update automatically within a minute.
          </div>
        )}
      </div>
    </div>
  );
}
