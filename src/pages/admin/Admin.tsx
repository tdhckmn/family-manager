import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  collection, getDocs, doc, setDoc, addDoc, deleteDoc,
  onSnapshot, query, orderBy,
} from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../auth";
import { isOwnerEmail, type Subscription, isSubActive, trialDaysLeft } from "../../subscription";
import { Icon } from "../../components/Icon";
import StarField from "../../components/StarField";
import { Panel, BG, SURFACE, BORDER, BORDER_HI, TEXT, TEXT_DIM, TEXT_MUTED, JADE, DANGER, YELLOW, FONT, INK } from "../shared/kit";

const AMBER = "#d4a45b";

// ── Types ───────────────────────────────────────────────────────────────────

interface RegistryEntry {
  uid: string;
  email: string;
  displayName: string;
  lastSeen: string;
  createdAt?: string;
}

interface UserSub {
  uid: string;
  sub: Subscription | null;
}

interface Coupon {
  id: string;
  active: boolean;
  plan?: "monthly" | "yearly";
  createdAt: string;
  expiresAt?: string;
  usedBy?: string;
  usedAt?: string;
  note?: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function subBadge(sub: Subscription | null): { label: string; color: string } {
  if (!sub) return { label: "No subscription", color: TEXT_MUTED };
  if (sub.override) return { label: "Override ✓", color: JADE };
  if (sub.status === "active") return { label: "Active", color: JADE };
  if (sub.status === "trialing") {
    const d = trialDaysLeft(sub);
    return d > 0
      ? { label: `Trial (${d}d left)`, color: YELLOW }
      : { label: "Trial expired", color: DANGER };
  }
  if (sub.status === "canceled") return { label: "Canceled", color: DANGER };
  if (sub.status === "past_due") return { label: "Past due", color: DANGER };
  return { label: sub.status, color: TEXT_MUTED };
}

function futureDateISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

function generateCouponCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

// ── Main component ───────────────────────────────────────────────────────────

export default function Admin() {
  const user = useAuth();

  if (!isOwnerEmail(user.email)) {
    return (
      <div style={{ background: BG, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT, color: TEXT }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🚫</div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Admin access only</div>
          <Link to="/" style={{ display: "inline-block", marginTop: 16, color: JADE, textDecoration: "none", fontSize: 13 }}>← Back home</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: BG, minHeight: "100vh", fontFamily: FONT, color: TEXT, position: "relative" }}>
      <StarField />
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: 12 }}>
          <Link to="/" style={{ textDecoration: "none", color: TEXT_DIM, fontSize: 13, fontWeight: 600, opacity: 0.7 }}>← Home</Link>
          <div style={{ width: 1, height: 14, background: BORDER }} />
          <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: 1.2, textTransform: "uppercase" }}>Admin</span>
          <span style={{ marginLeft: "auto", fontSize: 11, color: TEXT_MUTED }}>{user.email}</span>
        </div>

        <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 20px 80px", display: "flex", flexDirection: "column", gap: 24, boxSizing: "border-box", width: "100%" }}>
          <UsersPanel />
          <CouponsPanel />
          <AllowlistNote />
        </div>
      </div>
    </div>
  );
}

// ── Users panel ─────────────────────────────────────────────────────────────

