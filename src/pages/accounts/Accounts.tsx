import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../../firebase";
import StarField from "../../components/StarField";
import { Icon, IconName } from "../../components/Icon";
import { useHouseholdUid } from "../../household";

// ── Types (mirrors finance/shared.tsx) ─────────────────────────────────────

type AccountRole = "fixedExpenses" | "dailySpending" | "emergencySavings" | "sinkingFunds";

interface BankAccount {
  id: string;
  name: string;
  nickname?: string;
  lastFour?: string;
  url?: string;
  tag?: "personal" | "business";
  ignored?: boolean;
}

interface AccountMappings {
  fixedExpenses?: string[];
  dailySpending?: string[];
  emergencySavings?: string[];
  sinkingFunds?: string[];
}

interface FinancePlan {
  bankAccounts?: BankAccount[];
  accountMappings?: AccountMappings;
  [key: string]: unknown;
}

function normalizeIds(v: string | string[] | undefined): string[] {
  if (!v) return [];
  if (typeof v === "string") return [v];
  return v;
}

// ── Constants ─────────────────────────────────────────────────────────────

const BG        = "var(--bg)";
const SURFACE   = "var(--surface)";
const SURFACE_HI = "var(--surface-hi)";
const BORDER    = "var(--border)";
const TEXT      = "var(--text)";
const TEXT_DIM  = "var(--text-dim)";
const TEXT_MUTED = "var(--text-muted)";
const JADE      = "#5db88a";
const PURPLE    = "#9b7fe8";
const TEAL      = "#46b6ad";
const PINK      = "#e070a8";
const AMBER     = "#d4a45b";
const DANGER    = "#c0566a";

// Each budget role gets its own distinct hue. Savings roles read green-family
// (emergency = green, sinking = teal) so savings is recognizably green.
const ROLE_CONFIG: { role: AccountRole; label: string; color: string; icon: IconName }[] = [
  { role: "fixedExpenses",    label: "Fixed Expenses",    color: PURPLE, icon: "list" },
  { role: "emergencySavings", label: "Emergency Savings", color: JADE,   icon: "shield" },
  { role: "sinkingFunds",     label: "Sinking Funds",     color: TEAL,   icon: "droplet" },
  { role: "dailySpending",    label: "Daily Spending",    color: PINK,   icon: "card" },
];

// Tags use their own colors, distinct from the role hues above.
const TAG_COLOR: Record<"personal" | "business", string> = { personal: JADE, business: AMBER };

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

function displayName(a: BankAccount): string {
  const base = a.nickname || a.name;
  return a.lastFour ? `${base} ••${a.lastFour}` : base;
}

function useIsMobile(maxWidth = 600): boolean {
  const query = `(max-width: ${maxWidth}px)`;
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false,
  );
  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = () => setIsMobile(mql.matches);
    handler();
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);
  return isMobile;
}

// ── Shared primitives ─────────────────────────────────────────────────────

function InlineInput({ label, value, onChange, placeholder = "" }: {
  label: string; value: string; onChange?: (v: string) => void; placeholder?: string;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: TEXT_DIM, letterSpacing: 1, textTransform: "uppercase" }}>{label}</span>
      <input
        type="text" value={value}
        onChange={e => onChange?.(e.target.value)} placeholder={placeholder}
        style={{
          background: "rgba(0,0,0,0.25)", border: `1px solid ${BORDER}`,
          borderRadius: 8, padding: "8px 10px", color: TEXT,
          fontSize: 13, fontFamily: "'Montserrat',sans-serif", outline: "none",
          width: "100%", boxSizing: "border-box",
        }}
        onFocus={e => { e.target.style.borderColor = JADE + "80"; }}
        onBlur={e  => { e.target.style.borderColor = BORDER; }}
      />
    </label>
  );
}

function Pill({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", color, background: `${color}18`, border: `1px solid ${color}30`, borderRadius: 20, padding: "2px 8px", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 4 }}>
      {children}
    </span>
  );
}

