import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { signOut, onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "../../firebase";
import { doc, onSnapshot, setDoc, getDoc, getDocs, deleteDoc, collection } from "firebase/firestore";
import {
  FinancePlan, IncomeSource, Owner, AccountRole, BankAccount, MonthlyGoal, FixedExpense,
  BudgetTargets, DEFAULT_TARGETS, getPlanTargets,
  BG, SURFACE, BORDER, TEXT, TEXT_DIM, TEXT_MUTED,
  JADE, PURPLE, PINK, BLUE, AMBER, DANGER, INK, TAG_COLOR,
  MONTH_ABBR, MONTH_NAMES, DEFAULT_PLAN, uid as genId,
  countPaydays, emergencyMonthly, recurringTotals, resolveAccount, displayName, normalizeIds,
  Card, Seg, DonutChart, SaveCancel, useIsMobile,
} from "./shared";
import { computePlanNudges, computeAccountFlows, computeAccountNudges, Nudge } from "./nudges";
import ToolNav from "../../components/ToolNav";
import { Icon } from "../../components/Icon";
import { useHouseholdUid } from "../../household";
import { usePeople } from "../../usePeople";
import StarField from "../../components/StarField";
import { UserProfile } from "../../components/GlobalHeader";
import { WisdomCard, useDailyQuote } from "../../components/Wisdom";
import { usePrefs } from "../../prefs";
import {
  IncomeSection, FixedExpensesSection, SavingsSection, WantsSection,
  AccountPlanSection, SectionNudges,
} from "./PlanSections";

// Legacy one-time income shape (pre-unification) — migrated into incomeSources on load.
interface LegacyOneTime { id: string; month: string; name: string; amount: number; owner?: Owner }

// ── Header bar ───────────────────────────────────────────────────────────────

function MonthYearPicker({ year, month, onPick }: {
  year: number; month: number; onPick: (year: number, month: number) => void;
}) {
  const today = useMemo(() => new Date(), []);
  const [navYear, setNavYear] = useState(year);

  return (
    <div style={{
      position: "absolute", top: "calc(100% + 8px)", left: 0, zIndex: 200, width: 232,
      background: "var(--panel)", border: `1px solid ${BORDER}`, borderRadius: 14,
      padding: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.55)", backdropFilter: "blur(16px)",
    }}>
      {/* Year navigator */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <button onClick={() => setNavYear(y => y - 1)}
          style={{ background: "transparent", border: `1px solid ${BORDER}`, borderRadius: 7, color: TEXT_DIM, fontSize: 13, width: 26, height: 26, cursor: "pointer", fontFamily: "'Montserrat',sans-serif" }}>‹</button>
        <span style={{ fontSize: 14, fontWeight: 800, color: TEXT }}>{navYear}</span>
        <button onClick={() => setNavYear(y => y + 1)}
          style={{ background: "transparent", border: `1px solid ${BORDER}`, borderRadius: 7, color: TEXT_DIM, fontSize: 13, width: 26, height: 26, cursor: "pointer", fontFamily: "'Montserrat',sans-serif" }}>›</button>
      </div>

      {/* Month grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
        {MONTH_ABBR.map((m, i) => {
          const selected = navYear === year && i === month;
          const isToday = navYear === today.getFullYear() && i === today.getMonth();
          return (
            <button key={m} onClick={() => onPick(navYear, i)}
              style={{
                padding: "8px 0", borderRadius: 8, cursor: "pointer", fontFamily: "'Montserrat',sans-serif",
                fontSize: 12, fontWeight: 700,
                background: selected ? JADE : "transparent",
                color: selected ? "#06091a" : isToday ? JADE : TEXT_DIM,
                border: `1px solid ${selected ? JADE : isToday ? JADE + "55" : BORDER}`,
                transition: "all 0.12s",
              }}
              onMouseEnter={e => { if (!selected) (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-hi)"; }}
              onMouseLeave={e => { if (!selected) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}>
              {m}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FinanceHeader({ month, year, isCurrentMonth, onPrev, onNext, onPick }: {
  month: number; year: number; isCurrentMonth: boolean;
  onPrev: () => void; onNext: () => void; onPick: (year: number, month: number) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const menuRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  useEffect(() => {
    if (!pickerOpen) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [pickerOpen]);

  const modeColor = isCurrentMonth ? JADE : BLUE;
  const modeLabel = isCurrentMonth ? "This month" : "Plan";

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 24px", minHeight: 60, borderBottom: `1px solid ${BORDER}`, gap: 12, flexWrap: "wrap", rowGap: 10, boxSizing: "border-box" }}>

      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        <Link to="/app" style={{ textDecoration: "none", color: TEXT_DIM, fontSize: 13, fontWeight: 600, opacity: 0.7, flexShrink: 0, transition: "opacity 0.15s", display: "flex", alignItems: "center", gap: 4 }}
          onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.opacity = "1"}
          onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.opacity = "0.7"}>
          <Icon name="chevronLeft" size={13} /> Home
        </Link>
        <div style={{ width: 1, height: 14, background: "var(--border)", flexShrink: 0 }} />
        <ToolNav current="finance" />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        {/* Month label (opens picker) + mode badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div ref={pickerRef} style={{ position: "relative" }}>
            <button
              onClick={() => setPickerOpen(o => !o)}
              title="Pick month"
              style={{
                display: "flex", alignItems: "center", gap: 4,
                background: pickerOpen ? "var(--surface-hi)" : "transparent",
                border: `1px solid ${pickerOpen ? "var(--border-hi)" : "transparent"}`,
                borderRadius: 8, padding: "3px 7px", cursor: "pointer", fontFamily: "'Montserrat',sans-serif",
                transition: "all 0.15s",
              }}
              onMouseEnter={e => { if (!pickerOpen) (e.currentTarget as HTMLButtonElement).style.background = "var(--surface)"; }}
              onMouseLeave={e => { if (!pickerOpen) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
            >
              <span style={{ fontSize: 13, fontWeight: 700, color: TEXT, width: 64, textAlign: "right", display: "inline-block" }}>
                {MONTH_ABBR[month]} {year}
              </span>
              <span style={{ fontSize: 9, color: TEXT_DIM, lineHeight: 1 }}>▾</span>
            </button>
            {pickerOpen && (
              <MonthYearPicker year={year} month={month} onPick={(y, m) => { onPick(y, m); setPickerOpen(false); }} />
            )}
          </div>
          <span style={{ fontSize: 9, fontWeight: 800, color: modeColor, background: `${modeColor}18`, border: `1px solid ${modeColor}30`, borderRadius: 20, padding: "1px 7px", letterSpacing: 0.8, textTransform: "uppercase", whiteSpace: "nowrap" }}>
            {modeLabel}
          </span>
        </div>

        {/* Both arrows together — position never affected by label width */}
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          <button onClick={onPrev} style={{ background: "transparent", border: `1px solid ${BORDER}`, borderRadius: 8, color: TEXT_DIM, fontSize: 14, width: 28, height: 28, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
          <button onClick={onNext} style={{ background: "transparent", border: `1px solid ${BORDER}`, borderRadius: 8, color: TEXT_DIM, fontSize: 14, width: 28, height: 28, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
        </div>

        <div ref={menuRef} style={{ position: "relative", marginLeft: 4 }}>
          <button
            onClick={() => setMenuOpen(o => !o)}
            title="Menu"
            style={{
              background: menuOpen ? "var(--surface-hi)" : "transparent",
              border: `1px solid ${menuOpen ? "var(--border-hi)" : BORDER}`,
              borderRadius: 8, color: menuOpen ? TEXT : TEXT_DIM,
              fontSize: 16, width: 32, height: 32,
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.15s",
            }}
            onMouseEnter={e => { if (!menuOpen) { (e.currentTarget as HTMLButtonElement).style.color = TEXT; (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-hi)"; } }}
            onMouseLeave={e => { if (!menuOpen) { (e.currentTarget as HTMLButtonElement).style.color = TEXT_DIM; (e.currentTarget as HTMLButtonElement).style.borderColor = BORDER; } }}
          >
            <Icon name="gear" size={17} />
          </button>

          {menuOpen && (
            <div style={{
              position: "absolute", top: "calc(100% + 8px)", right: 0, minWidth: 220,
              background: "var(--panel)", border: `1px solid ${BORDER}`,
              borderRadius: 14, overflow: "hidden",
              boxShadow: "0 8px 32px rgba(0,0,0,0.55)", backdropFilter: "blur(16px)",
              zIndex: 200,
            }}>
              <div style={{ padding: "4px 0" }}>
                <UserProfile user={user} />
                <div style={{ height: 1, background: BORDER, margin: "4px 0" }} />
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: TEXT_DIM, padding: "8px 16px 8px", opacity: 0.6 }}>
                  Manage
                </div>
                <Link to="/app/accounts" onClick={() => setMenuOpen(false)}
                  style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10, padding: "9px 16px", color: TEXT, fontSize: 13, fontWeight: 600, transition: "background 0.1s" }}
                  onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.background = "var(--surface-hi)"}
                  onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.background = "transparent"}>
                  <Icon name="bank" size={15} /> Accounts
                </Link>
                <Link to="/app/settings" onClick={() => setMenuOpen(false)}
                  style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10, padding: "9px 16px", color: TEXT, fontSize: 13, fontWeight: 600, transition: "background 0.1s" }}
                  onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.background = "var(--surface-hi)"}
                  onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.background = "transparent"}>
                  <Icon name="gear" size={15} /> Settings
                </Link>
                <div style={{ height: 1, background: BORDER, margin: "4px 0" }} />
                <button
                  onClick={() => { setMenuOpen(false); signOut(auth).catch(console.error); }}
                  style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", padding: "9px 16px", background: "transparent", border: "none", color: DANGER, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Montserrat',sans-serif" }}
                  onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = `${DANGER}12`}
                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = "transparent"}>
                  <Icon name="signout" size={15} /> Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Budget Overview card (with editable targets) ─────────────────────────────

