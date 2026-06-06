import { useState, useEffect } from "react";

// ── Responsive helper ───────────────────────────────────────────────────────

/** True when the viewport is at/below the given breakpoint (default 700px). */
export function useIsMobile(maxWidth = 700): boolean {
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

// ── Types ─────────────────────────────────────────────────────────────────

export type Frequency = "weekly" | "biweekly" | "semimonthly" | "monthly";
/** Income can also be a single one-time check tied to a specific month. */
export type IncomeFrequency = Frequency | "onetime";
export type ExpenseFrequency = "weekly" | "biweekly" | "semimonthly" | "monthly" | "bimonthly" | "quarterly" | "semiannual" | "annual";
export type Owner = "Self" | "Partner" | "Business";
export type AccountRole = "fixedExpenses" | "dailySpending" | "emergencySavings" | "sinkingFunds";

export interface BankAccount {
  id: string;
  name: string;            // Institution name
  nickname?: string;       // User override — displayed instead of name when set
  lastFour?: string;       // Last 4 digits
  url?: string;
  tag?: "personal" | "business";
  ignored?: boolean;       // Hidden from role dropdowns and quick links
}

export interface AccountMappings {
  fixedExpenses?: string[];   // BankAccount ids (many-to-one)
  dailySpending?: string[];
  emergencySavings?: string[];
  sinkingFunds?: string[];
}

/** Normalize a mapping value that may be a legacy string or a new string[]. */
export function normalizeIds(v: string | string[] | undefined): string[] {
  if (!v) return [];
  if (typeof v === "string") return [v];
  return v;
}

export type SplitType = "amount" | "percentage" | "balance";

/** One row in a paycheck's direct-deposit split table — mirrors Workday's [order, type, account] model. */
export interface PaycheckSplit {
  order: number;
  type: SplitType;
  value?: number;       // dollar amount (type="amount") or 0-100 (type="percentage"); omitted for "balance"
  accountId: string;   // BankAccount.id
}

export interface IncomeSource {
  id: string;
  name: string;
  owner: Owner;
  amount: number;
  frequency: IncomeFrequency;
  referenceDate: string;   // reference payday (weekly/biweekly) or the date of a one-time check
  splits?: PaycheckSplit[]; // ordered direct-deposit split rules; empty/absent = whole check unallocated
  /** @deprecated use splits instead */
  destinationAccountId?: string;
}

export interface FixedExpense {
  id: string;
  name: string;
  amount: number;
  dayOfMonth?: number; // optional — used for display ordering when known
  account: string;
  frequency?: ExpenseFrequency; // omitted = "monthly" for backward compat
  url?: string;        // optional link to the service's website (pay/manage)
}

export interface SinkingFund {
  id: string;
  name: string;
  monthlyAmount: number;
  targetAmount?: number;
  dueDate?: string;
  accountId?: string; // which sinking-fund account holds this fund (when several are mapped)
}

export interface EmergencySavings {
  amount: number;        // per-transfer amount
  frequency: Frequency;  // how often the transfer happens
}

export interface FinancePlan {
  incomeSources: IncomeSource[];
  fixedExpenses: FixedExpense[];
  savings: {
    emergency: number;              // legacy flat monthly amount (backward compat)
    emergencyTransfer?: EmergencySavings; // replaces legacy when present
  };
  sinkingFunds: SinkingFund[];
  wants: { projectsMonthly: number; cashAppPerCheck: number };
  bankAccounts?: BankAccount[];
  accountMappings?: AccountMappings;
}

// ── Constants ─────────────────────────────────────────────────────────────

export const BG = "#06091a";
export const SURFACE = "rgba(255,255,255,0.04)";
export const SURFACE_HI = "rgba(255,255,255,0.07)";
export const BORDER = "rgba(255,255,255,0.08)";
export const TEXT = "#dedad0";
export const TEXT_DIM = "#7a7890";
export const TEXT_MUTED = "#3d3d52";
export const JADE = "#5db88a";   // Healthy / on-target (green) — reserved for good dollar amounts & status
export const PURPLE = "#9b7fe8"; // Needs (50%) category
export const BLUE = "#5b8fd4";   // Savings (20%) category — also Tom income owner
export const AMBER = "#d4a45b";  // Warning / caution (yellow) — reserved for dollar amounts & status
export const ROSE = "#d45b7a";   // Partner income owner
export const PINK = "#e070a8";   // Wants (30%) category — Safe to Spend / Daily Spending
export const TEAL = "#46b6ad";   // Emergency savings role accent
export const DANGER = "#c0566a"; // Problem / action needed (red) — reserved for bad dollar amounts & status

export const FREQ_LABELS: Record<Frequency, string> = {
  weekly: "Weekly", biweekly: "Bi-weekly", semimonthly: "Semi-monthly", monthly: "Monthly",
};

export const INCOME_FREQ_LABELS: Record<IncomeFrequency, string> = {
  weekly: "Weekly", biweekly: "Bi-weekly", semimonthly: "Semi-monthly", monthly: "Monthly", onetime: "One-time",
};

export const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
export const MONTH_ABBR  = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export const OWNER_COLOR: Record<Owner, string> = { Self: BLUE, Partner: ROSE, Business: AMBER };

export const EXPENSE_FREQ_LABELS: Record<ExpenseFrequency, string> = {
  weekly:       "Weekly",
  biweekly:     "Bi-weekly",
  semimonthly:  "Semi-monthly (2×/mo)",
  monthly:      "Monthly",
  bimonthly:    "Every 2 months",
  quarterly:    "Quarterly",
  semiannual:   "Semi-annual",
  annual:       "Annual",
};

// Multiplier to convert the entered amount → monthly equivalent
export const EXPENSE_FREQ_MONTHLY: Record<ExpenseFrequency, number> = {
  weekly:       52 / 12,
  biweekly:     26 / 12,
  semimonthly:  2,
  monthly:      1,
  bimonthly:    1 / 2,
  quarterly:    1 / 3,
  semiannual:   1 / 6,
  annual:       1 / 12,
};

// Default labels used when no account is mapped to a role
export const ROLE_FALLBACKS: Record<AccountRole, string> = {
  fixedExpenses:  "Fixed Expenses",
  dailySpending:  "Daily Spending",
  emergencySavings: "Emergency Savings",
  sinkingFunds:   "Sinking Funds",
};

export const TAG_COLOR: Record<"personal" | "business", string> = {
  personal: JADE,
  business: AMBER,
};

export const DEFAULT_PLAN: FinancePlan = {
  incomeSources: [], fixedExpenses: [],
  savings: { emergency: 0 },
  sinkingFunds: [],
  wants: { projectsMonthly: 0, cashAppPerCheck: 200 },
  bankAccounts: [],
  accountMappings: {},
};

export const SAVINGS_FREQ_MONTHLY: Record<Frequency, number> = {
  weekly: 52 / 12, biweekly: 26 / 12, semimonthly: 2, monthly: 1,
};

export const SAVINGS_FREQ_LABELS: Record<Frequency, string> = {
  weekly: "Weekly", biweekly: "Bi-weekly", semimonthly: "Semi-monthly", monthly: "Monthly",
};

// ── Helpers ───────────────────────────────────────────────────────────────

export function countPaydays(year: number, month: number, freq: IncomeFrequency, ref: string): number {
  if (freq === "onetime") {
    if (!ref) return 0;
    const d = new Date(ref + "T12:00:00");
    return d.getFullYear() === year && d.getMonth() === month ? 1 : 0;
  }
  if (freq === "monthly") return 1;
  if (freq === "semimonthly") return 2;
  if (!ref) return freq === "biweekly" ? 2 : 4;
  const stepMs = (freq === "weekly" ? 7 : 14) * 86_400_000;
  const refMs = new Date(ref + "T12:00:00").getTime();
  const start = new Date(year, month, 1).getTime();
  const end = new Date(year, month + 1, 0, 23, 59, 59).getTime();
  const n = Math.ceil((start - refMs) / stepMs);
  let count = 0;
  for (let i = n; ; i++) { const d = refMs + i * stepMs; if (d > end) break; count++; }
  return count;
}

export const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
export const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 });
export const fmtDec = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const pct = (n: number, total: number) => total > 0 ? Math.round(n / total * 100) : 0;

