import { useState, useEffect } from "react";
import {
  FinancePlan, IncomeSource, FixedExpense, SinkingFund,
  Frequency, IncomeFrequency, ExpenseFrequency, Owner,
  SURFACE_HI, BORDER, TEXT, TEXT_DIM, TEXT_MUTED,
  JADE, PURPLE, ORANGE, BLUE, AMBER, DANGER,
  INCOME_FREQ_LABELS, MONTH_NAMES, OWNER_COLOR,
  EXPENSE_FREQ_LABELS, EXPENSE_FREQ_MONTHLY, SAVINGS_FREQ_LABELS, SAVINGS_FREQ_MONTHLY,
  uid, fmt, fmtDec, pct, countPaydays, emergencyMonthly, expenseMonthly, monthsUntil,
  Card, Pill, InlineInput, SelectInput,
} from "./shared";

// ── Section header total (amount/mo + % of income) ──────────────────────────

function SectionTotal({ amount, color, pctVal, target, hasIncome }: {
  amount: number; color: string; pctVal: number; target: number; hasIncome: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 7 }}>
      <span style={{ fontSize: 16, fontWeight: 800, color }}>{fmt(amount)}/mo</span>
      {hasIncome && (
        <span style={{ fontSize: 11, fontWeight: 700, color: TEXT_DIM }}>
          {pctVal}%<span style={{ color: TEXT_MUTED }}>/{target}%</span>
        </span>
      )}
    </div>
  );
}

// ── Income section ────────────────────────────────────────────────────────