function BudgetOverviewCard({
  plan, save, totalIncome, totalNeeds, totalSavings, totalWants, overviewNudges,
}: {
  plan: FinancePlan; save: (p: FinancePlan) => void;
  totalIncome: number; totalNeeds: number; totalSavings: number; totalWants: number;
  overviewNudges: import("./nudges").Nudge[];
}) {
  const activeTargets = getPlanTargets(plan);
  const [editing, setEditing] = useState(false);
  const [draftEnabled, setDraftEnabled] = useState(true);
  const [draftNeeds, setDraftNeeds] = useState("50");
  const [draftSavings, setDraftSavings] = useState("20");

  function openEdit() {
    const t = activeTargets ?? DEFAULT_TARGETS;
    setDraftEnabled(activeTargets !== null);
    setDraftNeeds(String(Math.round(t.needs * 100)));
    setDraftSavings(String(Math.round(t.savings * 100)));
    setEditing(true);
  }

  const needsN = Math.max(0, Math.min(100, Math.round(Number(draftNeeds) || 0)));
  const savingsN = Math.max(0, Math.min(100, Math.round(Number(draftSavings) || 0)));
  const wantsN = Math.max(0, 100 - needsN - savingsN);
  const overAllocated = needsN + savingsN > 100;

  const savedTargets = plan.budgetTargets;
  const isDefault = savedTargets === undefined || (savedTargets !== null && savedTargets.needs === 0.5 && savedTargets.savings === 0.2 && savedTargets.wants === 0.3);
  const isCustom = !isDefault;

  function handleSave() {
    if (draftEnabled) {
      if (overAllocated) return;
      save({ ...plan, budgetTargets: { needs: needsN / 100, savings: savingsN / 100, wants: wantsN / 100 } });
    } else {
      save({ ...plan, budgetTargets: null });
    }
    setEditing(false);
  }

  const displayTargets = activeTargets ?? DEFAULT_TARGETS;
  const chartSegs: Seg[] = activeTargets !== null ? [
    { label: "Needs",   value: totalNeeds,   color: PURPLE, target: displayTargets.needs },
    { label: "Wants",   value: totalWants,   color: PINK,   target: displayTargets.wants },
    { label: "Savings", value: totalSavings, color: JADE,   target: displayTargets.savings },
  ] : [
    { label: "Needs",   value: totalNeeds,   color: PURPLE },
    { label: "Wants",   value: totalWants,   color: PINK   },
    { label: "Savings", value: totalSavings, color: JADE   },
  ];

  const numInputStyle: React.CSSProperties = {
    width: 52, textAlign: "right", background: "rgba(0,0,0,0.25)",
    border: `1px solid ${BORDER}`, borderRadius: 6,
    padding: "4px 8px", color: TEXT, fontSize: 13,
    fontFamily: "'Montserrat',sans-serif", outline: "none",
  };

  const editBtn = (
    <button
      onClick={() => editing ? setEditing(false) : openEdit()}
      title={editing ? "Close" : "Edit targets"}
      style={{ background: "transparent", border: `1px solid ${BORDER}`, borderRadius: 7, color: TEXT_DIM, padding: "3px 8px", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, transition: "all 0.15s", fontFamily: "'Montserrat',sans-serif" }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = TEXT; (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-hi)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = TEXT_DIM; (e.currentTarget as HTMLButtonElement).style.borderColor = BORDER; }}
    >
      <Icon name={editing ? "x" : "pencil"} size={13} />
      {isCustom && !editing && <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, color: JADE }}>custom</span>}
    </button>
  );

  return (
    <Card icon={<Icon name="chart" />} title="Budget Overview" action={editBtn}>
      {editing ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input type="checkbox" checked={draftEnabled} onChange={e => setDraftEnabled(e.target.checked)}
              style={{ accentColor: JADE, width: 14, height: 14 }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>Use budget targets</span>
          </label>

          {draftEnabled && (
            <>
              {([
                { label: "Needs",   color: PURPLE, value: draftNeeds,   set: setDraftNeeds   },
                { label: "Savings", color: JADE,   value: draftSavings, set: setDraftSavings },
              ] as const).map(row => (
                  <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 9, height: 9, borderRadius: 2, background: row.color, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: TEXT }}>{row.label}</span>
                    <input type="number" min={0} max={100} value={row.value}
                      onChange={e => row.set(e.target.value)}
                      onFocus={e => (e.target.style.borderColor = JADE + "80")}
                      onBlur={e => (e.target.style.borderColor = BORDER)}
                      style={numInputStyle} />
                    <span style={{ fontSize: 13, color: TEXT_DIM, width: 14 }}>%</span>
                  </div>
              ))}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 9, height: 9, borderRadius: 2, background: PINK, flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: TEXT }}>Wants</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: overAllocated ? DANGER : TEXT_DIM, width: 52, textAlign: "right" }}>{wantsN}</span>
                <span style={{ fontSize: 13, color: TEXT_DIM, width: 14 }}>%</span>
              </div>
              {overAllocated && (
                <div style={{ fontSize: 12, color: DANGER, fontWeight: 600 }}>Needs + Savings cannot exceed 100%</div>
              )}
            </>
          )}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: `1px solid ${BORDER}`, paddingTop: 10 }}>
            {!isDefault && draftEnabled ? (
              <button
                onClick={() => { setDraftNeeds("50"); setDraftSavings("20"); }}
                style={{ background: "transparent", border: "none", color: TEXT_DIM, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Montserrat',sans-serif", padding: 0 }}
                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = TEXT}
                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = TEXT_DIM}
              >Reset to 50/30/20</button>
            ) : <div />}
            <SaveCancel onSave={handleSave} onCancel={() => setEditing(false)} />
          </div>
        </div>
      ) : (
        <>
          <SectionNudges nudges={overviewNudges} />
          <DonutChart segs={chartSegs} total={totalIncome} />
        </>
      )}
    </Card>
  );
}

