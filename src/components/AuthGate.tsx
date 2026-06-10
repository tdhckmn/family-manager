import { useEffect, useState } from "react";
import { onAuthStateChanged, signInWithPopup, User } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, googleProvider, db } from "../firebase";
import { AuthContext } from "../auth";
import { migrateLegacyDataOnce } from "../migrate";
import { useSubscription, isSubActive, isOwnerEmail, startTrial } from "../subscription";
import Landing from "../pages/Landing";
import Subscribe from "../pages/Subscribe";

// ── Beta allowlist (must stay in sync with allowedEmails() in firestore.rules) ──
const ALLOWED_EMAILS = [
  "thomasdhickman@gmail.com",
];

const BG      = "var(--bg)";
const TEXT_DIM = "var(--text-dim)";
const DANGER   = "#c0566a";
const FONT     = "'Montserrat', sans-serif";

async function writeRegistry(user: User) {
  try {
    await setDoc(doc(db, "registry", user.uid), {
      uid: user.uid,
      email: user.email ?? "",
      displayName: user.displayName ?? "",
      lastSeen: new Date().toISOString().split("T")[0],
    }, { merge: true });
  } catch {
    // non-critical — admin-only collection, may fail for non-admin if rules not yet deployed
  }
}

// ── Subscription gate — renders Subscribe if no active sub ─────────────────
function SubGate({ user, children }: { user: User; children: React.ReactNode }) {
  const { sub, loading } = useSubscription(user.uid);

  // Owner always bypasses
  if (isOwnerEmail(user.email)) return <>{children}</>;

  if (loading) {
    return (
      <div style={{ background: BG, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 13, color: TEXT_DIM, fontFamily: FONT }}>Loading…</div>
      </div>
    );
  }

  // No subscription at all → start a trial automatically, then show app (loading will re-render)
  if (!sub) {
    startTrial(user.uid).catch(console.error);
    return (
      <div style={{ background: BG, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 13, color: TEXT_DIM, fontFamily: FONT }}>Starting your free trial…</div>
      </div>
    );
  }

  // Subscription exists but not active → paywall
  if (!isSubActive(sub)) {
    return <Subscribe />;
  }

  return <>{children}</>;
}

// ── Main gate ────────────────────────────────────────────────────────────────
export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null | "loading">("loading");

  useEffect(() => {
    return onAuthStateChanged(auth, u => {
      setUser(u);
      if (u) {
        migrateLegacyDataOnce(u.uid, u.email);
        writeRegistry(u);
      }
    });
  }, []);

  async function handleSignIn() {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("Sign-in failed:", err);
    }
  }

  if (user === "loading") {
    return (
      <div style={{ background: BG, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 13, color: TEXT_DIM, fontFamily: FONT }}>Loading…</div>
      </div>
    );
  }

  if (!user) {
    return <Landing onSignIn={handleSignIn} />;
  }

  // Allowlist check
  const email = user.email?.toLowerCase() ?? "";
  if (!ALLOWED_EMAILS.map(e => e.toLowerCase()).includes(email)) {
    return (
      <div style={{ background: BG, minHeight: "100vh", fontFamily: FONT, color: TEXT_DIM, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ textAlign: "center", maxWidth: 360 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: DANGER, marginBottom: 10 }}>Access restricted</div>
          <p style={{ fontSize: 14, lineHeight: 1.6, margin: "0 0 20px" }}>
            Equanimity is currently in closed beta. Your email (<strong>{user.email}</strong>) hasn't been added yet.
          </p>
          <p style={{ fontSize: 13, margin: "0 0 20px", color: "var(--text-muted)" }}>
            If you received an invitation, make sure you're signing in with the correct Google account.
          </p>
          <button
            onClick={() => auth.signOut()}
            style={{ background: DANGER, border: "none", borderRadius: 8, color: "#fff", fontFamily: FONT, fontWeight: 700, fontSize: 14, padding: "10px 22px", cursor: "pointer" }}
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={user}>
      <SubGate user={user}>
        {children}
      </SubGate>
    </AuthContext.Provider>
  );
}
