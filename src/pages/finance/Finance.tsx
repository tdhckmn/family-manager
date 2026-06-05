import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth, db } from "../../firebase";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import {
  FinancePlan, IncomeSource, Owner, AccountRole,
  BG, SURFACE, BORDER, TEXT, TEXT_DIM, TEXT_MUTED,
  JADE, PURPLE, ORANGE, BLUE, AMBER, DANGER, TAG_COLOR,
  MONTH_ABBR, DEFAULT_PLAN,
  countPaydays, emergencyMonthly, expenseMonthly, resolveAccount, displayName,
  Card, Seg, DonutChart, AccountFundingSection,
} from "./shared";
import { computePlanNudges, verdictLevel, Nudge } from "./nudges";
import {
  IncomeSection, FixedExpensesSection, SavingsSection, WantsSection,
} from "./PlanSections";

// Legacy one-time income shape (pre-unification) — migrated into incomeSources on load.
interface LegacyOneTime { id: string; month: string; name: string; amount: number; owner?: Owner }

// ── Plan-health verdict banner ───────────────────────────────────────────────

function HealthVerdict({ level, count, hasPlan }: { level: "ok" | "warn" | "danger"; count: number; hasPlan: boolean }) {
  const cfg = !hasPlan
    ? { color: BLUE, emoji: "📋", title: "Build your plan", sub: "Add your income below to see how the month balances." }
    : level === "ok"
      ? { color: JADE, emoji: "🟢", title: "Plan looks balanced", sub: "Your plan lines up with the 50/30/20 targets." }
      : level === "warn"
        ? { color: AMBER, emoji: "🟡", title: "A few things to tune", sub: `${count} suggestion${count !== 1 ? "s" : ""} below.` }
        : { color: DANGER, emoji: "🔴", title: "Plan doesn't balance", sub: `${count} thing${count !== 1 ? "s" : ""} need attention below.` };

  return (
    <div style={{
      background: `${cfg.color}12`, border: `1px solid ${cfg.color}40`, borderRadius: 16,
      padding: "20px 24px", marginBottom: 16, display: "flex", alignItems: "center", gap: 18,
    }}>
      <div style={{ fontSize: 36, lineHeight: 1 }}>{cfg.emoji}</div>
      <div>
        <div style={{ fontSize: 20, fontWeight: 800, color: cfg.color, letterSpacing: -0.3 }}>{cfg.title}</div>
        <div style={{ fontSize: 13, color: TEXT_DIM, marginTop: 3 }}>{cfg.sub}</div>
      </div>
    </div>
  );
}

function NudgeList({ nudges }: { nudges: Nudge[] }) {
  if (nudges.length === 0) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
      {nudges.map(n => {
        const color = n.level === "danger" ? DANGER : AMBER;
        return (
          <div key={n.id} style={{ background: SURFACE, border: `1px solid ${color}35`, borderLeft: `3px solid ${color}`, borderRadius: 12, padding: "13px 16px" }}>
            <div style={{ fontSize: 13, fontWeight: 800, color, marginBottom: 3 }}>{n.title}</div>
            <div style={{ fontSize: 13, color: TEXT, lineHeight: 1.5 }}>{n.message}</div>
          </div>
        );
      })}
    </div>
  );
}

// ── Header bar ───────────────────────────────────────────────────────────────

