import { useEffect, useState } from "react";
import { onAuthStateChanged, signInWithPopup, User } from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import StarField from "./StarField";
import { AuthContext } from "../auth";
import { migrateLegacyDataOnce } from "../migrate";

const BG     = "var(--bg)";
const TEXT   = "var(--text)";
const TEXT_DIM = "var(--text-dim)";
const JADE   = "#5db88a";
const SURFACE = "var(--surface)";
const BORDER  = "var(--border)";

function YinYang({ size }: { size: number }) {
  const YANG = "#5db88a";
  const YIN  = "#1a5c3e";
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ display: "block", opacity: 0.72 }}>
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

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null | "loading">("loading");

  useEffect(() => {
    return onAuthStateChanged(auth, setUser);
  }, []);

  useEffect(() => {
    if (user && user !== "loading") {
      migrateLegacyDataOnce(user.uid, user.email);
    }
  }, [user]);

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
        <div style={{ fontSize: 13, color: TEXT_DIM, fontFamily: "'Montserrat',sans-serif" }}>Loading…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ background: BG, minHeight: "100vh", fontFamily: "'Montserrat',sans-serif", color: TEXT, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <StarField />
        <div style={{ position: "relative", background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 20, padding: "48px 56px", maxWidth: 380, textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16, filter: "drop-shadow(0 0 20px rgba(93,184,138,0.22))" }}>
            <YinYang size={56} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: TEXT, marginBottom: 6, letterSpacing: -0.3 }}>Equanimity</div>
          <div style={{ fontSize: 13, color: TEXT_DIM, marginBottom: 32 }}>Finances &amp; focus for a steady mind</div>
          <button
            onClick={handleSignIn}
            style={{
              display: "flex", alignItems: "center", gap: 10, margin: "0 auto",
              background: "#fff", border: "none", borderRadius: 10,
              color: "#1f1f1f", fontFamily: "'Montserrat',sans-serif", fontWeight: 700,
              fontSize: 14, padding: "11px 24px", cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.35)",
            }}
          >
            <GoogleIcon />
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={user}>{children}</AuthContext.Provider>;
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