function oneTimeLands(referenceDate: string): string {
  if (!referenceDate) return "no date set";
  return new Date(referenceDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export function IncomeSection({ plan, save, year, month, totalIncome, tomChecks }: {
  plan: FinancePlan; save: (p: FinancePlan) => void;
  year: number; month: number; totalIncome: number; tomChecks: number;
}) {
  const [editId, setEditId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const blank = { id: "", name: "", owner: "Tom" as Owner, amount: 0, frequency: "biweekly" as IncomeFrequency, referenceDate: "" };
  const [draft, setDraft] = useState(blank);

  function openAdd() { setDraft({ ...blank, id: uid() }); setAdding(true); setEditId(null); }

  function openEdit(src: IncomeSource) {
    setDraft({ ...src, amount: src.amount as unknown as number });
    setEditId(src.id);
    setAdding(false);
  }

  function commitAdd() {
    if (!draft.name || !draft.amount) return;
    save({ ...plan, incomeSources: [...plan.incomeSources, { ...draft, amount: Number(draft.amount) }] });
    setAdding(false);
  }

  function commitEdit() {
    save({ ...plan, incomeSources: plan.incomeSources.map(s => s.id === draft.id ? { ...draft, amount: Number(draft.amount) } : s) });
    setEditId(null);
  }

  function remove(id: string) {
    save({ ...plan, incomeSources: plan.incomeSources.filter(s => s.id !== id) });
    if (editId === id) setEditId(null);
  }

  const sorted = [...plan.incomeSources].sort((a, b) => a.owner.localeCompare(b.owner));

  return (
    <Card
      title={`📅 ${MONTH_NAMES[month]} Income`}
      action={totalIncome > 0 ? <span style={{ fontSize: 16, fontWeight: 800, color: JADE }}>{fmt(totalIncome)}</span> : undefined}
    >
      {sorted.length === 0 && !adding && (
        <div style={{ color: TEXT_MUTED, fontSize: 13, fontStyle: "italic", textAlign: "center", padding: "16px 0" }}>Add income sources to get started — recurring paychecks or one-time checks.</div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {sorted.map(src => {
          const isEditing = editId === src.id;
          if (isEditing) {
            return <div key={src.id}><IncomeForm draft={draft} setDraft={setDraft} onSave={commitEdit} onCancel={() => setEditId(null)} onDelete={() => remove(src.id)} /></div>;
          }
          const isOneTime = src.frequency === "onetime";
          const checks = countPaydays(year, month, src.frequency, src.referenceDate);
          const total = src.amount * checks;
          const landsThisMonth = !isOneTime || checks > 0;
          return (
            <div key={src.id} onClick={() => openEdit(src)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${BORDER}`, cursor: "pointer", gap: 10, opacity: landsThisMonth ? 1 : 0.5 }}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = SURFACE_HI}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Pill color={OWNER_COLOR[src.owner]}>{src.owner}</Pill>
                <span style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>{src.name}</span>
                <span style={{ fontSize: 11, color: isOneTime ? AMBER : TEXT_DIM }}>{INCOME_FREQ_LABELS[src.frequency]}</span>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                {isOneTime ? (
                  <>
                    <div style={{ fontSize: 14, fontWeight: 800, color: landsThisMonth ? TEXT : TEXT_DIM }}>{fmtDec(src.amount)}</div>
                    <div style={{ fontSize: 10, color: TEXT_DIM }}>lands {oneTimeLands(src.referenceDate)}</div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 14, fontWeight: 800, color: TEXT }}>{fmt(total)}</div>
                    <div style={{ fontSize: 10, color: TEXT_DIM }}>{checks}× {fmtDec(src.amount)}</div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {adding && (
        <div style={{ marginTop: 14, padding: "14px", background: "rgba(93,184,138,0.05)", border: `1px solid ${JADE}30`, borderRadius: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: JADE, marginBottom: 12 }}>New Income Source</div>
          <IncomeForm draft={draft} setDraft={setDraft} onSave={commitAdd} onCancel={() => setAdding(false)} />
        </div>
      )}

      {totalIncome > 0 && (
        <div style={{ paddingTop: 10, marginTop: 4, borderTop: `1px solid ${BORDER}` }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: TEXT_DIM }}>Tom: {tomChecks} check{tomChecks !== 1 ? "s" : ""}</span>
        </div>
      )}
      <button onClick={openAdd} style={{ marginTop: 14, width: "100%", background: "transparent", border: `1px dashed ${BORDER}`, borderRadius: 8, color: JADE, fontSize: 12, fontWeight: 700, padding: "7px 0", cursor: "pointer", fontFamily: "'Nunito',sans-serif" }}>+ Add Income Source</button>
    </Card>
  );
}

function IncomeForm({ draft, setDraft, onSave, onCancel, onDelete }: {
  draft: Omit<IncomeSource, "amount"> & { amount: number };
  setDraft: (d: typeof draft) => void;
  onSave: () => void; onCancel: () => void; onDelete?: () => void;
}) {
  const set = (k: string, v: string | number) => setDraft({ ...draft, [k]: v });
  const isOneTime = draft.frequency === "onetime";
  const needsDate = isOneTime || draft.frequency === "weekly" || draft.frequency === "biweekly";
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
      <InlineInput label="Name" value={draft.name} onChange={v => set("name", v)} placeholder={isOneTime ? "e.g. Tax refund" : "e.g. Tom's paycheck"} />
      <SelectInput label="Owner" value={draft.owner} onChange={v => set("owner", v)}>
        <option>Tom</option><option>Partner</option><option>Business</option>
      </SelectInput>
      <InlineInput label={isOneTime ? "Amount ($)" : "Amount per check ($)"} value={String(draft.amount || "")} onChange={v => set("amount", v)} type="number" placeholder="0" />
      <SelectInput label="Frequency" value={draft.frequency} onChange={v => set("frequency", v)}>
        {Object.entries(INCOME_FREQ_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </SelectInput>
      {needsDate && (
        <div style={{ gridColumn: "span 2" }}>
          <InlineInput label={isOneTime ? "Date received" : "Reference payday date"} value={draft.referenceDate} onChange={v => set("referenceDate", v)} type="date" />
          <div style={{ fontSize: 11, color: TEXT_DIM, marginTop: 4 }}>
            {isOneTime
              ? "Sets which month this one-time check counts toward."
              : "Pick any known past or future payday — used to calculate exact checks per month."}
          </div>
        </div>
      )}
      <div style={{ gridColumn: "span 2", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onSave} style={{ background: JADE, border: "none", borderRadius: 8, color: "#06091a", fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 12, padding: "6px 16px", cursor: "pointer" }}>Save</button>
          <button onClick={onCancel} style={{ background: "transparent", border: `1px solid ${BORDER}`, borderRadius: 8, color: TEXT_DIM, fontFamily: "'Nunito',sans-serif", fontSize: 12, fontWeight: 700, padding: "6px 12px", cursor: "pointer" }}>Cancel</button>
        </div>
        {onDelete && (
          <button onClick={onDelete} style={{ background: "transparent", border: "none", color: DANGER, fontSize: 12, cursor: "pointer", fontFamily: "'Nunito',sans-serif" }}>Remove</button>
        )}
      </div>
    </div>
  );
}

// ── Fixed expenses ────────────────────────────────────────────────────────

type ExpenseDraft = Omit<FixedExpense, "frequency"> & { frequency: ExpenseFrequency };

function ExpenseForm({ draft, set, accountOptions, onSave, onCancel, onDelete }: {
  draft: ExpenseDraft;
  set: (k: string, v: string | number) => void;
  accountOptions: string[];
  onSave: () => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const isMonthly = draft.frequency === "monthly";
  const monthly = draft.amount * EXPENSE_FREQ_MONTHLY[draft.frequency];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", gap: 8 }}>
        <InlineInput label="Name" value={draft.name} onChange={v => set("name", v)} placeholder="e.g. Car insurance" />
        <InlineInput label="Amount ($)" value={String(draft.amount || "")} onChange={v => set("amount", v)} type="number" placeholder="0" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 80px", gap: 8 }}>
        <SelectInput label="Frequency" value={draft.frequency} onChange={v => set("frequency", v)}>
          {Object.entries(EXPENSE_FREQ_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </SelectInput>
        <InlineInput label="Day (opt)" value={draft.dayOfMonth ? String(draft.dayOfMonth) : ""} onChange={v => set("dayOfMonth", v ? Number(v) : 0)} type="number" placeholder="—" />
      </div>
      {!isMonthly && draft.amount > 0 && (
        <div style={{ fontSize: 11, color: TEXT_DIM, paddingLeft: 2 }}>
          ≈ <span style={{ color: BLUE, fontWeight: 700 }}>{fmtDec(monthly)}/mo</span> monthly equivalent
        </div>
      )}
      <SelectInput label="Account" value={draft.account} onChange={v => set("account", v)}>
        {accountOptions.map(a => <option key={a}>{a}</option>)}
        {draft.account && !accountOptions.includes(draft.account) && <option value={draft.account}>{draft.account}</option>}
      </SelectInput>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onSave} style={{ background: JADE, border: "none", borderRadius: 8, color: "#06091a", fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 12, padding: "6px 16px", cursor: "pointer" }}>Save</button>
          <button onClick={onCancel} style={{ background: "transparent", border: `1px solid ${BORDER}`, borderRadius: 8, color: TEXT_DIM, fontFamily: "'Nunito',sans-serif", fontWeight: 700, fontSize: 12, padding: "6px 12px", cursor: "pointer" }}>Cancel</button>
        </div>
        {onDelete && <button onClick={onDelete} style={{ background: "transparent", border: "none", color: DANGER, fontSize: 12, cursor: "pointer", fontFamily: "'Nunito',sans-serif" }}>Remove</button>}
      </div>
    </div>
  );
}

export function FixedExpensesSection({ plan, save, accountOptions, totalIncome }: {
  plan: FinancePlan; save: (p: FinancePlan) => void; accountOptions: string[]; totalIncome: number;
}) {
  const [editId, setEditId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const defaultAcct = accountOptions[0] ?? "Other";
  const blank: ExpenseDraft = { id: "", name: "", amount: 0, dayOfMonth: undefined, account: defaultAcct, frequency: "monthly" };
  const [draft, setDraft] = useState<ExpenseDraft>(blank);

  const sorted = [...plan.fixedExpenses].sort((a, b) => {
    const da = a.dayOfMonth ?? 999, db = b.dayOfMonth ?? 999;
    return da !== db ? da - db : a.name.localeCompare(b.name);
  });
  const totalMonthly = plan.fixedExpenses.reduce((s, e) => s + expenseMonthly(e), 0);

  function openAdd() { setDraft({ ...blank, id: uid(), account: defaultAcct }); setAdding(true); }

  function buildExpense(): FixedExpense {
    const e: FixedExpense = { ...draft, amount: Number(draft.amount) };
    if (e.frequency === "monthly") delete e.frequency;
    if (!e.dayOfMonth) delete e.dayOfMonth;
    return e;
  }

  function commitAdd() {
    if (!draft.name || !draft.amount) return;
    save({ ...plan, fixedExpenses: [...plan.fixedExpenses, buildExpense()] });
    setAdding(false);
  }

  function commitEdit() {
    save({ ...plan, fixedExpenses: plan.fixedExpenses.map(e => e.id === draft.id ? buildExpense() : e) });
    setEditId(null);
  }

  function remove(id: string) {
    save({ ...plan, fixedExpenses: plan.fixedExpenses.filter(e => e.id !== id) });
    if (editId === id) setEditId(null);
  }

  const set = (k: string, v: string | number) => setDraft(d => ({ ...d, [k]: v }));

  return (
    <Card
      title="📋 Fixed Expenses"
      action={totalMonthly > 0 ? <SectionTotal amount={totalMonthly} color={PURPLE} pctVal={pct(totalMonthly, totalIncome)} target={50} hasIncome={totalIncome > 0} /> : undefined}
    >
      {sorted.length === 0 && !adding && (
        <div style={{ color: TEXT_MUTED, fontSize: 13, fontStyle: "italic", textAlign: "center", padding: "16px 0" }}>No fixed expenses yet.</div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {sorted.map(exp => {
          const freq = exp.frequency ?? "monthly";
          const isMonthly = freq === "monthly";
          const monthly = expenseMonthly(exp);
          return (
            <div key={exp.id}>
              {editId === exp.id ? (
                <div style={{ padding: "12px 0", borderBottom: `1px solid ${BORDER}` }}>
                  <ExpenseForm draft={draft} set={set} accountOptions={accountOptions} onSave={commitEdit} onCancel={() => setEditId(null)} onDelete={() => remove(exp.id)} />
                </div>
              ) : (
                <div onClick={() => { setDraft({ ...exp, frequency: freq }); setEditId(exp.id); setAdding(false); }}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 4px", borderBottom: `1px solid ${BORDER}`, cursor: "pointer", transition: "background 0.1s" }}
                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = SURFACE_HI}
                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: TEXT_MUTED, width: 22, textAlign: "right", flexShrink: 0 }}>{exp.dayOfMonth ?? ""}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: TEXT, fontWeight: 600 }}>{exp.name}</div>
                    {!isMonthly && <div style={{ fontSize: 10, color: TEXT_DIM }}>{EXPENSE_FREQ_LABELS[freq]} · {fmtDec(monthly)}/mo equiv</div>}
                  </div>
                  {!isMonthly && <Pill color={BLUE}>{EXPENSE_FREQ_LABELS[freq]}</Pill>}
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: TEXT }}>{fmtDec(exp.amount)}</div>
                    <div style={{ fontSize: 10, color: TEXT_DIM }}>{exp.account}</div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {adding && (
        <div style={{ marginTop: 14, padding: 14, background: "rgba(93,184,138,0.05)", border: `1px solid ${JADE}30`, borderRadius: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: JADE, marginBottom: 12 }}>New Expense</div>
          <ExpenseForm draft={draft} set={set} accountOptions={accountOptions} onSave={commitAdd} onCancel={() => setAdding(false)} />
        </div>
      )}
      {!adding && <button onClick={openAdd} style={{ marginTop: 14, width: "100%", background: "transparent", border: `1px dashed ${BORDER}`, borderRadius: 8, color: JADE, fontSize: 12, fontWeight: 700, padding: "7px 0", cursor: "pointer", fontFamily: "'Nunito',sans-serif" }}>+ Add Expense</button>}
    </Card>
  );
}

// ── Savings (emergency fund + sinking funds combined) ──────────────────────

interface FundFormProps {
  draft: SinkingFund; setDraft: React.Dispatch<React.SetStateAction<SinkingFund>>;
  draftTarget: string; setDraftTarget: (v: string) => void;
  draftDue: string; setDraftDue: (v: string) => void;
  onSave: () => void; onCancel: () => void; onDelete?: () => void;
}

function FundForm({ draft, setDraft, draftTarget, setDraftTarget, draftDue, setDraftDue, onSave, onCancel, onDelete }: FundFormProps) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
      <div style={{ gridColumn: "span 2" }}>
        <InlineInput label="Name" value={draft.name} onChange={v => setDraft(d => ({ ...d, name: v }))} placeholder="e.g. New roof, Vacation" />
      </div>
      <InlineInput label="Monthly contribution ($)" value={String(draft.monthlyAmount || "")} onChange={v => setDraft(d => ({ ...d, monthlyAmount: Number(v) || 0 }))} type="number" placeholder="0" />
      <InlineInput label="Target amount ($, optional)" value={draftTarget} onChange={setDraftTarget} type="number" placeholder="e.g. 5000" />
      <div style={{ gridColumn: "span 2" }}>
        <InlineInput label="Due date (optional)" value={draftDue} onChange={setDraftDue} type="date" />
      </div>
      <div style={{ gridColumn: "span 2", display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 2 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onSave} style={{ background: JADE, border: "none", borderRadius: 8, color: "#06091a", fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 12, padding: "6px 16px", cursor: "pointer" }}>Save</button>
          <button onClick={onCancel} style={{ background: "transparent", border: `1px solid ${BORDER}`, borderRadius: 8, color: TEXT_DIM, fontFamily: "'Nunito',sans-serif", fontSize: 12, fontWeight: 700, padding: "6px 12px", cursor: "pointer" }}>Cancel</button>
        </div>
        {onDelete && <button onClick={onDelete} style={{ background: "transparent", border: "none", color: DANGER, fontSize: 12, cursor: "pointer", fontFamily: "'Nunito',sans-serif" }}>Remove</button>}
      </div>
    </div>
  );
}

const blankFund: SinkingFund = { id: "", name: "", monthlyAmount: 0 };

export function SavingsSection({ plan, save, totalIncome, emergencyAcctName, sinkingAcctName }: {
  plan: FinancePlan; save: (p: FinancePlan) => void;
  totalIncome: number; emergencyAcctName: string; sinkingAcctName: string;
}) {
  // ── Emergency savings ──
  const transfer = plan.savings.emergencyTransfer;
  const [editing, setEditing] = useState(false);
  const [draftAmt, setDraftAmt] = useState(String(transfer?.amount || plan.savings.emergency || ""));
  const [draftFreq, setDraftFreq] = useState<Frequency>(transfer?.frequency ?? "monthly");

  useEffect(() => {
    const t = plan.savings.emergencyTransfer;
    setDraftAmt(String(t?.amount || plan.savings.emergency || ""));
    setDraftFreq(t?.frequency ?? "monthly");
  }, [plan.savings]);

  function commitEmergency() {
    const amt = Number(draftAmt) || 0;
    const next = {
      ...plan.savings,
      emergency: amt,
      emergencyTransfer: amt > 0 ? { amount: amt, frequency: draftFreq } : undefined,
    };
    if (!next.emergencyTransfer) delete next.emergencyTransfer;
    save({ ...plan, savings: next });
    setEditing(false);
  }

  function cancelEmergency() {
    const t = plan.savings.emergencyTransfer;
    setDraftAmt(String(t?.amount || plan.savings.emergency || ""));
    setDraftFreq(t?.frequency ?? "monthly");
    setEditing(false);
  }

  const monthlyAmt = emergencyMonthly(plan.savings);
  const perTransferAmt = transfer?.amount ?? plan.savings.emergency;
  const freqLabel = SAVINGS_FREQ_LABELS[transfer?.frequency ?? "monthly"];
  const isMonthly = !transfer || transfer.frequency === "monthly";

  // ── Sinking funds ──
  const funds = plan.sinkingFunds ?? [];
  const totalSinkingFunds = funds.reduce((s, f) => s + f.monthlyAmount, 0);
  const [editId, setEditId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<SinkingFund>(blankFund);
  const [draftTarget, setDraftTarget] = useState("");
  const [draftDue, setDraftDue] = useState("");

  function openAddFund() {
    setDraft({ ...blankFund, id: uid() });
    setDraftTarget(""); setDraftDue("");
    setAdding(true); setEditId(null);
  }
  function openEditFund(f: SinkingFund) {
    setDraft(f);
    setDraftTarget(f.targetAmount != null ? String(f.targetAmount) : "");
    setDraftDue(f.dueDate ?? "");
    setEditId(f.id); setAdding(false);
  }
  function buildFund(): SinkingFund {
    const fund: SinkingFund = { ...draft, monthlyAmount: Number(draft.monthlyAmount) || 0 };
    if (draftTarget) fund.targetAmount = Number(draftTarget);
    else delete fund.targetAmount;
    if (draftDue) fund.dueDate = draftDue;
    else delete fund.dueDate;
    return fund;
  }
  function commitAddFund() {
    if (!draft.name || !draft.monthlyAmount) return;
    save({ ...plan, sinkingFunds: [...funds, buildFund()] });
    setAdding(false);
  }
  function commitEditFund() {
    save({ ...plan, sinkingFunds: funds.map(f => f.id === draft.id ? buildFund() : f) });
    setEditId(null);
  }
  function removeFund(id: string) {
    save({ ...plan, sinkingFunds: funds.filter(f => f.id !== id) });
    if (editId === id) setEditId(null);
  }
  const formProps = { draft, setDraft, draftTarget, setDraftTarget, draftDue, setDraftDue };

  const totalSavings = monthlyAmt + totalSinkingFunds;
  const pctVal = pct(totalSavings, totalIncome);

  return (
    <Card
      title="🛡️ Savings"
      action={totalSavings > 0 ? <SectionTotal amount={totalSavings} color={JADE} pctVal={pctVal} target={20} hasIncome={totalIncome > 0} /> : undefined}
    >
      {/* Emergency savings */}
      {editing ? (
        <div style={{ marginBottom: 6 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 8 }}>
            <InlineInput label="Amount per transfer ($)" value={draftAmt} onChange={setDraftAmt} type="number" placeholder="0" />
            <SelectInput label="Transfer frequency" value={draftFreq} onChange={v => setDraftFreq(v as Frequency)}>
              {Object.entries(SAVINGS_FREQ_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </SelectInput>
          </div>
          {Number(draftAmt) > 0 && draftFreq !== "monthly" && (
            <div style={{ fontSize: 11, color: TEXT_DIM, marginBottom: 8 }}>
              ≈ <span style={{ color: JADE, fontWeight: 700 }}>{fmtDec(Number(draftAmt) * SAVINGS_FREQ_MONTHLY[draftFreq])}/mo</span> monthly equivalent
            </div>
          )}
          <div style={{ fontSize: 11, color: TEXT_DIM, marginBottom: 10 }}>→ {emergencyAcctName}</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={commitEmergency} style={{ background: JADE, border: "none", borderRadius: 8, color: "#06091a", fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 12, padding: "6px 16px", cursor: "pointer" }}>Save</button>
            <button onClick={cancelEmergency} style={{ background: "transparent", border: `1px solid ${BORDER}`, borderRadius: 8, color: TEXT_DIM, fontFamily: "'Nunito',sans-serif", fontWeight: 700, fontSize: 12, padding: "6px 12px", cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      ) : (
        <div onClick={() => setEditing(true)}
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 4px", borderBottom: `1px solid ${BORDER}`, cursor: "pointer", borderRadius: 6 }}
          onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = SURFACE_HI}
          onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>Emergency savings</div>
            <div style={{ fontSize: 11, color: TEXT_DIM, marginTop: 2 }}>
              {perTransferAmt > 0 ? `${freqLabel} · ${fmtDec(perTransferAmt)}/transfer` : "—"}
            </div>
            <div style={{ fontSize: 11, color: TEXT_DIM }}>→ {emergencyAcctName}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: monthlyAmt > 0 ? JADE : TEXT_MUTED }}>
              {monthlyAmt > 0 ? `${fmt(monthlyAmt)}/mo` : "—"}
            </div>
            {!isMonthly && monthlyAmt > 0 && (
              <div style={{ fontSize: 10, color: TEXT_DIM, marginTop: 2 }}>monthly equiv</div>
            )}
          </div>
        </div>
      )}

      {/* Sinking funds */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 16, marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: TEXT_DIM, letterSpacing: 1, textTransform: "uppercase" }}>Sinking Funds</span>
        {totalSinkingFunds > 0 && (
          <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: "#4a7fc1" }}>{fmt(totalSinkingFunds)}/mo</span>
            {sinkingAcctName && <span style={{ fontSize: 10, color: TEXT_MUTED }}>→ {sinkingAcctName}</span>}
          </div>
        )}
      </div>

      {funds.length === 0 && !adding && (
        <div style={{ color: TEXT_MUTED, fontSize: 13, fontStyle: "italic", padding: "6px 0" }}>No sinking funds yet — add goals like a vacation, car repair, or new appliance.</div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {funds.map(f => {
          const mo = f.dueDate ? monthsUntil(f.dueDate) : null;
          const projected = mo != null ? f.monthlyAmount * mo : null;
          const fillPct = (projected != null && f.targetAmount) ? Math.min(100, (projected / f.targetAmount) * 100) : null;
          const onTrack = fillPct != null && fillPct >= 95;

          return editId === f.id ? (
            <div key={f.id} style={{ padding: "12px 0", borderBottom: `1px solid ${BORDER}` }}>
              <FundForm {...formProps} onSave={commitEditFund} onCancel={() => setEditId(null)} onDelete={() => removeFund(f.id)} />
            </div>
          ) : (
            <div key={f.id} onClick={() => openEditFund(f)}
              style={{ padding: "10px 4px", borderBottom: `1px solid ${BORDER}`, cursor: "pointer", transition: "background 0.1s" }}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = SURFACE_HI}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: fillPct != null ? 6 : 0 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>{f.name}</div>
                  <div style={{ fontSize: 11, color: TEXT_DIM, marginTop: 2 }}>
                    {fmt(f.monthlyAmount)}/mo
                    {f.targetAmount != null && <span> · target {fmt(f.targetAmount)}</span>}
                    {mo != null && <span> · <span style={{ color: mo <= 3 ? DANGER : mo <= 6 ? AMBER : TEXT_DIM }}>{mo === 0 ? "due this month" : `${mo} mo`}</span></span>}
                    {projected != null && f.targetAmount != null && (
                      <span style={{ color: onTrack ? JADE : DANGER }}> · saves {fmt(projected)} by due date</span>
                    )}
                    {f.dueDate && !f.targetAmount && (
                      <span> · due {new Date(f.dueDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", year: "numeric" })}</span>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#4a7fc1", flexShrink: 0, marginLeft: 12 }}>{fmt(f.monthlyAmount)}/mo</div>
              </div>
              {fillPct != null && (
                <div>
                  <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: 2, background: onTrack ? JADE : AMBER, width: `${fillPct}%`, transition: "width 0.5s ease" }} />
                  </div>
                  <div style={{ fontSize: 10, color: onTrack ? JADE : AMBER, marginTop: 3, fontWeight: 700 }}>
                    {fillPct.toFixed(0)}% of target by due date
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {adding && (
        <div style={{ marginTop: 14, padding: 14, background: "rgba(93,184,138,0.05)", border: `1px solid ${JADE}30`, borderRadius: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: JADE, marginBottom: 12 }}>New Sinking Fund</div>
          <FundForm {...formProps} onSave={commitAddFund} onCancel={() => setAdding(false)} />
        </div>
      )}
      {!adding && <button onClick={openAddFund} style={{ marginTop: 14, width: "100%", background: "transparent", border: `1px dashed ${BORDER}`, borderRadius: 8, color: JADE, fontSize: 12, fontWeight: 700, padding: "7px 0", cursor: "pointer", fontFamily: "'Nunito',sans-serif" }}>+ Add Sinking Fund</button>}
    </Card>
  );
}

// ── Wants ─────────────────────────────────────────────────────────────────

export function WantsSection({ totalWants, totalIncome, dailySpendingAcctName }: {
  totalWants: number; totalIncome: number; dailySpendingAcctName: string;
}) {
  const wantsPct = pct(totalWants, totalIncome);
  const onTarget = Math.abs(wantsPct - 30) <= 3;

  return (
    <Card title="🛍️ Safe to Spend">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
            → {dailySpendingAcctName}
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: totalWants > 0 ? ORANGE : TEXT_MUTED }}>
            {totalWants > 0 ? fmt(totalWants) : "—"}
          </div>
          <div style={{ fontSize: 11, color: TEXT_DIM, marginTop: 4 }}>per month after needs &amp; savings</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, color: TEXT_DIM, fontWeight: 600, marginBottom: 4 }}>of income</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: onTarget ? JADE : DANGER }}>
            {totalIncome > 0 ? `${wantsPct}%` : "—"}
          </div>
          <div style={{ fontSize: 10, color: TEXT_DIM, marginTop: 2 }}>target 30%</div>
        </div>
      </div>
    </Card>
  );
}