function FinanceHeader({ month, year, isCurrentMonth, onPrev, onNext }: {
  month: number; year: number; isCurrentMonth: boolean;
  onPrev: () => void; onNext: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const modeColor = isCurrentMonth ? JADE : BLUE;
  const modeLabel = isCurrentMonth ? "This month" : "Plan";

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, gap: 12 }}>

      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        <Link to="/" style={{ textDecoration: "none", color: TEXT_DIM, fontSize: 13, fontWeight: 600, opacity: 0.7, flexShrink: 0, transition: "opacity 0.15s" }}
          onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.opacity = "1"}
          onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.opacity = "0.7"}>
          ← Home
        </Link>
        <div style={{ width: 1, height: 14, background: "rgba(255,255,255,0.1)", flexShrink: 0 }} />
        <span style={{ fontSize: 15, fontWeight: 800, color: TEXT, letterSpacing: -0.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          💰 Budget Planner
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        <button onClick={onPrev} style={{ background: "transparent", border: `1px solid ${BORDER}`, borderRadius: 8, color: TEXT_DIM, fontSize: 14, width: 28, height: 28, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>‹</button>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: TEXT, width: 68, textAlign: "center", display: "inline-block" }}>
            {MONTH_ABBR[month]} {year}
          </span>
          <span style={{ fontSize: 9, fontWeight: 800, color: modeColor, background: `${modeColor}18`, border: `1px solid ${modeColor}30`, borderRadius: 20, padding: "1px 7px", letterSpacing: 0.8, textTransform: "uppercase", whiteSpace: "nowrap" }}>
            {modeLabel}
          </span>
        </div>

        <button onClick={onNext} style={{ background: "transparent", border: `1px solid ${BORDER}`, borderRadius: 8, color: TEXT_DIM, fontSize: 14, width: 28, height: 28, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>›</button>

        <div ref={menuRef} style={{ position: "relative", marginLeft: 4 }}>
          <button
            onClick={() => setMenuOpen(o => !o)}
            title="Menu"
            style={{
              background: menuOpen ? "rgba(255,255,255,0.08)" : "transparent",
              border: `1px solid ${menuOpen ? "rgba(255,255,255,0.18)" : BORDER}`,
              borderRadius: 8, color: menuOpen ? TEXT : TEXT_DIM,
              fontSize: 16, width: 32, height: 32,
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.15s",
            }}
            onMouseEnter={e => { if (!menuOpen) { (e.currentTarget as HTMLButtonElement).style.color = TEXT; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.18)"; } }}
            onMouseLeave={e => { if (!menuOpen) { (e.currentTarget as HTMLButtonElement).style.color = TEXT_DIM; (e.currentTarget as HTMLButtonElement).style.borderColor = BORDER; } }}
          >
            ☰
          </button>

          {menuOpen && (
            <div style={{
              position: "absolute", top: "calc(100% + 8px)", right: 0, minWidth: 220,
              background: "rgba(10,13,30,0.97)", border: `1px solid ${BORDER}`,
              borderRadius: 14, overflow: "hidden",
              boxShadow: "0 8px 32px rgba(0,0,0,0.55)", backdropFilter: "blur(16px)",
              zIndex: 200,
            }}>
              <div style={{ padding: "6px 0" }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: TEXT_DIM, padding: "8px 16px 8px", opacity: 0.6 }}>
                  Manage
                </div>
                <Link to="/accounts" onClick={() => setMenuOpen(false)}
                  style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10, padding: "9px 16px", color: TEXT, fontSize: 13, fontWeight: 600, transition: "background 0.1s" }}
                  onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.06)"}
                  onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.background = "transparent"}>
                  <span style={{ fontSize: 15 }}>🏦</span> Accounts
                </Link>
                <div style={{ height: 1, background: BORDER, margin: "4px 0" }} />
                <button
                  onClick={() => { setMenuOpen(false); signOut(auth).catch(console.error); }}
                  style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", padding: "9px 16px", background: "transparent", border: "none", color: DANGER, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Nunito',sans-serif" }}
                  onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = `${DANGER}12`}
                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = "transparent"}>
                  <span style={{ fontSize: 15 }}>→</span> Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page (single-page planner) ──────────────────────────────────────────

