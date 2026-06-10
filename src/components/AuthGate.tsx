import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { onAuthStateChanged, signInWithPopup, signOut, User } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db, googleProvider } from "../firebase";
import { AuthContext } from "../auth";
import {
  HouseholdContext, HouseholdInfo, HouseholdRole, SubStatus, subIsActive,
} from "../household";
import StarField from "./StarField";
import { migrateLegacyDataOnce } from "../migrate";

const OWNER_EMAIL = "thomasdhickman@gmail.com";

export const FOOD_PLANNER_EMAIL = OWNER_EMAIL;

const BG = "#06091a";
const TEXT = "#dedad0";
const TEXT_DIM = "#7a7890";
const JADE = "#5db88a";
const SURFACE = "rgba(255,255,255,0.04)";
const BORDER = "rgba(255,255,255,0.08)";

async function loadOrCreateHousehold(user: User): Promise<HouseholdInfo> {
  const profileRef = doc(db, "users", user.uid, "meta", "profile");
  const profileSnap = await getDoc(profileRef);

  if (!profileSnap.exists()) {
    // New user — create household as owner, start 14-day trial
    const trialEndsAt = new Date(Date.now() + 14 * 86_400_000).toISOString();
    await setDoc(profileRef, { role: "owner", householdId: user.uid, createdAt: new Date().toISOString() });
    await setDoc(doc(db, "users", user.uid, "meta", "subscription"), {
      status: "trialing", trialEndsAt, override: null,
    });
    await setDoc(doc(db, "users", user.uid, "meta", "household"), {
      members: [user.uid], inviteCode: null, displayToken: null,
    });
    // Register for admin panel visibility
    await setDoc(doc(db, "registrations", user.uid), {
      email: user.email, createdAt: new Date().toISOString(), subStatus: "trialing",
    });
    return {
      householdId: user.uid, role: "owner",
      subStatus: "trialing", trialEndsAt, periodEndsAt: null, isOverride: false,
    };
  }

  const profile = profileSnap.data() as { role: HouseholdRole; householdId: string };
  const householdId = profile.householdId ?? user.uid;

  const subSnap = await getDoc(doc(db, "users", householdId, "meta", "subscription"));
  let subStatus: SubStatus = "none";
  let trialEndsAt: string | null = null;
  let periodEndsAt: string | null = null;
  let isOverride = false;

  if (subSnap.exists()) {
    const sub = subSnap.data();
    const override = sub.override;
    if (override?.active) {
      const exp = override.expiresAt ? new Date(override.expiresAt) : null;
      if (!exp || exp > new Date()) { subStatus = "active"; isOverride = true; }
    }
    if (!isOverride) {
      if (sub.status === "trialing" && sub.trialEndsAt && new Date(sub.trialEndsAt) > new Date()) {
        subStatus = "trialing"; trialEndsAt = sub.trialEndsAt;
      } else if (sub.status === "trialing") {
        subStatus = "cancelled";
      } else {
        subStatus = (sub.status as SubStatus) ?? "none";
        periodEndsAt = sub.currentPeriodEnd ?? null;
      }
    }
  }

  return { householdId, role: profile.role, subStatus, trialEndsAt, periodEndsAt, isOverride };
}

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null | "loading">("loading");
  const [household, setHousehold] = useState<HouseholdInfo | null>(null);
  const [householdLoading, setHouseholdLoading] = useState(false);
  const location = useLocation();

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (!u) { setUser(null); setHousehold(null); return; }
      setUser(u);
      setHouseholdLoading(true);
      try {
        const info = await loadOrCreateHousehold(u);
        setHousehold(info);
        migrateLegacyDataOnce(u.uid, u.email);
      } finally {
        setHouseholdLoading(false);
      }
    });
  }, []);

  if (user === "loading" || (user && householdLoading)) {
    return (
      <div style={{ background: BG, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 13, color: TEXT_DIM, fontFamily: "'Montserrat',sans-serif" }}>Loading…</div>
      </div>
    );
  }

  if (!user) {
    return <SignInScreen />;
  }

  if (!household) return null;

  const isFounder = user.email?.toLowerCase() === OWNER_EMAIL;
  const onSubscribePage = location.pathname === "/subscribe";

  if (!isFounder && !subIsActive(household.subStatus) && !onSubscribePage) {
    return <Navigate to="/subscribe" replace />;
  }

  return (
    <AuthContext.Provider value={user}>
      <HouseholdContext.Provider value={household}>
        {children}
      </HouseholdContext.Provider>
    </AuthContext.Provider>
  );
}

function SignInScreen() {
  async function handleSignIn() {
    try { await signInWithPopup(auth, googleProvider); }
    catch (err) { console.error("Sign-in failed:", err); }
  }

  return (
    <div style={{ background: BG, minHeight: "100vh", fontFamily: "'Montserrat',sans-serif", color: TEXT, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <StarField />
      <div style={{ position: "relative", background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 20, padding: "48px 56px", maxWidth: 380, textAlign: "center" }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", color: JADE, opacity: 0.8, marginBottom: 10 }}>Stoic · Taoist</div>
        <div style={{ fontSize: 24, fontWeight: 800, color: TEXT, marginBottom: 6, letterSpacing: -0.3 }}>Equanimity</div>
        <div style={{ fontSize: 13, color: TEXT_DIM, marginBottom: 32 }}>Finances &amp; focus for a steady mind</div>
        <button
          onClick={handleSignIn}
          style={{ display: "flex", alignItems: "center", gap: 10, margin: "0 auto", background: "#fff", border: "none", borderRadius: 10, color: "#1f1f1f", fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 14, padding: "11px 24px", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.35)" }}
        >
          <GoogleIcon />
          Sign in with Google
        </button>
        <div style={{ fontSize: 11, color: TEXT_DIM, marginTop: 20, opacity: 0.6 }}>14-day free trial · No credit card required</div>
        <button onClick={() => signOut(auth)} style={{ marginTop: 16, background: "transparent", border: "none", color: TEXT_DIM, fontSize: 11, cursor: "pointer", fontFamily: "'Montserrat',sans-serif" }}>
          Sign out
        </button>
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