// ── Account details + role mapping modal ───────────────────────────────────

function AccountModal({ account, mappings, onSave, onDelete, onClose }: {
  account: BankAccount | null; // null = creating a new institution
  mappings: AccountMappings;
  onSave: (account: BankAccount, roles: Set<AccountRole>) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const isMobile = useIsMobile();
  const [id] = useState(account?.id ?? uid());
  const [name, setName] = useState(account?.name ?? "");
  const [lastFour, setLastFour] = useState(account?.lastFour ?? "");
  const [url, setUrl] = useState(account?.url ?? "");
  const [tag, setTag] = useState<"personal" | "business">(account?.tag ?? "personal");
  const [ignored, setIgnored] = useState(account?.ignored ?? false);
  const [roles, setRoles] = useState<Set<AccountRole>>(() => {
    const s = new Set<AccountRole>();
    if (account) for (const rc of ROLE_CONFIG) if (normalizeIds(mappings[rc.role]).includes(account.id)) s.add(rc.role);
    return s;
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  function toggleRole(role: AccountRole) {
    setRoles(prev => {
      const next = new Set(prev);
      if (next.has(role)) next.delete(role); else next.add(role);
      return next;
    });
  }

  function handleSave() {
    if (!name.trim()) return;
    const a: BankAccount = { id, name: name.trim(), tag };
    if (lastFour.trim()) a.lastFour = lastFour.trim();
    if (url.trim())      a.url      = url.trim();
    if (ignored)         a.ignored  = true;
    onSave(a, roles);
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(3,5,15,0.72)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: isMobile ? "flex-end" : "center", justifyContent: "center",
        padding: isMobile ? 0 : 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#0b0f22", border: `1px solid ${BORDER}`,
          borderRadius: isMobile ? "20px 20px 0 0" : 18,
          width: "100%", maxWidth: 480, maxHeight: isMobile ? "92vh" : "88vh",
          overflowY: "auto", boxShadow: "0 12px 48px rgba(0,0,0,0.6)",
          fontFamily: "'Montserrat',sans-serif",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: `1px solid ${BORDER}`, position: "sticky", top: 0, background: "#0b0f22", zIndex: 1 }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: TEXT }}>{account ? "Edit Institution" : "New Institution"}</span>
          <button onClick={onClose} aria-label="Close"
            style={{ background: "transparent", border: "none", color: TEXT_DIM, fontSize: 22, lineHeight: 1, cursor: "pointer", padding: "0 4px", fontFamily: "inherit" }}>×</button>
        </div>

        <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Details */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 110px", gap: 10 }}>
              <InlineInput label="Institution name" value={name} onChange={setName} placeholder="e.g. SoFi" />
              <InlineInput label="Last 4 (optional)" value={lastFour} onChange={setLastFour} placeholder="1234" />
            </div>
            <InlineInput label="Website URL (optional)" value={url} onChange={setUrl} placeholder="https://..." />
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: TEXT_DIM, letterSpacing: 1, textTransform: "uppercase" }}>Tag</span>
              <select value={tag} onChange={e => setTag(e.target.value as "personal" | "business")}
                style={{ background: "rgba(0,0,0,0.25)", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "8px 10px", color: TEXT, fontSize: 13, fontFamily: "'Montserrat',sans-serif", outline: "none" }}>
                <option value="personal">Personal</option>
                <option value="business">Business</option>
              </select>
            </label>
          </div>

          {/* Budget roles */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: TEXT_DIM, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>
              Budget roles
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {ROLE_CONFIG.map(rc => {
                const active = roles.has(rc.role);
                return (
                  <button key={rc.role} onClick={() => toggleRole(rc.role)}
                    style={{
                      display: "flex", alignItems: "center", gap: 11, width: "100%", textAlign: "left",
                      padding: "11px 12px", borderRadius: 10, cursor: "pointer",
                      background: active ? `${rc.color}1a` : "transparent",
                      border: `1px solid ${active ? rc.color + "66" : BORDER}`,
                      fontFamily: "'Montserrat',sans-serif", transition: "all 0.12s",
                    }}>
                    <span style={{ display: "flex", color: active ? rc.color : TEXT_DIM }}><Icon name={rc.icon} size={18} /></span>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: active ? rc.color : TEXT }}>{rc.label}</span>
                    <span style={{
                      width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                      border: `1.5px solid ${active ? rc.color : "var(--border-hi)"}`,
                      background: active ? rc.color : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {active && <span style={{ color: "#06091a", fontSize: 13, fontWeight: 800, lineHeight: 1 }}>✓</span>}
                    </span>
                  </button>
                );
              })}
            </div>
            <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 8 }}>
              Roles decide where the planner pulls each account for needs, savings, and spending.
            </div>
          </div>

          {/* Ignore */}
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
            <input type="checkbox" checked={ignored} onChange={e => setIgnored(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: DANGER, cursor: "pointer" }} />
            <span style={{ fontSize: 13, color: ignored ? DANGER : TEXT_DIM, fontWeight: 600 }}>
              Ignore this account
              <span style={{ fontSize: 11, fontWeight: 400, marginLeft: 6, color: TEXT_MUTED }}>(hides from role mappings and quick links)</span>
            </span>
          </label>
        </div>

        {/* Footer actions */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderTop: `1px solid ${BORDER}`, position: "sticky", bottom: 0, background: "#0b0f22" }}>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleSave} style={{ background: JADE, border: "none", borderRadius: 8, color: "#06091a", fontFamily: "'Montserrat',sans-serif", fontWeight: 800, fontSize: 13, padding: "9px 20px", cursor: "pointer" }}>Save</button>
            <button onClick={onClose} style={{ background: "transparent", border: `1px solid ${BORDER}`, borderRadius: 8, color: TEXT_DIM, fontFamily: "'Montserrat',sans-serif", fontSize: 13, fontWeight: 700, padding: "9px 16px", cursor: "pointer" }}>Cancel</button>
          </div>
          {onDelete && (
            <button onClick={onDelete} style={{ background: "transparent", border: "none", color: DANGER, fontSize: 12, cursor: "pointer", fontFamily: "'Montserrat',sans-serif" }}>Remove</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

export default function Accounts() {
  const uid = useHouseholdUid();
  const [plan, setPlan] = useState<FinancePlan>({ bankAccounts: [], accountMappings: {} });
  // modal === null → closed; { account: null } → adding; { account } → editing
  const [modal, setModal] = useState<{ account: BankAccount | null } | null>(null);

  useEffect(() => {
    return onSnapshot(doc(db, "users", uid, "finance", "plan"), snap => {
      if (snap.exists()) setPlan(snap.data() as FinancePlan);
    }, err => console.error("Accounts load failed:", err));
  }, [uid]);

  const accounts = plan.bankAccounts    ?? [];
  const mappings = plan.accountMappings ?? {};

  const save = useCallback((next: FinancePlan) => {
    setPlan(next);
    setDoc(doc(db, "users", uid, "finance", "plan"), next).catch(console.error);
  }, [uid]);

  // Persist an account plus its role membership in one write.
  function saveAccount(account: BankAccount, roles: Set<AccountRole>) {
    const exists = accounts.some(a => a.id === account.id);
    const nextAccounts = exists
      ? accounts.map(a => (a.id === account.id ? account : a))
      : [...accounts, account];

    const nextMappings: AccountMappings = { ...mappings };
    for (const rc of ROLE_CONFIG) {
      const without = normalizeIds(nextMappings[rc.role]).filter(id => id !== account.id);
      const ids = roles.has(rc.role) ? [...without, account.id] : without;
      if (ids.length === 0) delete nextMappings[rc.role];
      else nextMappings[rc.role] = ids;
    }

    save({ ...plan, bankAccounts: nextAccounts, accountMappings: nextMappings });
    setModal(null);
  }

  function removeAccount(id: string) {
    const next = accounts.filter(a => a.id !== id);
    const nextMappings = { ...mappings };
    for (const role of Object.keys(nextMappings) as AccountRole[]) {
      const filtered = normalizeIds(nextMappings[role]).filter(mid => mid !== id);
      if (filtered.length === 0) delete nextMappings[role];
      else nextMappings[role] = filtered;
    }
    save({ ...plan, bankAccounts: next, accountMappings: nextMappings });
    setModal(null);
  }

  const unmappedRoles = ROLE_CONFIG.filter(r => normalizeIds(mappings[r.role]).length === 0);

  return (
    <div style={{ background: BG, minHeight: "100vh", fontFamily: "'Montserrat',sans-serif", color: TEXT }}>
      <StarField />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 760, margin: "0 auto", padding: "24px 20px 64px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
          <Link to="/finance" style={{ textDecoration: "none", color: TEXT_DIM, fontSize: 13, fontWeight: 600, opacity: 0.7, transition: "opacity 0.15s" }}
            onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.opacity = "1"}
            onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.opacity = "0.7"}>
            ← Planner
          </Link>
          <div style={{ width: 1, height: 14, background: "var(--border)" }} />
          <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 800, color: TEXT, letterSpacing: -0.3 }}>
            <Icon name="bank" size={17} color={TEXT_DIM} /> Accounts
          </span>
        </div>

        {/* Accounts */}
        <section>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: TEXT_DIM, letterSpacing: 1.2, textTransform: "uppercase" }}>
              Financial Institutions
            </div>
            <div style={{ fontSize: 11, color: TEXT_MUTED }}>Tap to edit details &amp; budget roles</div>
          </div>

          {unmappedRoles.length > 0 && accounts.length > 0 && (
            <div style={{ fontSize: 12, color: AMBER, fontWeight: 600, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
              ⚠️ {unmappedRoles.map(r => r.label).join(", ")} {unmappedRoles.length === 1 ? "is" : "are"} not mapped to any account yet.
            </div>
          )}

          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden" }}>
            {accounts.length === 0 && (
              <div style={{ color: TEXT_MUTED, fontSize: 13, fontStyle: "italic", textAlign: "center", padding: "24px 20px" }}>
                Add your banks and credit cards to get started.
              </div>
            )}

            {accounts.map(a => (
              <div key={a.id}
                onClick={() => setModal({ account: a })}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: `1px solid ${BORDER}`, cursor: "pointer", transition: "background 0.1s", opacity: a.ignored ? 0.45 : 1, gap: 12 }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = SURFACE_HI}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>{displayName(a)}</div>
                  {a.url && <div style={{ fontSize: 11, color: TEXT_DIM, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.url}</div>}
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                  {a.ignored && <Pill color={DANGER}>ignored</Pill>}
                  {a.tag && <Pill color={TAG_COLOR[a.tag]}>{a.tag}</Pill>}
                  {ROLE_CONFIG.filter(r => normalizeIds(mappings[r.role]).includes(a.id)).map(r => (
                    <Pill key={r.role} color={r.color}><Icon name={r.icon} size={11} /> {r.label}</Pill>
                  ))}
                </div>
              </div>
            ))}

            <button onClick={() => setModal({ account: null })}
              style={{ margin: 16, background: "transparent", border: `1px dashed ${BORDER}`, borderRadius: 10, color: JADE, fontSize: 12, fontWeight: 700, padding: "9px 0", cursor: "pointer", fontFamily: "'Montserrat',sans-serif", display: "block", width: "calc(100% - 32px)" }}>
              + Add Account
            </button>
          </div>
        </section>
      </div>

      {modal && (
        <AccountModal
          account={modal.account}
          mappings={mappings}
          onSave={saveAccount}
          onDelete={modal.account ? () => removeAccount(modal.account!.id) : undefined}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