export default function Finance() {
  const [plan, setPlan] = useState<FinancePlan>(DEFAULT_PLAN);

  const today = useMemo(() => new Date(), []);
  const [viewDate, setViewDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();
  const prevMonth = () => setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  useEffect(() => {
    const ref = doc(db, "finance", "plan");
    return onSnapshot(ref, snap => {
      if (!snap.exists()) return;
      const data = snap.data() as FinancePlan & { oneTimeIncome?: LegacyOneTime[] };

      // Migrate legacy one-time income entries into unified income sources.
      const legacy = data.oneTimeIncome;
      if (legacy && legacy.length) {
        const migrated: IncomeSource[] = legacy.map(ot => ({
          id: ot.id,
          name: ot.name,
          owner: ot.owner ?? "Tom",
          amount: ot.amount,
          frequency: "onetime",
          referenceDate: `${ot.month}-15`,
        }));
        const next: FinancePlan = { ...data, incomeSources: [...(data.incomeSources ?? []), ...migrated] };
        delete (next as FinancePlan & { oneTimeIncome?: unknown }).oneTimeIncome;
        setPlan(next);
        setDoc(ref, next).catch(console.error);
      } else {
        setPlan(data);
      }
    }, () => {});
  }, []);

  const save = useCallback((next: FinancePlan) => {
    setPlan(next);
    setDoc(doc(db, "finance", "plan"), next).catch(console.error);
  }, []);

  // ── Totals ──
  const { totalIncome, tomChecks } = useMemo(() => {
    let totalIncome = 0, tomChecks = 0;
    for (const src of plan.incomeSources) {
      const n = countPaydays(year, month, src.frequency, src.referenceDate);
      totalIncome += src.amount * n;
      if (src.owner === "Tom") tomChecks += n;
    }
    return { totalIncome, tomChecks };
  }, [plan.incomeSources, year, month]);

  const accounts = plan.bankAccounts ?? [];
  const mappings = plan.accountMappings ?? {};
  const acct = (role: AccountRole) => resolveAccount(role, accounts, mappings);

  const accountOptions = useMemo(() => {
    const names = accounts.map(displayName);
    return [...names, "Paycheck Deduction", "Other"];
  }, [accounts]);

  const totalNeeds        = plan.fixedExpenses.reduce((s, e) => s + expenseMonthly(e), 0);
  const totalSinkingFunds = (plan.sinkingFunds ?? []).reduce((s, f) => s + f.monthlyAmount, 0);
  const totalEmergency    = emergencyMonthly(plan.savings);
  const totalSavings      = totalEmergency + totalSinkingFunds;
  const totalWants        = Math.max(0, totalIncome - totalNeeds - totalSavings);

  const nudges: Nudge[] = useMemo(
    () => computePlanNudges({ totalIncome, totalNeeds, totalSavings, totalWants }),
    [totalIncome, totalNeeds, totalSavings, totalWants],
  );
  const verdict = verdictLevel(nudges);
  const hasPlan = totalIncome > 0;

  const chartSegs: Seg[] = [
    { label: "Needs",   value: totalNeeds,   color: PURPLE, target: 0.5 },
    { label: "Wants",   value: totalWants,   color: ORANGE, target: 0.3 },
    { label: "Savings", value: totalSavings, color: BLUE,   target: 0.2 },
  ];

  return (
    <div style={{ background: BG, minHeight: "100vh", fontFamily: "'Nunito',sans-serif", color: TEXT }}>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, background: "radial-gradient(ellipse 55% 35% at 10% 0%, rgba(40,90,70,0.2) 0%, transparent 60%), radial-gradient(ellipse 40% 30% at 90% 100%, rgba(20,40,80,0.22) 0%, transparent 60%)" }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1100, margin: "0 auto", padding: "24px 20px 64px" }}>

        <FinanceHeader month={month} year={year} isCurrentMonth={isCurrentMonth} onPrev={prevMonth} onNext={nextMonth} />

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

        {/* Verdict + advice */}
        <HealthVerdict level={verdict} count={nudges.length} hasPlan={hasPlan} />
        <NudgeList nudges={nudges} />

        {/* Income + overview */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <IncomeSection plan={plan} save={save} year={year} month={month} totalIncome={totalIncome} tomChecks={tomChecks} />
          <Card title="📊 50/30/20 Overview">
            <DonutChart segs={chartSegs} total={totalIncome} />
          </Card>
        </div>

        {/* Where money goes */}
        <AccountFundingSection
          totalIncome={totalIncome}
          needs={totalNeeds} savings={totalSavings} wants={totalWants}
          emergency={totalEmergency}
          sinkingFunds={totalSinkingFunds}
          spending={totalWants} acct={acct}
        />

        {/* Editing: expenses + savings/wants */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <FixedExpensesSection plan={plan} save={save} accountOptions={accountOptions} totalIncome={totalIncome} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <SavingsSection
              plan={plan} save={save} totalIncome={totalIncome}
              emergencyAcctName={acct("emergencySavings")} sinkingAcctName={acct("sinkingFunds")}
            />
            <WantsSection totalWants={totalWants} totalIncome={totalIncome} dailySpendingAcctName={acct("dailySpending")} />
          </div>
        </div>
      </div>
    </div>
  );
}
