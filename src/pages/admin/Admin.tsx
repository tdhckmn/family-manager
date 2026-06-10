import { useState, useEffect } from "react";
import { Link, Navigate } from "react-router-dom";
import { collection, onSnapshot, doc, updateDoc, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../auth";
import StarField from "../../components/StarField";

const OWNER_EMAIL = "thomasdhickman@gmail.com";

const BG = "#06091a";
const TEXT = "#dedad0";
const TEXT_DIM = "#7a7890";
const JADE = "#5db88a";
const DANGER = "#c0566a";
const AMBER = "#e0a435";
const PURPLE = "#a78bfa";
const SURFACE = "rgba(255,255,255,0.04)";
const BORDER = "rgba(255,255,255,0.08)";

interface Registration {
  uid: string;
  email: string;
  createdAt: string;
  subStatus: string;
}

interface SubDoc {
  status: string;
  trialEndsAt?: string;
  currentPeriodEnd?: string;
  override?: { active: boolean; reason?: string; expiresAt?: string | null };
  stripeCustomerId?: string;
}

export default function Admin() {
  const user = useAuth();
  const isOwner = user.email?.toLowerCase() === OWNER_EMAIL;

  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [selected, setSelected] = useState<Registration | null>(null);
  const [subDoc, setSubDoc] = useState<SubDoc | null>(null);
  const [saving, setSaving] = useState(false);
  const [overrideReason, setOverrideReason] = useState("gifted");

  useEffect(() => {
    if (!isOwner) return;
    return onSnapshot(collection(db, "registrations"), snap => {
      const rows = snap.docs.map(d => ({ uid: d.id, ...d.data() } as Registration));
      rows.sort((a, b) => b.createdAt?.localeCompare(a.createdAt ?? "") ?? 0);
      setRegistrations(rows);
    });
  }, [isOwner]);

  useEffect(() => {
    if (!selected) { setSubDoc(null); return; }
    return onSnapshot(doc(db, "users", selected.uid, "subscription"), snap => {
      setSubDoc(snap.exists() ? (snap.data() as SubDoc) : null);
    });
  }, [selected?.uid]);

  if (!isOwner) return <Navigate to="/home" replace />;

  async function grantOverride() {
    if (!selected) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", selected.uid, "subscription"), {
        "override.active": true,
        "override.reason": overrideReason,
        "override.expiresAt": null,
      });
    } finally { setSaving(false); }
  }

  async function revokeOverride() {
    if (!selected) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", selected.uid, "subscription"), {
        "override.active": false,
      });
    } finally { setSaving(false); }
  }

  const activeCount = registrations.filter(r => r.subStatus === "active" || r.subStatus === "trialing").length;
  const mrr = registrations.filter(r => r.subStatus === "active").length * 4;

  return (
    <div style={{ background: BG, minHeight: "100vh", fontFamily: "'Montserrat', sans-serif", color: TEXT, padding: "40px 20px 80px", position: "relative" }}>
      <StarField />
      <div style={{ position: "relative", zIndex: 5, maxWidth: 900, margin: "0 auto" }}>

        <div style={{ marginBottom: 28, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link to="/home" style={{ color: TEXT_DIM, fontSize: 12, textDecoration: "none", fontWeight: 600 }}>← Back to home</Link>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: AMBER }}>Admin Panel</div>
        </div>

        <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 24px", letterSpacing: -0.3 }}>Subscription Management</h1>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 28 }}>
          <StatCard label="Total Users" value={registrations.length} />
          <StatCard label="Active / Trial" value={activeCount} accent={JADE} />
          <StatCard label="Est. MRR" value={`$${mrr}`} accent={PURPLE} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 1fr" : "1fr", gap: 16 }}>
          {/* User list */}
          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${BORDER}`, fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: TEXT_DIM }}>
              All Users ({registrations.length})
            </div>
            <div style={{ maxHeight: 480, overflowY: "auto" }}>
              {registrations.length === 0 && (
                <div style={{ padding: 20, fontSize: 13, color: TEXT_DIM }}>No users yet.</div>
              )}
              {registrations.map(reg => (
                <div
                  key={reg.uid}
                  onClick={() => setSelected(selected?.uid === reg.uid ? null : reg)}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", borderBottom: `1px solid ${BORDER}`, cursor: "pointer", background: selected?.uid === reg.uid ? "rgba(255,255,255,0.06)" : "transparent", transition: "background 0.15s" }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{reg.email}</div>
                    <div style={{ fontSize: 11, color: TEXT_DIM, marginTop: 2 }}>
                      {reg.uid.substring(0, 12)}… · {reg.createdAt ? new Date(reg.createdAt).toLocaleDateString() : ""}
                    </div>
                  </div>
                  <SubBadge status={reg.subStatus} />
                </div>
              ))}
            </div>
          </div>

          {/* Detail panel */}
          {selected && (
            <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "24px" }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4, wordBreak: "break-all" }}>{selected.email}</div>
              <div style={{ fontSize: 11, color: TEXT_DIM, marginBottom: 20 }}>UID: {selected.uid}</div>

              {subDoc ? (
                <>
                  <Row label="Status" value={subDoc.status} />
                  {subDoc.trialEndsAt && <Row label="Trial ends" value={new Date(subDoc.trialEndsAt).toLocaleDateString()} />}
                  {subDoc.currentPeriodEnd && <Row label="Period ends" value={new Date(subDoc.currentPeriodEnd).toLocaleDateString()} />}
                  {subDoc.stripeCustomerId && <Row label="Stripe ID" value={subDoc.stripeCustomerId} />}

                  <div style={{ height: 1, background: BORDER, margin: "16px 0" }} />

                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: TEXT_DIM, marginBottom: 12 }}>Override Access</div>

                  {subDoc.override?.active ? (
                    <>
                      <div style={{ fontSize: 13, color: JADE, marginBottom: 12 }}>
                        ✓ Override active — reason: <strong>{subDoc.override.reason ?? "—"}</strong>
                      </div>
                      <button
                        onClick={revokeOverride}
                        disabled={saving}
                        style={{ background: `${DANGER}15`, border: `1px solid ${DANGER}44`, borderRadius: 8, color: DANGER, fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 12, padding: "8px 16px", cursor: "pointer", opacity: saving ? 0.7 : 1 }}
                      >
                        Revoke Override
                      </button>
                    </>
                  ) : (
                    <>
                      <select
                        value={overrideReason}
                        onChange={e => setOverrideReason(e.target.value)}
                        style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${BORDER}`, borderRadius: 8, color: TEXT, fontFamily: "'Montserrat',sans-serif", fontSize: 12, padding: "8px 12px", marginBottom: 10, width: "100%" }}
                      >
                        <option value="gifted">Gifted</option>
                        <option value="beta">Beta tester</option>
                        <option value="promo">Promo</option>
                        <option value="comp">Comp</option>
                      </select>
                      <button
                        onClick={grantOverride}
                        disabled={saving}
                        style={{ background: JADE, border: "none", borderRadius: 8, color: "#0a1a12", fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 12, padding: "9px 18px", cursor: "pointer", opacity: saving ? 0.7 : 1 }}
                      >
                        Grant Free Access
                      </button>
                    </>
                  )}
                </>
              ) : (
                <div style={{ fontSize: 13, color: TEXT_DIM }}>No subscription document found.</div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "18px 20px" }}>
      <div style={{ fontSize: 11, color: TEXT_DIM, fontWeight: 600, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: accent ?? TEXT }}>{value}</div>
    </div>
  );
}

function SubBadge({ status }: { status: string }) {
  const color = status === "active" ? JADE : status === "trialing" ? AMBER : DANGER;
  return (
    <span style={{ fontSize: 10, fontWeight: 700, color, background: color + "18", border: `1px solid ${color}44`, borderRadius: 6, padding: "3px 8px", textTransform: "uppercase", letterSpacing: 0.5 }}>
      {status}
    </span>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${BORDER}` }}>
      <span style={{ fontSize: 12, color: TEXT_DIM }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 600, maxWidth: "60%", textAlign: "right", wordBreak: "break-all" }}>{value}</span>
    </div>
  );
}
