import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../../firebase";

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

const BG        = "#06091a";
const SURFACE   = "rgba(255,255,255,0.04)";
const SURFACE_HI = "rgba(255,255,255,0.07)";
const BORDER    = "rgba(255,255,255,0.08)";
const TEXT      = "#dedad0";
const TEXT_DIM  = "#7a7890";
const TEXT_MUTED = "#3d3d52";
const JADE      = "#5db88a";
const BLUE      = "#5b8fd4";
const ORANGE    = "#e07a35";
const AMBER     = "#d4a45b";
const DANGER    = "#c0566a";

const ROLE_CONFIG: { role: AccountRole; label: string; color: string; icon: string }[] = [
  { role: "fixedExpenses",    label: "Fixed Expenses",    color: BLUE,      icon: "📋" },
  { role: "emergencySavings", label: "Emergency Savings",  color: BLUE,      icon: "🛡️" },
  { role: "sinkingFunds",     label: "Sinking Funds",     color: "#4a7fc1", icon: "🪣" },
  { role: "dailySpending",    label: "Daily Spending",    color: ORANGE,    icon: "💳" },
];

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

function displayName(a: BankAccount): string {
  const base = a.nickname || a.name;
  return a.lastFour ? `${base} ••${a.lastFour}` : base;
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
          fontSize: 13, fontFamily: "'Nunito',sans-serif", outline: "none",
          width: "100%", boxSizing: "border-box",
        }}
        onFocus={e => { e.target.style.borderColor = JADE + "80"; }}
        onBlur={e  => { e.target.style.borderColor = BORDER; }}
      />
    </label>
  );
}

function Pill({ color, children, onRemove }: { color: string; children: React.ReactNode; onRemove?: () => void }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", color, background: `${color}18`, border: `1px solid ${color}30`, borderRadius: 20, padding: "2px 8px", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 4 }}>
      {children}
      {onRemove && (
        <button onClick={e => { e.stopPropagation(); onRemove(); }}
          style={{ background: "none", border: "none", color, cursor: "pointer", padding: 0, lineHeight: 1, fontSize: 11, opacity: 0.7, fontFamily: "inherit" }}
          onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.opacity = "1"}
          onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.opacity = "0.7"}>
          ×
        </button>
      )}
    </span>
  );
}

// ── Role mapping chip row ─────────────────────────────────────────────────

