import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { doc, onSnapshot, updateDoc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../auth";
import { useHousehold, daysLeft, subIsActive } from "../../household";
import StarField from "../../components/StarField";

const BG = "#06091a";
const TEXT = "#dedad0";
const TEXT_DIM = "#7a7890";
const JADE = "#5db88a";
const DANGER = "#c0566a";
const AMBER = "#e0a435";
const SURFACE = "rgba(255,255,255,0.04)";
const BORDER = "rgba(255,255,255,0.08)";

function generateCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

interface HouseholdDoc {
  members: string[];
  inviteCode: string | null;
  inviteExpiresAt: string | null;
}

export default function HouseholdSettings() {
  const user = useAuth();
  const household = useHousehold();
  const isOwner = household.role === "owner";
  const [hhDoc, setHhDoc] = useState<HouseholdDoc | null>(null);
  const [memberEmails, setMemberEmails] = useState<Record<string, string>>({});
  const [generatingCode, setGeneratingCode] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOwner) return;
    return onSnapshot(doc(db, "users", household.householdId, "household"), snap => {
      if (snap.exists()) setHhDoc(snap.data() as HouseholdDoc);
    });
  }, [household.householdId, isOwner]);

  // Load member profile emails
  useEffect(() => {
    if (!hhDoc?.members) return;
    const uids = hhDoc.members.filter(uid => uid !== user.uid);
    Promise.all(
      uids.map(async uid => {
        const snap = await getDoc(doc(db, "registrations", uid));
        return [uid, (snap.data()?.email as string) ?? "Unknown"] as [string, string];
      })
    ).then(entries => setMemberEmails(Object.fromEntries(entries)));
  }, [hhDoc?.members, user.uid]);

  async function generateInvite() {
    if (!isOwner) return;
    setGeneratingCode(true);
    try {
      const code = generateCode();
      const expiresAt = new Date(Date.now() + 72 * 3_600_000).toISOString();
      await updateDoc(doc(db, "users", household.householdId, "household"), { inviteCode: code, inviteExpiresAt: expiresAt });
      await setDoc(doc(db, "invites", code), { ownerUid: household.householdId, expiresAt, createdAt: new Date().toISOString() });
    } finally {
      setGeneratingCode(false);
    }
  }

  async function revokeInvite() {
    await updateDoc(doc(db, "users", household.householdId, "household"), { inviteCode: null, inviteExpiresAt: null });
  }

  function copyInviteLink() {
    const code = hhDoc?.inviteCode;
    if (!code) return;
    const url = `${window.location.origin}/join`;
    navigator.clipboard.writeText(`Join my Equanimity household!\nVisit ${url} and enter code: ${code}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const inviteExpired = hhDoc?.inviteExpiresAt ? new Date(hhDoc.inviteExpiresAt) < new Date() : false;
  const inviteHoursLeft = hhDoc?.inviteExpiresAt
    ? Math.max(0, Math.ceil((new Date(hhDoc.inviteExpiresAt).getTime() - Date.now()) / 3_600_000))
    : 0;

  return (
    <div style={{ background: BG, minHeight: "100vh", fontFamily: "'Montserrat', sans-serif", color: TEXT, padding: "40px 20px 80px", position: "relative" }}>
      <StarField />
      <div style={{ position: "relative", zIndex: 5, maxWidth: 560, margin: "0 auto" }}>

        <div style={{ marginBottom: 28 }}>
          <Link to="/home" style={{ color: TEXT_DIM, fontSize: 12, textDecoration: "none", fontWeight: 600 }}>← Back to home</Link>
        </div>

        <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 28px", letterSpacing: -0.3 }}>Household Settings</h1>

        {/* Subscription status */}
        <Section title="Subscription">
          <StatusRow label="Plan" value={household.subStatus === "trialing" ? `Free trial (${daysLeft(household.trialEndsAt)} days left)` : household.subStatus} accent={subIsActive(household.subStatus) ? JADE : DANGER} />
          {household.isOverride && <StatusRow label="Access" value="Complimentary access" accent={AMBER} />}
          {!subIsActive(household.subStatus) && (
            <Link to="/subscribe" style={{ display: "inline-block", marginTop: 12, background: JADE, borderRadius: 8, color: "#0a1a12", fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 13, padding: "9px 20px", textDecoration: "none" }}>
              Subscribe →
            </Link>
          )}
        </Section>

        {/* Members */}
        <Section title="Household Members">
          <div style={{ marginBottom: 8 }}>
            <MemberRow email={user.email ?? "You"} role="owner (you)" />
            {Object.entries(memberEmails).map(([uid, email]) => (
              <MemberRow key={uid} email={email} role="member" />
            ))}
          </div>
          {hhDoc && hhDoc.members.length < 2 && isOwner && (
            <div style={{ fontSize: 12, color: TEXT_DIM, marginTop: 8 }}>
              Invite your partner to share this household workspace.
            </div>
          )}
        </Section>

        {/* Invite code */}
        {isOwner && (
          <Section title="Invite Partner">
            <div style={{ fontSize: 13, color: TEXT_DIM, marginBottom: 16, lineHeight: 1.5 }}>
              Generate a code and share it with your partner. They visit{" "}
              <code style={{ background: "rgba(255,255,255,0.08)", padding: "1px 5px", borderRadius: 4, fontSize: 12 }}>/join</code>{" "}
              and enter the code to access this household.
            </div>

            {hhDoc?.inviteCode && !inviteExpired ? (
              <>
                <div style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${BORDER}`, borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: 6, color: JADE }}>{hhDoc.inviteCode}</div>
                    <div style={{ fontSize: 11, color: TEXT_DIM, marginTop: 4 }}>Expires in {inviteHoursLeft}h</div>
                  </div>
                  <button
                    onClick={copyInviteLink}
                    style={{ background: copied ? `${JADE}22` : SURFACE, border: `1px solid ${copied ? JADE + "55" : BORDER}`, borderRadius: 8, color: copied ? JADE : TEXT_DIM, fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 12, padding: "8px 14px", cursor: "pointer" }}
                  >
                    {copied ? "Copied!" : "Copy link"}
                  </button>
                </div>
                <button onClick={revokeInvite} style={{ background: "transparent", border: "none", color: DANGER, fontSize: 12, cursor: "pointer", fontFamily: "'Montserrat',sans-serif", fontWeight: 600 }}>
                  Revoke code
                </button>
              </>
            ) : (
              <>
                {hhDoc?.inviteCode && inviteExpired && (
                  <div style={{ fontSize: 12, color: AMBER, marginBottom: 12 }}>Previous invite code expired.</div>
                )}
                <button
                  onClick={generateInvite}
                  disabled={generatingCode}
                  style={{ background: JADE, border: "none", borderRadius: 10, color: "#0a1a12", fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 13, padding: "11px 22px", cursor: "pointer", opacity: generatingCode ? 0.7 : 1 }}
                >
                  {generatingCode ? "Generating…" : "Generate Invite Code"}
                </button>
              </>
            )}
          </Section>
        )}

        {/* Display / Kiosk */}
        <Section title="Wall Display">
          <div style={{ fontSize: 13, color: TEXT_DIM, marginBottom: 16, lineHeight: 1.5 }}>
            Open the display view on a wall-mounted tablet for a full-screen household overview.
          </div>
          <a
            href="/display"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "inline-block", background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, color: TEXT, fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 13, padding: "11px 22px", textDecoration: "none" }}
          >
            Open Display Mode ↗
          </a>
        </Section>

      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "24px", marginBottom: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: TEXT_DIM, marginBottom: 16 }}>{title}</div>
      {children}
    </div>
  );
}

function StatusRow({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 10 }}>
      <span style={{ fontSize: 13, color: TEXT_DIM }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: accent }}>{value}</span>
    </div>
  );
}

function MemberRow({ email, role }: { email: string; role: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: `1px solid ${BORDER}` }}>
      <span style={{ fontSize: 13, color: TEXT }}>{email}</span>
      <span style={{ fontSize: 11, color: TEXT_DIM, fontWeight: 600 }}>{role}</span>
    </div>
  );
}