export function emergencyMonthly(savings: FinancePlan["savings"]): number {
  if (savings.emergencyTransfer) {
    return savings.emergencyTransfer.amount * SAVINGS_FREQ_MONTHLY[savings.emergencyTransfer.frequency];
  }
  return savings.emergency || 0;
}

export function expenseMonthly(e: FixedExpense): number {
  return e.amount * EXPENSE_FREQ_MONTHLY[e.frequency ?? "monthly"];
}

export function monthsUntil(dateStr: string): number {
  const due = new Date(dateStr + "T12:00:00");
  const now = new Date();
  return Math.max(0, (due.getFullYear() - now.getFullYear()) * 12 + (due.getMonth() - now.getMonth()));
}

/** Returns the display name(s) for a mapped role, falling back to the generic label. */
export function resolveAccount(role: AccountRole, accounts: BankAccount[], mappings: AccountMappings): string {
  const ids = normalizeIds(mappings[role]);
  if (ids.length === 0) return ROLE_FALLBACKS[role];
  const names = ids
    .map(id => accounts.find(a => a.id === id))
    .filter((a): a is BankAccount => !!a)
    .map(displayName);
  return names.length > 0 ? names.join(" & ") : ROLE_FALLBACKS[role];
}

/** Display name: nickname overrides canonical name; appends last 4 when known. */
export function displayName(a: BankAccount): string {
  const base = a.nickname || a.name;
  return a.lastFour ? `${base} ••${a.lastFour}` : base;
}