function RoleMappingRow({
  role, label, color, icon, accounts, mappings,
  onAdd, onRemove,
}: {
  role: AccountRole; label: string; color: string; icon: string;
  accounts: BankAccount[]; mappings: AccountMappings;
  onAdd: (role: AccountRole, id: string) => void;
  onRemove: (role: AccountRole, id: string) => void;
}) {
  const mappedIds  = normalizeIds(mappings[role]);
  const mapped     = mappedIds.map(id => accounts.find(a => a.id === id)).filter((a): a is BankAccount => !!a);
  const available  = accounts.filter(a => !a.ignored && !mappedIds.includes(a.id));

  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "14px 20px", borderBottom: `1px solid ${BORDER}`, gap: 16, flexWrap: "wrap" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 160 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>{label}</div>
          {mapped.length === 0 && (
            <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 1 }}>Not mapped</div>
          )}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", flex: 1, justifyContent: "flex-end" }}>
        {mapped.map(a => (
          <Pill key={a.id} color={color} onRemove={() => onRemove(role, a.id)}>
            {displayName(a)}
          </Pill>
        ))}
        {available.length > 0 && (
          <select
            value=""
            onChange={e => { if (e.target.value) onAdd(role, e.target.value); }}
            style={{ background: "rgba(0,0,0,0.3)", border: `1px dashed ${BORDER}`, borderRadius: 8, padding: "4px 8px", color: TEXT_DIM, fontSize: 11, fontFamily: "'Nunito',sans-serif", outline: "none", cursor: "pointer" }}
          >
            <option value="">+ add…</option>
            {available.map(a => (
              <option key={a.id} value={a.id}>{displayName(a)}</option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}

// ── Account form ────────────────────────────────────────────────────────────

interface AccountDraft { id: string; name: string; lastFour: string; url: string; tag: "personal" | "business" }
const blankAcct = (): AccountDraft => ({ id: uid(), name: "", lastFour: "", url: "", tag: "personal" });

function AccountForm({ name, lastFour, url, tag, ignored, setName, setLastFour, setUrl, setTag, setIgnored, onSave, onCancel, onDelete }: {
  name: string; lastFour: string; url: string; tag: "personal" | "business"; ignored: boolean;
  setName: (v: string) => void; setLastFour: (v: string) => void;
  setUrl: (v: string) => void; setTag: (v: "personal" | "business") => void;
  setIgnored: (v: boolean) => void;
  onSave: () => void; onCancel: () => void; onDelete?: () => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 110px", gap: 10 }}>
        <InlineInput label="Institution name" value={name} onChange={setName} placeholder="e.g. SoFi" />
        <InlineInput label="Last 4 (optional)" value={lastFour} onChange={setLastFour} placeholder="1234" />
      </div>
      <InlineInput label="Website URL (optional)" value={url} onChange={setUrl} placeholder="https://..." />
      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: TEXT_DIM, letterSpacing: 1, textTransform: "uppercase" }}>Tag</span>
        <select value={tag} onChange={e => setTag(e.target.value as "personal" | "business")}
          style={{ background: "rgba(0,0,0,0.25)", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "8px 10px", color: TEXT, fontSize: 13, fontFamily: "'Nunito',sans-serif", outline: "none" }}>
          <option value="personal">Personal</option>
          <option value="business">Business</option>
        </select>
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
        <input type="checkbox" checked={ignored} onChange={e => setIgnored(e.target.checked)}
          style={{ width: 16, height: 16, accentColor: DANGER, cursor: "pointer" }} />
        <span style={{ fontSize: 13, color: ignored ? DANGER : TEXT_DIM, fontWeight: 600 }}>
          Ignore this account
          <span style={{ fontSize: 11, fontWeight: 400, marginLeft: 6, color: TEXT_MUTED }}>(hides from role mappings and quick links)</span>
        </span>
      </label>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onSave} style={{ background: JADE, border: "none", borderRadius: 8, color: "#06091a", fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 12, padding: "7px 18px", cursor: "pointer" }}>Save</button>
          <button onClick={onCancel} style={{ background: "transparent", border: `1px solid ${BORDER}`, borderRadius: 8, color: TEXT_DIM, fontFamily: "'Nunito',sans-serif", fontSize: 12, fontWeight: 700, padding: "7px 14px", cursor: "pointer" }}>Cancel</button>
        </div>
        {onDelete && (
          <button onClick={onDelete} style={{ background: "transparent", border: "none", color: DANGER, fontSize: 12, cursor: "pointer", fontFamily: "'Nunito',sans-serif" }}>Remove account</button>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

export default function Accounts() {
  const [plan, setPlan]                 = useState<FinancePlan>({ bankAccounts: [], accountMappings: {} });
  const [editId, setEditId]             = useState<string | null>(null);
  const [adding, setAdding]             = useState(false);
  const [draft, setDraft]               = useState<AccountDraft>(blankAcct());
  const [draftName, setDraftName]       = useState("");
  const [draftLast, setDraftLast]       = useState("");
  const [draftUrl, setDraftUrl]         = useState("");
  const [draftTag, setDraftTag]         = useState<"personal" | "business">("personal");
  const [draftIgnored, setDraftIgnored] = useState(false);

  useEffect(() => {
    return onSnapshot(doc(db, "finance", "plan"), snap => {
      if (snap.exists()) setPlan(snap.data() as FinancePlan);
    }, () => {});
  }, []);

  const accounts = plan.bankAccounts    ?? [];
  const mappings = plan.accountMappings ?? {};

  const save = useCallback((next: FinancePlan) => {
    setPlan(next);
    setDoc(doc(db, "finance", "plan"), next).catch(console.error);
  }, []);

  // ── Role mapping helpers ──────────────────────────────────────────────

  function addMapping(role: AccountRole, accountId: string) {
    const cur = normalizeIds(mappings[role]);
    if (cur.includes(accountId)) return;
    const next = { ...mappings };
    next[role] = [...cur, accountId];
    save({ ...plan, accountMappings: next });
  }

  function removeMapping(role: AccountRole, accountId: string) {
    const filtered = normalizeIds(mappings[role]).filter(id => id !== accountId);
    const next = { ...mappings };
    if (filtered.length === 0) delete next[role];
    else next[role] = filtered;
    save({ ...plan, accountMappings: next });
  }

  // ── Account helpers ───────────────────────────────────────────────────

  function openAdd() {
    const d = blankAcct();
    setDraft(d); setDraftName(""); setDraftLast(""); setDraftUrl(""); setDraftTag("personal"); setDraftIgnored(false);
    setAdding(true); setEditId(null);
  }

  function openEdit(a: BankAccount) {
    setDraft({ id: a.id, name: a.name, lastFour: a.lastFour ?? "", url: a.url ?? "", tag: a.tag ?? "personal" });
    setDraftName(a.name); setDraftLast(a.lastFour ?? ""); setDraftUrl(a.url ?? ""); setDraftTag(a.tag ?? "personal"); setDraftIgnored(a.ignored ?? false);
    setEditId(a.id); setAdding(false);
  }

  function buildAccount(): BankAccount {
    const a: BankAccount = { id: draft.id, name: draftName.trim(), tag: draftTag };
    if (draftLast.trim()) a.lastFour = draftLast.trim();
    if (draftUrl.trim())  a.url      = draftUrl.trim();
    if (draftIgnored)     a.ignored  = true;
    return a;
  }

  function commitAdd() {
    if (!draftName.trim()) return;
    save({ ...plan, bankAccounts: [...accounts, buildAccount()] });
    setAdding(false);
  }

  function commitEdit() {
    save({ ...plan, bankAccounts: accounts.map(a => a.id === draft.id ? buildAccount() : a) });
    setEditId(null);
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
    if (editId === id) setEditId(null);
  }

  const allAccountsForDropdown = accounts.filter(a => !a.ignored);
  const unmappedRoles = ROLE_CONFIG.filter(r => normalizeIds(mappings[r.role]).length === 0);

  return (
    <div style={{ background: BG, minHeight: "100vh", fontFamily: "'Nunito',sans-serif", color: TEXT }}>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, background: "radial-gradient(ellipse 55% 35% at 10% 0%, rgba(40,90,70,0.2) 0%, transparent 60%), radial-gradient(ellipse 40% 30% at 90% 100%, rgba(20,40,80,0.22) 0%, transparent 60%)" }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 760, margin: "0 auto", padding: "24px 20px 64px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 32 }}>
          <Link to="/finance" style={{ textDecoration: "none", color: TEXT_DIM, fontSize: 13, fontWeight: 600, opacity: 0.7, transition: "opacity 0.15s" }}
            onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.opacity = "1"}
            onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.opacity = "0.7"}>
            ← Planner
          </Link>
          <div style={{ width: 1, height: 14, background: "rgba(255,255,255,0.1)" }} />
          <span style={{ fontSize: 15, fontWeight: 800, color: TEXT, letterSpacing: -0.3 }}>🏦 Accounts</span>
        </div>

        {/* Accounts */}
        <section style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: TEXT_DIM, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 10 }}>
            Financial Institutions
          </div>

          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden" }}>
            {accounts.length === 0 && !adding && (
              <div style={{ color: TEXT_MUTED, fontSize: 13, fontStyle: "italic", textAlign: "center", padding: "24px 20px" }}>
                Add your banks and credit cards to get started.
              </div>
            )}

            {accounts.map(a => (
              <div key={a.id} style={{ opacity: a.ignored ? 0.45 : 1 }}>
                {editId === a.id ? (
                  <div style={{ padding: "18px 20px", borderBottom: `1px solid ${BORDER}` }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: JADE, marginBottom: 12 }}>Edit Account</div>
                    <AccountForm
                      name={draftName} lastFour={draftLast} url={draftUrl} tag={draftTag} ignored={draftIgnored}
                      setName={setDraftName} setLastFour={setDraftLast} setUrl={setDraftUrl} setTag={setDraftTag} setIgnored={setDraftIgnored}
                      onSave={commitEdit} onCancel={() => setEditId(null)} onDelete={() => removeAccount(a.id)}
                    />
                  </div>
                ) : (
                  <div
                    onClick={() => openEdit(a)}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: `1px solid ${BORDER}`, cursor: "pointer", transition: "background 0.1s" }}
                    onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = SURFACE_HI}
                    onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}
                  >
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>{displayName(a)}</div>
                      {a.url && <div style={{ fontSize: 11, color: TEXT_DIM, marginTop: 2 }}>{a.url}</div>}
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                      {a.ignored && <Pill color={DANGER}>ignored</Pill>}
                      {a.tag && <Pill color={a.tag === "business" ? AMBER : BLUE}>{a.tag}</Pill>}
                      {ROLE_CONFIG.filter(r => normalizeIds(mappings[r.role]).includes(a.id)).map(r => (
                        <Pill key={r.role} color={r.color}>{r.icon} {r.label}</Pill>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {adding && (
              <div style={{ padding: "18px 20px", borderTop: accounts.length > 0 ? `1px solid ${BORDER}` : "none" }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: JADE, marginBottom: 12 }}>New Account</div>
                <AccountForm
                  name={draftName} lastFour={draftLast} url={draftUrl} tag={draftTag} ignored={draftIgnored}
                  setName={setDraftName} setLastFour={setDraftLast} setUrl={setDraftUrl} setTag={setDraftTag} setIgnored={setDraftIgnored}
                  onSave={commitAdd} onCancel={() => setAdding(false)}
                />
              </div>
            )}

            {!adding && (
              <button onClick={openAdd} style={{ margin: 16, background: "transparent", border: `1px dashed ${BORDER}`, borderRadius: 10, color: JADE, fontSize: 12, fontWeight: 700, padding: "9px 0", cursor: "pointer", fontFamily: "'Nunito',sans-serif", display: "block", width: "calc(100% - 32px)" }}>
                + Add Account
              </button>
            )}
          </div>
        </section>

        {/* Role mappings */}
        {accounts.length > 0 && (
          <section style={{ marginTop: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: TEXT_DIM, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 12 }}>
              Budget Role Mappings
            </div>

            {unmappedRoles.length > 0 && (
              <div style={{ fontSize: 12, color: AMBER, fontWeight: 600, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                ⚠️ {unmappedRoles.map(r => r.label).join(", ")} {unmappedRoles.length === 1 ? "is" : "are"} not mapped.
              </div>
            )}

            <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden" }}>
              {ROLE_CONFIG.map(rc => (
                <RoleMappingRow
                  key={rc.role}
                  {...rc}
                  accounts={allAccountsForDropdown}
                  mappings={mappings}
                  onAdd={addMapping}
                  onRemove={removeMapping}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
