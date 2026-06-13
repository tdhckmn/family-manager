import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { onAuthStateChanged, signInWithPopup, User } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { auth, db, googleProvider } from "../../firebase";
import StarField from "../../components/StarField";

const BG = "#06091a";
const TEXT = "#dedad0";
const TEXT_DIM = "#7a7890";
const JADE = "#5db88a";
const DANGER = "#c0566a";
const SURFACE = "rgba(255,255,255,0.04)";
const BORDER = "rgba(255,255,255,0.08)";
const AMBER = "#e0a435";

export default function Join() {
  const [user, setUser] = useState<User | null | "loading">("loading");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const navigate = useNavigate();

  useEffect(() => onAuthStateChanged(auth, u => setUser(u ?? null)), []);

  async function handleSignIn() {
    try { await signInWithPopup(auth, googleProvider); }
    catch (err) { console.error(err); }
  }

  async function handleJoin() {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed || user === "loading" || !user) return;

    setStatus("loading");
    setErrorMsg("");

    try {
      // Check invite code
      const inviteRef = doc(db, "invites", trimmed);
      const inviteSnap = await getDoc(inviteRef);

      if (!inviteSnap.exists()) {
        setStatus("error"); setErrorMsg("Invite code not found. Check the code and try again."); return;
      }

      const invite = inviteSnap.data() as { ownerUid: string; expiresAt: string; usedBy?: string };

      if (invite.usedBy) {
        setStatus("error"); setErrorMsg("This invite code has already been used."); return;
      }
      if (new Date(invite.expiresAt) < new Date()) {
        setStatus("error"); setErrorMsg("This invite code has expired. Ask your household owner to generate a new one."); return;
      }
      if (invite.ownerUid === user.uid) {
        setStatus("error"); setErrorMsg("This is your own household invite code."); return;
      }

      const ownerUid = invite.ownerUid;

      // Check if already in a household
      const profileRef = doc(db, "users", user.uid, "meta", "profile");
      const profileSnap = await getDoc(profileRef);
      if (profileSnap.exists()) {
        const p = profileSnap.data();
        if (p.role === "member" || (p.role === "owner" && p.householdId !== user.uid)) {
          setStatus("error"); setErrorMsg("You're already part of a household."); return;
        }
      }

      // Join the household
      await setDoc(profileRef, { role: "member", householdId: ownerUid, joinedAt: new Date().toISOString() });
      await updateDoc(doc(db, "users", ownerUid, "meta", "household"), { members: arrayUnion(user.uid) });
      await updateDoc(inviteRef, { usedBy: user.uid });

      setStatus("success");
      setTimeout(() => navigate("/app"), 1500);
    } catch (err) {
      console.error(err);
      setStatus("error");
      setErrorMsg("Something went wrong. Please try again.");
    }
  }

  if (user === "loading") {
    return <LoadingScreen />;
  }

  return (
    <div style={{ background: BG, minHeight: "100vh", fontFamily: "'Montserrat', sans-serif", color: TEXT, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <StarField />
      <div style={{ position: "relative", zIndex: 5, maxWidth: 420, width: "100%", textAlign: "center" }}>
        <Link to="/" style={{ fontSize: 18, fontWeight: 800, color: TEXT, textDecoration: "none", display: "block", marginBottom: 32 }}>Equanimity</Link>

        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 24, padding: "36px 40px" }}>
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Join a Household</div>
          <div style={{ fontSize: 13, color: TEXT_DIM, marginBottom: 28, lineHeight: 1.5 }}>
            Enter the invite code shared by your household owner to join their workspace.
          </div>

          {!user ? (
            <>
              <div style={{ fontSize: 13, color: TEXT_DIM, marginBottom: 20 }}>Sign in first to join a household.</div>
              <button
                onClick={handleSignIn}
                style={{ display: "flex", alignItems: "center", gap: 10, margin: "0 auto", background: "#fff", border: "none", borderRadius: 10, color: "#1f1f1f", fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 14, padding: "11px 24px", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.35)" }}
              >
                <GoogleIcon /> Sign in with Google
              </button>
            </>
          ) : status === "success" ? (
            <div style={{ color: JADE, fontSize: 16, fontWeight: 700 }}>✓ Joined! Redirecting…</div>
          ) : (
            <>
              <input
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === "Enter" && handleJoin()}
                placeholder="Enter invite code"
                maxLength={8}
                style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.06)", border: `1px solid ${status === "error" ? DANGER + "77" : BORDER}`, borderRadius: 10, color: TEXT, fontFamily: "'Montserrat',sans-serif", fontSize: 18, fontWeight: 700, letterSpacing: 4, padding: "14px 16px", marginBottom: 12, textAlign: "center", outline: "none" }}
              />
              {status === "error" && (
                <div style={{ fontSize: 12, color: DANGER, marginBottom: 12, lineHeight: 1.5 }}>{errorMsg}</div>
              )}
              <button
                onClick={handleJoin}
                disabled={status === "loading" || !code.trim()}
                style={{ width: "100%", background: JADE, border: "none", borderRadius: 10, color: "#0a1a12", fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 14, padding: "13px", cursor: "pointer", opacity: (!code.trim() || status === "loading") ? 0.6 : 1 }}
              >
                {status === "loading" ? "Joining…" : "Join Household"}
              </button>
            </>
          )}
        </div>

        <div style={{ marginTop: 20, fontSize: 12, color: TEXT_DIM }}>
          Don't have an invite code?{" "}
          <Link to="/" style={{ color: JADE, textDecoration: "none" }}>Start your own trial →</Link>
        </div>
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div style={{ background: BG, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontSize: 13, color: "#7a7890", fontFamily: "'Montserrat',sans-serif" }}>Loading…</div>
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
