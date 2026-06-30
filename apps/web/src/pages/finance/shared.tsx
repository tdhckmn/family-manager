import { useState, useEffect } from "react";

// ── Re-exports from core (pure types + math) ────────────────────────────────
export type {
  Frequency, IncomeFrequency, ExpenseFrequency, Owner, AccountRole, SplitType,
  BankAccount, AccountMappings, PaycheckSplit, IncomeSource, FixedExpense,
  SinkingFund, EmergencySavings, BudgetTargets, MonthlyGoal, FinancePlan,
} from "@equanimity/core";

export {
  normalizeIds, countPaydays, expenseMonthly, emergencyMonthly, recurringTotals,
  expenseBucket, isExpenseActive, getPlanTargets, fmt, fmtDec, displayName,
  resolveAccount, monthsUntil, DEFAULT_TARGETS, DEFAULT_PLAN, ROLE_FALLBACKS,
  FREQ_LABELS, INCOME_FREQ_LABELS, EXPENSE_FREQ_LABELS, EXPENSE_FREQ_MONTHLY,
  SAVINGS_FREQ_MONTHLY, SAVINGS_FREQ_LABELS, MONTH_ABBR, MONTH_NAMES,
} from "@equanimity/core";

import { fmt } from "@equanimity/core";

// ── Responsive helper ───────────────────────────────────────────────────────

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

// ── Color palette ───────────────────────────────────────────────────────────

export const BG = "var(--bg)";
export const SURFACE = "var(--surface)";
export const SURFACE_HI = "var(--surface-hi)";
export const BORDER = "var(--border)";
export const TEXT = "var(--text)";
export const TEXT_DIM = "var(--text-dim)";
export const TEXT_MUTED = "var(--text-muted)";
export const JADE = "#5db88a";
export const PURPLE = "#9b7fe8";
export const BLUE = "#5b8fd4";
export const AMBER = "#d4a45b";
export const ROSE = "#d45b7a";
export const PINK = "#e070a8";
export const TEAL = "#46b6ad";
export const DANGER = "#c0566a";
export const INK = "#08101f";

const LEGACY_OWNER_COLOR: Record<string, string> = { Self: BLUE, Partner: ROSE, Business: AMBER };
export const OWNER_COLOR: Record<string, string> = LEGACY_OWNER_COLOR;

export const TAG_COLOR: Record<"personal" | "business", string> = {
  personal: JADE,
  business: AMBER,
};

export const pct = (n: number, total: number) => total > 0 ? Math.round(n / total * 100) : 0;

export const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

// ── Donut chart ─────────────────────────────────────────────────────────────

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

export interface Seg { label: string; value: number; color: string; target?: number }

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
          ? <circle cx={cx} cy={cy} r={(ro + ri) / 2} fill="none" stroke="var(--surface-hi)" strokeWidth={ro - ri} />
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
          const delta = s.target !== undefined && total > 0 ? p - Math.round(s.target * 100) : null;
          const ok = delta === null || Math.abs(delta) <= 3;
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
                    {s.target !== undefined && <span style={{ color: TEXT_DIM, fontWeight: 400 }}> /{Math.round(s.target * 100)}%</span>}
                  </span>
                </div>
              </div>
              <div style={{ height: 4, background: "var(--surface-hi)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 2, background: s.color, width: `${Math.min(100, s.target !== undefined && total > 0 ? p / (s.target * 100) * 100 : 100)}%`, transition: "width 0.5s ease" }} />
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

// ── Shared UI primitives ────────────────────────────────────────────────────

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
        style={{ background: "var(--input-bg)", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "6px 10px", color: TEXT, fontSize: 13, fontFamily: "'Montserrat',sans-serif", outline: "none", width: "100%", boxSizing: "border-box" }}
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
        style={{ background: "var(--input-bg)", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "6px 10px", color: TEXT, fontSize: 13, fontFamily: "'Montserrat',sans-serif", outline: "none" }}>
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