// ── Monthly focus goals ──────────────────────────────────────────────────────

function MonthlyGoalsCard({ plan, save, monthKey, monthLabel }: {
  plan: FinancePlan; save: (p: FinancePlan) => void; monthKey: string; monthLabel: string;
}) {
  const goals = plan.monthlyGoals?.[monthKey] ?? [];
  const [adding, setAdding] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  function saveGoals(next: MonthlyGoal[]) {
    const map = { ...(plan.monthlyGoals ?? {}) };
    if (next.length) map[monthKey] = next; else delete map[monthKey];
    save({ ...plan, monthlyGoals: map });
  }

  function addGoal() {
    const text = adding.trim();
    if (!text) return;
    saveGoals([...goals, { id: genId(), text, completed: false }]);
    setAdding("");
  }
  function toggle(id: string) {
    saveGoals(goals.map(g => g.id === id ? { ...g, completed: !g.completed } : g));
  }
  function remove(id: string) {
    saveGoals(goals.filter(g => g.id !== id));
  }
  function commitEdit() {
    if (editId) {
      const text = editText.trim();
      saveGoals(text ? goals.map(g => g.id === editId ? { ...g, text } : g) : goals.filter(g => g.id !== editId));
    }
    setEditId(null);
    setEditText("");
  }

  return (
    <Card icon={<Icon name="target" />} title={`Focus · ${monthLabel}`}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {goals.length === 0 && (
          <div style={{ fontSize: 13, color: TEXT_MUTED, fontStyle: "italic" }}>
            What do you want from your money this month? Set an intention below.
          </div>
        )}
        {goals.map(g => (
          <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", borderRadius: 10, background: "var(--surface)", border: `1px solid ${BORDER}` }}>
            <button onClick={() => toggle(g.id)}
              style={{ flexShrink: 0, width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${g.completed ? JADE : "var(--border-hi)"}`, background: g.completed ? JADE : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
              {g.completed && <Icon name="checkMark" size={11} />}
            </button>
            {editId === g.id ? (
              <input autoFocus value={editText} onChange={e => setEditText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") { setEditId(null); setEditText(""); } }}
                onBlur={commitEdit}
                style={{ flex: 1, background: "transparent", border: "none", borderBottom: `1.5px solid ${JADE}80`, outline: "none", color: TEXT, fontSize: 13, fontFamily: "'Montserrat',sans-serif", padding: "2px 0" }} />
            ) : (
              <span onClick={() => { setEditId(g.id); setEditText(g.text); }}
                style={{ flex: 1, fontSize: 13, color: g.completed ? TEXT_MUTED : TEXT, textDecoration: g.completed ? "line-through" : "none", cursor: "text", lineHeight: 1.4 }}>
                {g.text}
              </span>
            )}
            <button onClick={() => remove(g.id)} title="Remove"
              style={{ flexShrink: 0, background: "transparent", border: "none", color: TEXT_MUTED, cursor: "pointer", padding: 2, display: "flex", alignItems: "center" }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = DANGER}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = TEXT_MUTED}>
              <Icon name="x" size={13} />
            </button>
          </div>
        ))}
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 2 }}>
          <input value={adding} onChange={e => setAdding(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") addGoal(); }}
            placeholder="Add a focus for this month…"
            style={{ flex: 1, background: "rgba(0,0,0,0.25)", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "7px 11px", color: TEXT, fontSize: 13, fontFamily: "'Montserrat',sans-serif", outline: "none" }}
            onFocus={e => (e.target.style.borderColor = AMBER + "80")}
            onBlur={e => (e.target.style.borderColor = BORDER)} />
          <button onClick={addGoal} disabled={!adding.trim()}
            style={{ background: adding.trim() ? AMBER : "var(--surface-hi)", border: "none", borderRadius: 8, color: adding.trim() ? BG : TEXT_MUTED, fontFamily: "'Montserrat',sans-serif", fontWeight: 800, fontSize: 12, padding: "7px 16px", cursor: adding.trim() ? "pointer" : "default" }}>
            Add
          </button>
        </div>
      </div>
    </Card>
  );
}

// ── Main page (single-page planner) ──────────────────────────────────────────

export default function Finance() {
  const uid = useHouseholdUid();
  const [searchParams] = useSearchParams();
  const initialExpenseId = searchParams.get("expense");
  const people = usePeople();
  const { prefs } = usePrefs();
  const dailyQuote = useDailyQuote();
  const [plan, setPlan] = useState<FinancePlan>(DEFAULT_PLAN);

  const isMobile = useIsMobile();
  const today = useMemo(() => new Date(), []);
  const [viewDate, setViewDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();
  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
  const prevMonth = () => setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  const pickMonth = (y: number, m: number) => setViewDate(new Date(y, m, 1));

  useEffect(() => {
    const ref = doc(db, "users", uid, "finance", "plan");
    return onSnapshot(ref, snap => {
      if (!snap.exists()) return;
      const data = snap.data() as FinancePlan & { oneTimeIncome?: LegacyOneTime[] };

      let sources: IncomeSource[] = data.incomeSources ?? [];
      let changed = false;

      // Relabel legacy "Tom" owner → "Self".
      if (sources.some(s => (s.owner as string) === "Tom")) {
        sources = sources.map(s => (s.owner as string) === "Tom" ? { ...s, owner: "Self" } : s);
        changed = true;
      }

      // Migrate legacy one-time income entries into unified income sources.
      const legacy = data.oneTimeIncome;
      if (legacy && legacy.length) {
        const migrated: IncomeSource[] = legacy.map(ot => ({
          id: ot.id,
          name: ot.name,
          owner: (ot.owner as string) === "Tom" ? "Self" : (ot.owner ?? "Self"),
          amount: ot.amount,
          frequency: "onetime",
          referenceDate: `${ot.month}-15`,
        }));
        sources = [...sources, ...migrated];
        changed = true;
      }

      if (changed) {
        const next: FinancePlan = { ...data, incomeSources: sources };
        delete (next as FinancePlan & { oneTimeIncome?: unknown }).oneTimeIncome;
        setPlan(next);
        setDoc(ref, next).catch(console.error);
      } else {
        setPlan(data);
      }
    }, err => console.error("Finance load failed:", err));
  }, [uid]);

  const save = useCallback((next: FinancePlan) => {
    setPlan(next);
    setDoc(doc(db, "users", uid, "finance", "plan"), next).catch(console.error);
  }, [uid]);

  // One-time migration: fold the old standalone `subscriptions` collection into the
  // plan's recurring expenses (as kind="subscription", Wants bucket), then delete it.
  const migratedSubs = useRef(false);
  useEffect(() => {
    if (migratedSubs.current) return;
    migratedSubs.current = true;
    (async () => {
      try {
        const snap = await getDocs(collection(db, "users", uid, "subscriptions"));
        if (snap.empty) return;
        const planRef = doc(db, "users", uid, "finance", "plan");
        const planSnap = await getDoc(planRef);
        const cur = (planSnap.exists() ? planSnap.data() : DEFAULT_PLAN) as FinancePlan;
        const existingIds = new Set((cur.fixedExpenses ?? []).map(e => e.id));
        const migrated: FixedExpense[] = [];
        snap.forEach(d => {
          if (existingIds.has(d.id)) return;
          const s = d.data() as { cost?: number; name?: string; frequency?: string; renewalDate?: string; category?: string; url?: string; active?: boolean };
          const e: FixedExpense = {
            id: d.id, name: s.name ?? "Subscription", amount: Number(s.cost) || 0,
            account: "Other", kind: "subscription", bucket: "wants", active: s.active !== false,
          };
          if (s.frequency === "annual") e.frequency = "annual";
          if (s.renewalDate) e.renewalDate = s.renewalDate;
          if (s.category) e.category = s.category;
          if (s.url) e.url = s.url;
          migrated.push(e);
        });
        if (migrated.length) {
          await setDoc(planRef, { ...cur, fixedExpenses: [...(cur.fixedExpenses ?? []), ...migrated] });
        }
        await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
      } catch (err) {
        console.error("Subscription migration failed:", err);
      }
    })();
  }, [uid]);

  // ── Totals ──
  const totalIncome = useMemo(() => {
    let total = 0;
    for (const src of plan.incomeSources) {
      total += src.amount * countPaydays(year, month, src.frequency, src.referenceDate);
    }
    return total;
  }, [plan.incomeSources, year, month]);

  const accounts = plan.bankAccounts ?? [];
  const mappings = plan.accountMappings ?? {};
  const acct = (role: AccountRole) => resolveAccount(role, accounts, mappings);

  // Accounts mapped to the sinking-funds role (used to let each fund pick a home).
  const sinkingAccounts = useMemo(
    () => normalizeIds(mappings.sinkingFunds)
      .map(id => accounts.find(a => a.id === id))
      .filter((a): a is BankAccount => !!a && !a.ignored),
    [accounts, mappings.sinkingFunds],
  );

  // Only accounts mapped to the fixedExpenses role appear in the expense dropdown.
  // Falls back to all accounts if the role has no mapping yet.
  const accountOptions = useMemo(() => {
    const fixedIds = normalizeIds(mappings.fixedExpenses);
    const fixedAccounts = fixedIds.length > 0
      ? fixedIds.map(id => accounts.find(a => a.id === id)).filter((a): a is typeof accounts[0] => !!a && !a.ignored)
      : accounts.filter(a => !a.ignored);
    return [...fixedAccounts.map(displayName), "Paycheck Deduction", "Other"];
  }, [accounts, mappings.fixedExpenses]);

  // Recurring expenses split by bucket: needs-bucket counts toward Needs; wants-bucket
  // (mostly subscriptions) is "committed" spending carved out of the Wants budget.
  const { needs: totalNeeds, wantsCommitted } = recurringTotals(plan.fixedExpenses);
  const totalSinkingFunds = (plan.sinkingFunds ?? []).reduce((s, f) => s + f.monthlyAmount, 0);
  const totalEmergency    = emergencyMonthly(plan.savings);
  const totalSavings      = totalEmergency + totalSinkingFunds;
  const totalWants        = Math.max(0, totalIncome - totalNeeds - totalSavings);

  const { flows: accountFlows, unlinkedIncome } = useMemo(
    () => computeAccountFlows(plan, year, month),
    [plan, year, month],
  );

  const nudges: Nudge[] = useMemo(() => {
    const targets = getPlanTargets(plan);
    const planNudges = computePlanNudges({ totalIncome, totalNeeds, totalSavings, totalWants, targets });
    const acctNudges = computeAccountNudges(accountFlows, unlinkedIncome);
    return [...planNudges, ...acctNudges];
  }, [plan, totalIncome, totalNeeds, totalSavings, totalWants, accountFlows, unlinkedIncome]);

  const overviewNudges = nudges.filter(n => n.section === "overview");
  const accountNudges  = nudges.filter(n => n.section === "accounts");

  const activeTargets = getPlanTargets(plan);

  return (
    <div style={{ background: BG, minHeight: "100vh", fontFamily: "'Montserrat',sans-serif", color: TEXT }}>
      <StarField />

      <div style={{ position: "relative", zIndex: 1 }}>

        <FinanceHeader month={month} year={year} isCurrentMonth={isCurrentMonth} onPrev={prevMonth} onNext={nextMonth} onPick={pickMonth} />

        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 20px 64px" }}>

        {/* Daily wisdom */}
        {prefs.wisdomPages.includes("finance") && (
          <div style={{ marginBottom: 16 }}>
            <WisdomCard quote={dailyQuote} compact />
          </div>
        )}

        {/* This month's focus goals */}
        <div style={{ marginBottom: 16 }}>
          <MonthlyGoalsCard plan={plan} save={save} monthKey={monthKey} monthLabel={`${MONTH_NAMES[month]} ${year}`} />
        </div>

        {/* Quick links — bank accounts that have a URL */}
        {accounts.filter(a => a.url && !a.ignored).length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
            {accounts.filter(a => a.url && !a.ignored).map(a => {
              const color = TAG_COLOR[a.tag ?? "personal"];
              return (
                <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer"
                  style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 6, padding: "5px 13px", borderRadius: 20, background: SURFACE, border: `1px solid ${color}28`, color, fontSize: 12, fontWeight: 700, transition: "all 0.15s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = `${color}18`; (e.currentTarget as HTMLAnchorElement).style.borderColor = `${color}55`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = SURFACE; (e.currentTarget as HTMLAnchorElement).style.borderColor = `${color}28`; }}>
                  {a.nickname || a.name}
                  {a.tag && <span style={{ fontSize: 9, color: TEXT_MUTED, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{a.tag}</span>}
                </a>
              );
            })}
          </div>
        )}

        {/* Income + Budget Overview */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <IncomeSection plan={plan} save={save} year={year} month={month} totalIncome={totalIncome} bankAccounts={accounts} people={people} />
          <BudgetOverviewCard
            plan={plan} save={save}
            totalIncome={totalIncome} totalNeeds={totalNeeds} totalSavings={totalSavings} totalWants={totalWants}
            overviewNudges={overviewNudges}
          />
        </div>

        {/* Merged Budget Plan (funding + cash flow) */}
        <AccountPlanSection
          flows={accountFlows}
          mappings={mappings}
          totalNeeds={totalNeeds} totalWants={totalWants}
          totalEmergency={totalEmergency} totalSinkingFunds={totalSinkingFunds}
          totalIncome={totalIncome}
          nudges={accountNudges}
          targets={activeTargets}
        />

        {/* Editing: expenses + savings/wants */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16, marginTop: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <FixedExpensesSection plan={plan} save={save} accountOptions={accountOptions} totalIncome={totalIncome}
              needsTarget={activeTargets ? Math.round(activeTargets.needs * 100) : undefined}
              initialExpenseId={initialExpenseId} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <SavingsSection
              plan={plan} save={save} totalIncome={totalIncome}
              emergencyAcctName={acct("emergencySavings")} sinkingAccounts={sinkingAccounts}
              savingsTarget={activeTargets ? Math.round(activeTargets.savings * 100) : undefined}
            />
            <WantsSection totalWants={totalWants} totalIncome={totalIncome} dailySpendingAcctName={acct("dailySpending")}
              committed={wantsCommitted}
              wantsTarget={activeTargets ? Math.round(activeTargets.wants * 100) : undefined} />
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
