import { useEffect, useState } from "react";
import { onAuthStateChanged, signInWithPopup, signOut, User } from "firebase/auth";
import { auth, googleProvider } from "../firebase";

const ALLOWED_EMAIL = "thomasdhickman@gmail.com";

const BG = "#06091a";
const TEXT = "#dedad0";
const TEXT_DIM = "#7a7890";
const JADE = "#5db88a";
const DANGER = "#c0566a";
const SURFACE = "rgba(255,255,255,0.04)";
const BORDER = "rgba(255,255,255,0.08)";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null | "loading">("loading");

  useEffect(() => {
    return onAuthStateChanged(auth, setUser);
  }, []);

  async function handleSignIn() {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("Sign-in failed:", err);
    }
  }

  // Still resolving auth state — show nothing to avoid flash
  if (user === "loading") {
    return (
      <div style={{ background: BG, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 13, color: TEXT_DIM, fontFamily: "'Nunito',sans-serif" }}>Loading…</div>
      </div>
    );
  }

  // Signed in but wrong account
  if (user && user.email !== ALLOWED_EMAIL) {
    return (
      <div style={{ background: BG, minHeight: "100vh", fontFamily: "'Nunito',sans-serif", color: TEXT, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 20, padding: "40px 48px", maxWidth: 400, textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>🚫</div>
          <div style={{ fontSize: 17, fontWeight: 800, color: TEXT, marginBottom: 8 }}>Access Denied</div>
          <div style={{ fontSize: 13, color: TEXT_DIM, marginBottom: 6 }}>
            Signed in as <strong style={{ color: DANGER }}>{user.email}</strong>
          </div>
          <div style={{ fontSize: 13, color: TEXT_DIM, marginBottom: 28 }}>
            This app is private. Only the authorized account may sign in.
          </div>
          <button
            onClick={() => signOut(auth)}
            style={{ background: "transparent", border: `1px solid ${BORDER}`, borderRadius: 10, color: TEXT_DIM, fontFamily: "'Nunito',sans-serif", fontWeight: 700, fontSize: 13, padding: "9px 24px", cursor: "pointer" }}
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  // Not signed in
  if (!user) {
    return (
      <div style={{ background: BG, minHeight: "100vh", fontFamily: "'Nunito',sans-serif", color: TEXT, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "fixed", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse 55% 35% at 10% 0%, rgba(40,90,70,0.2) 0%, transparent 60%), radial-gradient(ellipse 40% 30% at 90% 100%, rgba(20,40,80,0.22) 0%, transparent 60%)" }} />
        <div style={{ position: "relative", background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 20, padding: "48px 56px", maxWidth: 380, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>💰</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: TEXT, marginBottom: 6, letterSpacing: -0.3 }}>Family Manager</div>
          <div style={{ fontSize: 13, color: TEXT_DIM, marginBottom: 32 }}>Sign in to access your dashboard</div>
          <button
            onClick={handleSignIn}
            style={{
              display: "flex", alignItems: "center", gap: 10, margin: "0 auto",
              background: "#fff", border: "none", borderRadius: 10,
              color: "#1f1f1f", fontFamily: "'Nunito',sans-serif", fontWeight: 700,
              fontSize: 14, padding: "11px 24px", cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.35)",
            }}
          >
            <GoogleIcon />
            Sign in with Google
          </button>
          <div style={{ fontSize: 11, color: TEXT_DIM, marginTop: 20, opacity: 0.6 }}>Private — authorized users only</div>
        </div>
      </div>
    );
  }

  // Authorized
  return <>{children}</>;
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