function UsersPanel() {
  const [users, setUsers] = useState<RegistryEntry[]>([]);
  const [subs, setSubs] = useState<Record<string, Subscription | null>>({});
  const [loading, setLoading] = useState(true);
  const [expandedUid, setExpandedUid] = useState<string | null>(null);
  const [savingUid, setSavingUid] = useState<string | null>(null);

  useEffect(() => {
    getDocs(collection(db, "registry"))
      .then(snap => {
        const entries = snap.docs.map(d => d.data() as RegistryEntry);
        entries.sort((a, b) => (b.lastSeen || "").localeCompare(a.lastSeen || ""));
        setUsers(entries);
        setLoading(false);
        // Load subs for each user
        entries.forEach(u => {
          onSnapshot(doc(db, "users", u.uid, "sub", "info"), snap2 => {
            setSubs(prev => ({ ...prev, [u.uid]: snap2.exists() ? (snap2.data() as Subscription) : null }));
          });
        });
      })
      .catch(() => setLoading(false));
  }, []);

  async function applyOverride(uid: string, active: boolean, plan: "monthly" | "yearly", months: number) {
    setSavingUid(uid);
    try {
      const subData: Subscription = {
        status: active ? "override" : "canceled",
        override: active,
        overrideReason: "admin",
        plan,
        currentPeriodEnd: active ? futureDateISO(months * 30) : todayISO(),
        createdAt: todayISO(),
      };
      await setDoc(doc(db, "users", uid, "sub", "info"), subData);
    } finally {
      setSavingUid(null);
    }
  }

  return (
    <Panel title="Users" icon={<Icon name="shield" size={15} />} accent={JADE}>
      {loading ? (
        <div style={{ fontSize: 13, color: TEXT_MUTED, padding: "8px 0" }}>Loading users…</div>
      ) : users.length === 0 ? (
        <div style={{ fontSize: 13, color: TEXT_MUTED }}>No registered users yet. Users appear here after their first sign-in.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {users.map(u => {
            const sub = subs[u.uid] ?? null;
            const badge = subBadge(sub);
            const expanded = expandedUid === u.uid;
            return (
              <div key={u.uid} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, overflow: "hidden" }}>
                {/* Row */}
                <button
                  onClick={() => setExpandedUid(expanded ? null : u.uid)}
                  style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "12px 14px", background: "none", border: "none", cursor: "pointer", fontFamily: FONT, textAlign: "left" }}>
                  <div style={{ width: 34, height: 34, borderRadius: "50%", background: `${JADE}22`, border: `1px solid ${JADE}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: JADE, flexShrink: 0 }}>
                    {(u.displayName || u.email || "?").charAt(0).toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.displayName || u.email}</div>
                    <div style={{ fontSize: 11, color: TEXT_MUTED }}>{u.email}</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: badge.color, flexShrink: 0, marginRight: 8 }}>{badge.label}</span>
                  <Icon name="chevronDown" size={14} color={TEXT_MUTED} style={{ flexShrink: 0, transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
                </button>

                {/* Expanded override controls */}
                {expanded && (
                  <div style={{ padding: "0 14px 14px", borderTop: `1px solid ${BORDER}` }}>
                    <div style={{ paddingTop: 12, fontSize: 12, color: TEXT_DIM, marginBottom: 10 }}>
                      UID: <span style={{ fontFamily: "monospace", color: TEXT_MUTED, fontSize: 11 }}>{u.uid}</span>
                    </div>
                    {sub && (
                      <div style={{ fontSize: 12, color: TEXT_DIM, marginBottom: 12, display: "flex", gap: 16, flexWrap: "wrap" }}>
                        {sub.plan && <span>Plan: <strong style={{ color: TEXT }}>{sub.plan}</strong></span>}
                        {sub.currentPeriodEnd && <span>Expires: <strong style={{ color: TEXT }}>{sub.currentPeriodEnd}</strong></span>}
                        {sub.couponCode && <span>Coupon: <strong style={{ color: TEXT }}>{sub.couponCode}</strong></span>}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <OverrideBtn label="Grant 1 month" color={JADE} disabled={savingUid === u.uid}
                        onClick={() => applyOverride(u.uid, true, "monthly", 1)} />
                      <OverrideBtn label="Grant 1 year" color={JADE} disabled={savingUid === u.uid}
                        onClick={() => applyOverride(u.uid, true, "yearly", 12)} />
                      <OverrideBtn label="Grant lifetime" color={AMBER} disabled={savingUid === u.uid}
                        onClick={() => applyOverride(u.uid, true, "yearly", 1200)} />
                      <OverrideBtn label="Revoke access" color={DANGER} disabled={savingUid === u.uid}
                        onClick={() => applyOverride(u.uid, false, "monthly", 0)} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

function OverrideBtn({ label, color, onClick, disabled }: { label: string; color: string; onClick: () => void; disabled: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{
        padding: "7px 14px", borderRadius: 7, border: `1px solid ${color}50`,
        background: `${color}15`, color, fontFamily: FONT, fontWeight: 700,
        fontSize: 12, cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.5 : 1,
      }}>
      {label}
    </button>
  );
}

// ── Coupons panel ────────────────────────────────────────────────────────────

function CouponsPanel() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [newPlan, setNewPlan] = useState<"monthly" | "yearly">("monthly");

  useEffect(() => {
    return onSnapshot(collection(db, "coupons"), snap => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as Coupon));
      items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setCoupons(items);
      setLoading(false);
    });
  }, []);

  async function createCoupon() {
    const code = generateCouponCode();
    setCreating(true);
    try {
      await setDoc(doc(db, "coupons", code), {
        active: true,
        plan: newPlan,
        createdAt: todayISO(),
        note: newNote.trim() || null,
      });
      setNewNote("");
    } finally {
      setCreating(false);
    }
  }

  async function deactivateCoupon(code: string) {
    await setDoc(doc(db, "coupons", code), { active: false }, { merge: true });
  }

  const inputStyle: React.CSSProperties = {
    background: "var(--input-bg)", border: `1px solid ${BORDER}`,
    borderRadius: 8, color: TEXT, fontFamily: FONT, fontSize: 13,
    padding: "8px 12px", outline: "none",
  };

  return (
    <Panel title="Coupon Codes" icon={<Icon name="sparkles" size={15} />} accent={YELLOW}>
      {/* Create form */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <select value={newPlan} onChange={e => setNewPlan(e.target.value as "monthly" | "yearly")}
          style={{ ...inputStyle, width: 110 }}>
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
        </select>
        <input value={newNote} onChange={e => setNewNote(e.target.value)}
          placeholder="Note (e.g. beta friend)"
          style={{ ...inputStyle, flex: 1, minWidth: 140 }} />
        <button onClick={createCoupon} disabled={creating}
          style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: YELLOW, color: INK, fontFamily: FONT, fontWeight: 800, fontSize: 13, cursor: creating ? "default" : "pointer", opacity: creating ? 0.6 : 1 }}>
          Generate
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ fontSize: 13, color: TEXT_MUTED }}>Loading…</div>
      ) : coupons.length === 0 ? (
        <div style={{ fontSize: 13, color: TEXT_MUTED }}>No coupons yet.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {coupons.map(c => (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10 }}>
              <span style={{ fontFamily: "monospace", fontSize: 14, fontWeight: 800, letterSpacing: 1.5, color: c.active ? TEXT : TEXT_MUTED, flex: 1 }}>{c.id}</span>
              <span style={{ fontSize: 11, color: c.active ? (c.plan === "yearly" ? YELLOW : JADE) : TEXT_MUTED, fontWeight: 700 }}>
                {c.active ? c.plan : "used"}
              </span>
              {c.note && <span style={{ fontSize: 11, color: TEXT_MUTED }}>{c.note}</span>}
              {c.usedBy && <span style={{ fontSize: 11, color: TEXT_MUTED }}>→ {c.usedBy.slice(0, 8)}…</span>}
              {c.active && (
                <button onClick={() => deactivateCoupon(c.id)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: DANGER, padding: "2px 4px", fontSize: 12, fontWeight: 700, fontFamily: FONT }}>
                  Deactivate
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

// ── Allowlist note ────────────────────────────────────────────────────────────

function AllowlistNote() {
  return (
    <Panel title="Beta Allowlist" icon={<Icon name="list" size={15} />} accent={AMBER}>
      <p style={{ fontSize: 13, color: TEXT_DIM, lineHeight: 1.65, margin: "0 0 10px" }}>
        The beta allowlist is enforced in two places that must stay in sync when adding a new user:
      </p>
      <ol style={{ fontSize: 13, color: TEXT_DIM, lineHeight: 1.8, paddingLeft: 20, margin: "0 0 10px" }}>
        <li>
          <strong style={{ color: TEXT }}>ALLOWED_EMAILS</strong> in{" "}
          <code style={{ fontSize: 12, background: "rgba(255,255,255,0.08)", borderRadius: 4, padding: "1px 5px" }}>src/components/AuthGate.tsx</code>{" "}
          — gates the UI
        </li>
        <li>
          <strong style={{ color: TEXT }}>allowedEmails()</strong> in{" "}
          <code style={{ fontSize: 12, background: "rgba(255,255,255,0.08)", borderRadius: 4, padding: "1px 5px" }}>firestore.rules</code>{" "}
          — real security enforcement
        </li>
      </ol>
      <p style={{ fontSize: 12, color: TEXT_MUTED, margin: 0 }}>
        After editing both files, run <code style={{ fontSize: 11, background: "rgba(255,255,255,0.08)", borderRadius: 3, padding: "1px 4px" }}>npm run deploy</code> to push rules to Firebase.
      </p>
    </Panel>
  );
}