// ── Donut chart ───────────────────────────────────────────────────────────

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function donutPath(cx: number, cy: number, ro: number, ri: number, a0: number, a1: number) {
  const GAP = 2;
  const s0 = a0 + GAP / 2, s1 = a1 - GAP / 2;
  if (s1 - s0 < 1) return "";
  const capped = Math.min(s1, s0 + 359);
  const large = capped - s0 > 180 ? 1 : 0;
  const p1 = polar(cx, cy, ro, s0), p2 = polar(cx, cy, ro, capped);
  const p3 = polar(cx, cy, ri, capped), p4 = polar(cx, cy, ri, s0);
  return `M${p1.x.toFixed(1)},${p1.y.toFixed(1)} A${ro},${ro} 0 ${large} 1 ${p2.x.toFixed(1)},${p2.y.toFixed(1)} L${p3.x.toFixed(1)},${p3.y.toFixed(1)} A${ri},${ri} 0 ${large} 0 ${p4.x.toFixed(1)},${p4.y.toFixed(1)} Z`;
}

export interface Seg { label: string; value: number; color: string; target: number }

export function DonutChart({ segs, total }: { segs: Seg[]; total: number }) {
  const cx = 95, cy = 95, ro = 78, ri = 50;
  let angle = 0;
  const arcs = segs.map(s => {
    const sweep = total > 0 ? (s.value / total) * 360 : 0;
    const d = total > 0 ? donutPath(cx, cy, ro, ri, angle, angle + sweep) : "";
    angle += sweep;
    return { ...s, d };
  });
  const unalloc = total - segs.reduce((a, s) => a + s.value, 0);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
      <svg width={190} height={190} viewBox="0 0 190 190" style={{ flexShrink: 0 }}>
        {total === 0
          ? <circle cx={cx} cy={cy} r={(ro + ri) / 2} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={ro - ri} />
          : arcs.map((a, i) => a.d && <path key={i} d={a.d} fill={a.color} />)
        }
        <circle cx={cx} cy={cy} r={ri - 1} fill={BG} />
        <text x={cx} y={cy - 8} textAnchor="middle" fill={TEXT_DIM} fontSize={8.5} fontWeight={700} fontFamily="Montserrat,sans-serif" letterSpacing={1.2}>MONTHLY</text>
        <text x={cx} y={cy + 11} textAnchor="middle" fill={TEXT} fontSize={16} fontWeight={800} fontFamily="Montserrat,sans-serif">
          {total > 0 ? fmt(total) : "—"}
        </text>
      </svg>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
        {segs.map((s, i) => {
          const p = pct(s.value, total);
          const delta = p - Math.round(s.target * 100);
          const ok = Math.abs(delta) <= 3;
          const indicator = ok ? JADE : DANGER;
          return (
            <div key={i}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <div style={{ width: 9, height: 9, borderRadius: 2, background: s.color }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>{s.label}</span>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                  <span style={{ fontSize: 13, color: TEXT }}>{fmt(s.value)}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: indicator }}>
                    {total > 0 ? `${p}%` : "—"}
                    <span style={{ color: TEXT_DIM, fontWeight: 400 }}> /{Math.round(s.target * 100)}%</span>
                  </span>
                </div>
              </div>
              <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 2, background: s.color, width: `${Math.min(100, total > 0 ? p / (s.target * 100) * 100 : 0)}%`, transition: "width 0.5s ease" }} />
              </div>
            </div>
          );
        })}
        {total > 0 && Math.abs(unalloc) > 1 && (
          <div style={{ fontSize: 12, fontWeight: 700, color: unalloc > 0 ? JADE : DANGER, paddingTop: 4, borderTop: `1px solid ${BORDER}` }}>
            {unalloc > 0 ? `+${fmt(unalloc)} unallocated` : `${fmt(unalloc)} over budget`}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Shared UI primitives ──────────────────────────────────────────────────

export function Card({ title, icon, action, children }: { title: string; icon?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          {icon && <span style={{ display: "flex", alignItems: "center", color: TEXT_DIM, flexShrink: 0 }}>{icon}</span>}
          <span style={{ fontSize: 13, fontWeight: 800, color: TEXT, letterSpacing: -0.2 }}>{title}</span>
        </div>
        {action}
      </div>
      <div style={{ padding: "18px 20px" }}>{children}</div>
    </div>
  );
}

export function Pill({ color, children }: { color: string; children: React.ReactNode }) {
  return <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", color, background: `${color}18`, border: `1px solid ${color}30`, borderRadius: 20, padding: "2px 8px" }}>{children}</span>;
}

export function InlineInput({ label, value, onChange, type = "text", placeholder = "" }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: TEXT_DIM, letterSpacing: 1, textTransform: "uppercase" }}>{label}</span>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ background: "rgba(0,0,0,0.25)", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "6px 10px", color: TEXT, fontSize: 13, fontFamily: "'Montserrat',sans-serif", outline: "none", width: "100%", boxSizing: "border-box" }}
        onFocus={e => (e.target.style.borderColor = JADE + "80")}
        onBlur={e => (e.target.style.borderColor = BORDER)}
      />
    </label>
  );
}

export function SelectInput({ label, value, onChange, children }: {
  label: string; value: string; onChange: (v: string) => void; children: React.ReactNode;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: TEXT_DIM, letterSpacing: 1, textTransform: "uppercase" }}>{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ background: "rgba(0,0,0,0.25)", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "6px 10px", color: TEXT, fontSize: 13, fontFamily: "'Montserrat',sans-serif", outline: "none" }}>
        {children}
      </select>
    </label>
  );
}

export function SaveCancel({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) {
  return (
    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
      <button onClick={onSave} style={{ background: JADE, border: "none", borderRadius: 8, color: "#06091a", fontFamily: "'Montserrat',sans-serif", fontWeight: 800, fontSize: 12, padding: "6px 16px", cursor: "pointer" }}>Save</button>
      <button onClick={onCancel} style={{ background: "transparent", border: `1px solid ${BORDER}`, borderRadius: 8, color: TEXT_DIM, fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 12, padding: "6px 12px", cursor: "pointer" }}>Cancel</button>
    </div>
  );
}
