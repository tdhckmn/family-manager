import { useState, useEffect } from "react";
import {
  FinancePlan, IncomeSource, FixedExpense, SinkingFund, BankAccount, PaycheckSplit, SplitType,
  AccountMappings,
  Frequency, IncomeFrequency, ExpenseFrequency, Owner,
  SURFACE, SURFACE_HI, BORDER, TEXT, TEXT_DIM, TEXT_MUTED,
  JADE, PURPLE, BLUE, AMBER, DANGER, PINK, TEAL,
  INCOME_FREQ_LABELS, MONTH_NAMES, OWNER_COLOR,
  EXPENSE_FREQ_LABELS, EXPENSE_FREQ_MONTHLY, SAVINGS_FREQ_LABELS, SAVINGS_FREQ_MONTHLY,
  uid, fmt, fmtDec, pct, countPaydays, emergencyMonthly, expenseMonthly, monthsUntil, displayName,
  normalizeIds,
  Card, Pill, InlineInput, SelectInput, useIsMobile,
} from "./shared";
import { Nudge, AccountFlow, AccountKind } from "./nudges";
import { Icon } from "../../components/Icon";

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

// ── Inline section warnings ─────────────────────────────────────────────────

export function SectionNudges({ nudges }: { nudges?: Nudge[] }) {
  if (!nudges || nudges.length === 0) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
      {nudges.map(n => {
        const color = n.level === "danger" ? DANGER : AMBER;
        return (
          <div key={n.id} style={{ background: `${color}10`, border: `1px solid ${color}35`, borderLeft: `3px solid ${color}`, borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ fontSize: 12, fontWeight: 800, color, marginBottom: 2 }}>{n.title}</div>
            <div style={{ fontSize: 12, color: TEXT, lineHeight: 1.45 }}>{n.message}</div>
          </div>
        );
      })}
    </div>
  );
}

// ── Income section ────────────────────────────────────────────────────────

function oneTimeLands(referenceDate: string): string {
  if (!referenceDate) return "no date set";
  return new Date(referenceDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export function IncomeSection({ plan, save, year, month, totalIncome, bankAccounts }: {
  plan: FinancePlan; save: (p: FinancePlan) => void;
  year: number; month: number; totalIncome: number; bankAccounts: BankAccount[];
}) {
  const [editId, setEditId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const blank = { id: "", name: "", owner: "Self" as Owner, amount: 0, frequency: "biweekly" as IncomeFrequency, referenceDate: "", splits: [] as PaycheckSplit[] };
  const [draft, setDraft] = useState(blank);

  function openAdd() { setDraft({ ...blank, id: uid() }); setAdding(true); setEditId(null); }

  function openEdit(src: IncomeSource) {
    // Migrate legacy destinationAccountId → splits on open
    const splits = src.splits && src.splits.length > 0
      ? src.splits
      : src.destinationAccountId
        ? [{ order: 1, type: "balance" as SplitType, accountId: src.destinationAccountId }]
        : [];
    setDraft({ ...src, amount: src.amount as unknown as number, splits });
    setEditId(src.id);
    setAdding(false);
  }

  function buildSource(): IncomeSource {
    const { splits, ...rest } = draft;
    const src: IncomeSource = { ...rest, amount: Number(rest.amount), splits };
    // Clear legacy field if present
    delete src.destinationAccountId;
    return src;
  }

  function commitAdd() {
    if (!draft.name || !draft.amount) return;
    save({ ...plan, incomeSources: [...plan.incomeSources, buildSource()] });
    setAdding(false);
  }

  function commitEdit() {
    save({ ...plan, incomeSources: plan.incomeSources.map(s => s.id === draft.id ? buildSource() : s) });
    setEditId(null);
  }

  function remove(id: string) {
    save({ ...plan, incomeSources: plan.incomeSources.filter(s => s.id !== id) });
    if (editId === id) setEditId(null);
  }

  const sorted = [...plan.incomeSources]
    .filter(src =>
      src.frequency !== "onetime" || countPaydays(year, month, src.frequency, src.referenceDate) > 0
    )
    .sort((a, b) => a.owner.localeCompare(b.owner));

  return (
    <Card
      icon={<Icon name="calendar" />}
      title={`${MONTH_NAMES[month]} Income`}
      action={totalIncome > 0 ? <span style={{ fontSize: 16, fontWeight: 800, color: JADE }}>{fmt(totalIncome)}</span> : undefined}
    >
      {sorted.length === 0 && !adding && (
        <div style={{ color: TEXT_MUTED, fontSize: 13, fontStyle: "italic", textAlign: "center", padding: "16px 0" }}>Add income sources to get started — recurring paychecks or one-time checks.</div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {sorted.map(src => {
          const isEditing = editId === src.id;
          if (isEditing) {
            return <div key={src.id}><IncomeForm draft={draft} setDraft={setDraft} bankAccounts={bankAccounts} onSave={commitEdit} onCancel={() => setEditId(null)} onDelete={() => remove(src.id)} /></div>;
          }
          const isOneTime = src.frequency === "onetime";
          const checks = countPaydays(year, month, src.frequency, src.referenceDate);
          const total = src.amount * checks;
          // Resolve effective splits (including legacy destinationAccountId)
          const effectiveSplits = src.splits && src.splits.length > 0
            ? src.splits
            : src.destinationAccountId
              ? [{ order: 1, type: "balance" as SplitType, accountId: src.destinationAccountId }]
              : [];
          const splitSummary = effectiveSplits.length === 0
            ? <span style={{ color: AMBER }}> · no account linked</span>
            : effectiveSplits.length === 1
              ? (() => {
                  const a = bankAccounts.find(a => a.id === effectiveSplits[0].accountId);
                  return <span style={{ color: TEXT_MUTED }}> · → {a ? displayName(a) : "unknown"}</span>;
                })()
              : <span style={{ color: TEXT_MUTED }}> · {effectiveSplits.length} splits</span>;

          return (
            <div key={src.id} onClick={() => openEdit(src)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${BORDER}`, cursor: "pointer", gap: 10 }}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = SURFACE_HI}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <Pill color={OWNER_COLOR[src.owner]}>{src.owner}</Pill>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>{src.name}</div>
                  <div style={{ fontSize: 10, color: TEXT_DIM }}>
                    <span style={{ color: isOneTime ? AMBER : TEXT_DIM }}>{INCOME_FREQ_LABELS[src.frequency]}</span>
                    {splitSummary}
                  </div>
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                {isOneTime ? (
                  <>
                    <div style={{ fontSize: 14, fontWeight: 800, color: TEXT }}>{fmtDec(src.amount)}</div>
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
          <IncomeForm draft={draft} setDraft={setDraft} bankAccounts={bankAccounts} onSave={commitAdd} onCancel={() => setAdding(false)} />
        </div>
      )}

      <button onClick={openAdd} style={{ marginTop: 14, width: "100%", background: "transparent", border: `1px dashed ${BORDER}`, borderRadius: 8, color: JADE, fontSize: 12, fontWeight: 700, padding: "7px 0", cursor: "pointer", fontFamily: "'Montserrat',sans-serif" }}>+ Add Income Source</button>
    </Card>
  );
}

function SplitEditor({ splits, onChange, bankAccounts, perCheck }: {
  splits: PaycheckSplit[];
  onChange: (splits: PaycheckSplit[]) => void;
  bankAccounts: BankAccount[];
  perCheck: number;
}) {
  const accts = bankAccounts.filter(a => !a.ignored);
  const hasBalance = splits.some(s => s.type === "balance");

  function addRow(type: SplitType) {
    const next: PaycheckSplit = {
      order: splits.length + 1,
      type,
      value: type === "percentage" ? 100 : type === "amount" ? 0 : undefined,
      accountId: accts[0]?.id ?? "",
    };
    onChange([...splits, next]);
  }

  function update(idx: number, patch: Partial<PaycheckSplit>) {
    onChange(splits.map((s, i) => i === idx ? { ...s, ...patch } : s));
  }

  function remove(idx: number) {
    const next = splits.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i + 1 }));
    onChange(next);
  }

  function move(idx: number, dir: -1 | 1) {
    const next = [...splits];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    onChange(next.map((s, i) => ({ ...s, order: i + 1 })));
  }

  // Validation: sum of non-balance allocations
  const allocated = splits.reduce((sum, s) => {
    if (s.type === "amount") return sum + (s.value ?? 0);
    if (s.type === "percentage") return sum + ((s.value ?? 0) / 100) * perCheck;
    return sum;
  }, 0);
  const over = perCheck > 0 && allocated > perCheck + 0.01;

  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: TEXT_DIM, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>
        Direct Deposit Splits
      </div>

      {splits.length === 0 && (
        <div style={{ fontSize: 12, color: TEXT_MUTED, fontStyle: "italic", marginBottom: 8 }}>No splits — add rows below.</div>
      )}

      {splits.map((sp, idx) => {
        const acct = accts.find(a => a.id === sp.accountId);
        return (
          <div key={idx} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            {/* Order badge */}
            <span style={{ fontSize: 10, fontWeight: 800, color: TEXT_MUTED, width: 16, textAlign: "right", flexShrink: 0 }}>{sp.order}</span>

            {/* Type selector */}
            <select
              value={sp.type}
              onChange={e => update(idx, { type: e.target.value as SplitType, value: e.target.value === "balance" ? undefined : sp.value })}
              style={{ background: "rgba(0,0,0,0.25)", border: `1px solid ${BORDER}`, borderRadius: 6, padding: "5px 6px", color: TEXT, fontSize: 12, fontFamily: "'Montserrat',sans-serif", outline: "none", flexShrink: 0 }}
            >
              <option value="amount">$</option>
              <option value="percentage">%</option>
              <option value="balance">balance</option>
            </select>

            {/* Value input — hidden for "balance" */}
            {sp.type !== "balance" ? (
              <input
                type="number"
                value={sp.value ?? ""}
                onChange={e => update(idx, { value: Number(e.target.value) || 0 })}
                placeholder={sp.type === "percentage" ? "100" : "0"}
                style={{ background: "rgba(0,0,0,0.25)", border: `1px solid ${BORDER}`, borderRadius: 6, padding: "5px 8px", color: TEXT, fontSize: 12, fontFamily: "'Montserrat',sans-serif", outline: "none", width: 72, flexShrink: 0 }}
                onFocus={e => (e.target.style.borderColor = JADE + "80")}
                onBlur={e => (e.target.style.borderColor = BORDER)}
              />
            ) : (
              <span style={{ width: 72, flexShrink: 0, fontSize: 11, color: TEXT_MUTED, paddingLeft: 4 }}>remainder</span>
            )}

            {/* Account selector */}
            <select
              value={sp.accountId}
              onChange={e => update(idx, { accountId: e.target.value })}
              style={{ background: "rgba(0,0,0,0.25)", border: `1px solid ${BORDER}`, borderRadius: 6, padding: "5px 6px", color: acct ? TEXT : AMBER, fontSize: 12, fontFamily: "'Montserrat',sans-serif", outline: "none", flex: 1, minWidth: 0 }}
            >
              {!acct && <option value="">— pick account —</option>}
              {accts.map(a => <option key={a.id} value={a.id}>{displayName(a)}</option>)}
            </select>

            {/* Reorder */}
            <button onClick={() => move(idx, -1)} disabled={idx === 0} style={{ background: "transparent", border: "none", color: idx === 0 ? TEXT_MUTED : TEXT_DIM, cursor: idx === 0 ? "default" : "pointer", fontSize: 12, padding: "2px 3px", fontFamily: "'Montserrat',sans-serif" }}>↑</button>
            <button onClick={() => move(idx, 1)} disabled={idx === splits.length - 1} style={{ background: "transparent", border: "none", color: idx === splits.length - 1 ? TEXT_MUTED : TEXT_DIM, cursor: idx === splits.length - 1 ? "default" : "pointer", fontSize: 12, padding: "2px 3px", fontFamily: "'Montserrat',sans-serif" }}>↓</button>

            {/* Remove */}
            <button onClick={() => remove(idx)} style={{ background: "transparent", border: "none", color: DANGER, fontSize: 14, cursor: "pointer", fontFamily: "'Montserrat',sans-serif", padding: "2px 3px" }}>×</button>
          </div>
        );
      })}

      {over && (
        <div style={{ fontSize: 11, color: DANGER, marginBottom: 6 }}>
          ⚠ Splits exceed the check amount by {(allocated - perCheck).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}.
        </div>
      )}

      {/* Add buttons */}
      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
        <button onClick={() => addRow("amount")} style={{ background: "transparent", border: `1px dashed ${BORDER}`, borderRadius: 6, color: JADE, fontSize: 11, fontWeight: 700, padding: "4px 10px", cursor: "pointer", fontFamily: "'Montserrat',sans-serif" }}>+ $</button>
        <button onClick={() => addRow("percentage")} style={{ background: "transparent", border: `1px dashed ${BORDER}`, borderRadius: 6, color: JADE, fontSize: 11, fontWeight: 700, padding: "4px 10px", cursor: "pointer", fontFamily: "'Montserrat',sans-serif" }}>+ %</button>
        {!hasBalance && <button onClick={() => addRow("balance")} style={{ background: "transparent", border: `1px dashed ${BORDER}`, borderRadius: 6, color: JADE, fontSize: 11, fontWeight: 700, padding: "4px 10px", cursor: "pointer", fontFamily: "'Montserrat',sans-serif" }}>+ balance</button>}
      </div>
    </div>
  );
}

function IncomeForm({ draft, setDraft, bankAccounts, onSave, onCancel, onDelete }: {
  draft: Omit<IncomeSource, "amount"> & { amount: number; splits: PaycheckSplit[] };
  setDraft: (d: typeof draft) => void;
  bankAccounts: BankAccount[];
  onSave: () => void; onCancel: () => void; onDelete?: () => void;
}) {
  const set = (k: string, v: string | number) => setDraft({ ...draft, [k]: v });
  const isOneTime = draft.frequency === "onetime";
  const needsDate = isOneTime || draft.frequency === "weekly" || draft.frequency === "biweekly";
  const isMobile = useIsMobile();
  return (
    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
      <InlineInput label="Name" value={draft.name} onChange={v => set("name", v)} placeholder={isOneTime ? "e.g. Tax refund" : "e.g. Paycheck"} />
      <SelectInput label="Owner" value={draft.owner} onChange={v => set("owner", v)}>
        <option>Self</option><option>Partner</option><option>Business</option>
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
      <div style={{ gridColumn: "span 2" }}>
        <SplitEditor
          splits={draft.splits}
          onChange={splits => setDraft({ ...draft, splits })}
          bankAccounts={bankAccounts}
          perCheck={Number(draft.amount) || 0}
        />
      </div>
      <div style={{ gridColumn: "span 2", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onSave} style={{ background: JADE, border: "none", borderRadius: 8, color: "#06091a", fontFamily: "'Montserrat',sans-serif", fontWeight: 800, fontSize: 12, padding: "6px 16px", cursor: "pointer" }}>Save</button>
          <button onClick={onCancel} style={{ background: "transparent", border: `1px solid ${BORDER}`, borderRadius: 8, color: TEXT_DIM, fontFamily: "'Montserrat',sans-serif", fontSize: 12, fontWeight: 700, padding: "6px 12px", cursor: "pointer" }}>Cancel</button>
        </div>
        {onDelete && (
          <button onClick={onDelete} style={{ background: "transparent", border: "none", color: DANGER, fontSize: 12, cursor: "pointer", fontFamily: "'Montserrat',sans-serif" }}>Remove</button>
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
      <InlineInput label="Website URL (optional)" value={draft.url ?? ""} onChange={v => set("url", v)} placeholder="https://…" />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onSave} style={{ background: JADE, border: "none", borderRadius: 8, color: "#06091a", fontFamily: "'Montserrat',sans-serif", fontWeight: 800, fontSize: 12, padding: "6px 16px", cursor: "pointer" }}>Save</button>
          <button onClick={onCancel} style={{ background: "transparent", border: `1px solid ${BORDER}`, borderRadius: 8, color: TEXT_DIM, fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 12, padding: "6px 12px", cursor: "pointer" }}>Cancel</button>
        </div>
        {onDelete && <button onClick={onDelete} style={{ background: "transparent", border: "none", color: DANGER, fontSize: 12, cursor: "pointer", fontFamily: "'Montserrat',sans-serif" }}>Remove</button>}
      </div>
    </div>
  );
}

type ExpenseSortKey = "date" | "name" | "amount";

export function FixedExpensesSection({ plan, save, accountOptions, totalIncome }: {
  plan: FinancePlan; save: (p: FinancePlan) => void; accountOptions: string[]; totalIncome: number;
}) {
  const [editId, setEditId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [sortKey, setSortKey] = useState<ExpenseSortKey>("date");
  const [sortDir, setSortDir] = useState<1 | -1>(1);
  const defaultAcct = accountOptions[0] ?? "Other";
  const blank: ExpenseDraft = { id: "", name: "", amount: 0, dayOfMonth: undefined, account: defaultAcct, frequency: "monthly" };
  const [draft, setDraft] = useState<ExpenseDraft>(blank);

  function toggleSort(key: ExpenseSortKey) {
    if (key === sortKey) setSortDir(d => (d === 1 ? -1 : 1));
    else { setSortKey(key); setSortDir(key === "amount" ? -1 : 1); }
  }

  const sorted = [...plan.fixedExpenses].sort((a, b) => {
    let cmp: number;
    if (sortKey === "name") {
      cmp = a.name.localeCompare(b.name);
    } else if (sortKey === "amount") {
      cmp = expenseMonthly(a) - expenseMonthly(b);
    } else {
      const da = a.dayOfMonth ?? 999, db = b.dayOfMonth ?? 999;
      cmp = da !== db ? da - db : a.name.localeCompare(b.name);
    }
    return cmp * sortDir;
  });
  const totalMonthly = plan.fixedExpenses.reduce((s, e) => s + expenseMonthly(e), 0);

  function openAdd() { setDraft({ ...blank, id: uid(), account: defaultAcct }); setAdding(true); }

  function buildExpense(): FixedExpense {
    const e: FixedExpense = { ...draft, amount: Number(draft.amount) };
    if (e.frequency === "monthly") delete e.frequency;
    if (!e.dayOfMonth) delete e.dayOfMonth;
    if (e.url) e.url = e.url.trim();
    if (!e.url) delete e.url;
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
      icon={<Icon name="list" />}
      title="Fixed Expenses"
      action={totalMonthly > 0 ? <SectionTotal amount={totalMonthly} color={PURPLE} pctVal={pct(totalMonthly, totalIncome)} target={50} hasIncome={totalIncome > 0} /> : undefined}
    >
      {sorted.length === 0 && !adding && (
        <div style={{ color: TEXT_MUTED, fontSize: 13, fontStyle: "italic", textAlign: "center", padding: "16px 0" }}>No fixed expenses yet.</div>
      )}

      {plan.fixedExpenses.length > 1 && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: TEXT_MUTED, letterSpacing: 1, textTransform: "uppercase", marginRight: 2 }}>Sort</span>
          {([["date", "Date"], ["name", "Name"], ["amount", "Amount"]] as [ExpenseSortKey, string][]).map(([key, label]) => {
            const active = sortKey === key;
            return (
              <button key={key} onClick={() => toggleSort(key)}
                style={{
                  background: active ? `${JADE}1a` : "transparent",
                  border: `1px solid ${active ? JADE + "55" : BORDER}`,
                  borderRadius: 7, color: active ? JADE : TEXT_DIM,
                  fontSize: 11, fontWeight: 700, padding: "3px 9px", cursor: "pointer",
                  fontFamily: "'Montserrat',sans-serif", display: "flex", alignItems: "center", gap: 3,
                }}>
                {label}{active && <span style={{ fontSize: 9 }}>{sortDir === 1 ? "▲" : "▼"}</span>}
              </button>
            );
          })}
        </div>
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
                    <div style={{ fontSize: 13, color: TEXT, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                      {exp.name}
                      {exp.url && (
                        <a href={exp.url} target="_blank" rel="noopener noreferrer" title={`Open ${exp.name} website`}
                          onClick={e => e.stopPropagation()}
                          style={{ color: JADE, fontSize: 11, textDecoration: "none", opacity: 0.7, flexShrink: 0, lineHeight: 1 }}
                          onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.opacity = "1"}
                          onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.opacity = "0.7"}>
                          ↗
                        </a>
                      )}
                    </div>
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
      {!adding && <button onClick={openAdd} style={{ marginTop: 14, width: "100%", background: "transparent", border: `1px dashed ${BORDER}`, borderRadius: 8, color: JADE, fontSize: 12, fontWeight: 700, padding: "7px 0", cursor: "pointer", fontFamily: "'Montserrat',sans-serif" }}>+ Add Expense</button>}
    </Card>
  );
}

// ── Savings (emergency fund + sinking funds combined) ──────────────────────

interface FundFormProps {
  draft: SinkingFund; setDraft: React.Dispatch<React.SetStateAction<SinkingFund>>;
  draftTarget: string; setDraftTarget: (v: string) => void;
  draftDue: string; setDraftDue: (v: string) => void;
  sinkingAccounts: BankAccount[];
  onSave: () => void; onCancel: () => void; onDelete?: () => void;
}

function FundForm({ draft, setDraft, draftTarget, setDraftTarget, draftDue, setDraftDue, sinkingAccounts, onSave, onCancel, onDelete }: FundFormProps) {
  const isMobile = useIsMobile();
  const showAccount = sinkingAccounts.length > 1;
  return (
    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
      <div style={{ gridColumn: "span 2" }}>
        <InlineInput label="Name" value={draft.name} onChange={v => setDraft(d => ({ ...d, name: v }))} placeholder="e.g. New roof, Vacation" />
      </div>
      <InlineInput label="Monthly contribution ($)" value={String(draft.monthlyAmount || "")} onChange={v => setDraft(d => ({ ...d, monthlyAmount: Number(v) || 0 }))} type="number" placeholder="0" />
      <InlineInput label="Target amount ($, optional)" value={draftTarget} onChange={setDraftTarget} type="number" placeholder="e.g. 5000" />
      <div style={{ gridColumn: "span 2" }}>
        <InlineInput label="Due date (optional)" value={draftDue} onChange={setDraftDue} type="date" />
      </div>
      {showAccount && (
        <div style={{ gridColumn: "span 2" }}>
          <SelectInput label="Held in account" value={draft.accountId ?? ""} onChange={v => setDraft(d => ({ ...d, accountId: v || undefined }))}>
            <option value="">— pick account —</option>
            {sinkingAccounts.map(a => <option key={a.id} value={a.id}>{displayName(a)}</option>)}
          </SelectInput>
        </div>
      )}
      <div style={{ gridColumn: "span 2", display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 2 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onSave} style={{ background: JADE, border: "none", borderRadius: 8, color: "#06091a", fontFamily: "'Montserrat',sans-serif", fontWeight: 800, fontSize: 12, padding: "6px 16px", cursor: "pointer" }}>Save</button>
          <button onClick={onCancel} style={{ background: "transparent", border: `1px solid ${BORDER}`, borderRadius: 8, color: TEXT_DIM, fontFamily: "'Montserrat',sans-serif", fontSize: 12, fontWeight: 700, padding: "6px 12px", cursor: "pointer" }}>Cancel</button>
        </div>
        {onDelete && <button onClick={onDelete} style={{ background: "transparent", border: "none", color: DANGER, fontSize: 12, cursor: "pointer", fontFamily: "'Montserrat',sans-serif" }}>Remove</button>}
      </div>
    </div>
  );
}

const blankFund: SinkingFund = { id: "", name: "", monthlyAmount: 0 };

export function SavingsSection({ plan, save, totalIncome, emergencyAcctName, sinkingAccounts }: {
  plan: FinancePlan; save: (p: FinancePlan) => void;
  totalIncome: number; emergencyAcctName: string; sinkingAccounts: BankAccount[];
}) {
  const isMobile = useIsMobile();
  const sinkingAcctName = sinkingAccounts.length > 0 ? sinkingAccounts.map(displayName).join(" & ") : "Sinking Funds";
  const multiSinking = sinkingAccounts.length > 1;

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
    // Only persist accountId when several sinking accounts exist and one is chosen & still valid
    if (multiSinking && fund.accountId && sinkingAccounts.some(a => a.id === fund.accountId)) {
      // keep
    } else {
      delete fund.accountId;
    }
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
  const formProps = { draft, setDraft, draftTarget, setDraftTarget, draftDue, setDraftDue, sinkingAccounts };

  const totalSavings = monthlyAmt + totalSinkingFunds;
  const pctVal = pct(totalSavings, totalIncome);

  return (
    <Card
      icon={<Icon name="shield" />}
      title="Savings"
      action={totalSavings > 0 ? <SectionTotal amount={totalSavings} color={JADE} pctVal={pctVal} target={20} hasIncome={totalIncome > 0} /> : undefined}
    >
      {/* Emergency savings */}
      {editing ? (
        <div style={{ marginBottom: 6 }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10, marginBottom: 8 }}>
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
            <button onClick={commitEmergency} style={{ background: JADE, border: "none", borderRadius: 8, color: "#06091a", fontFamily: "'Montserrat',sans-serif", fontWeight: 800, fontSize: 12, padding: "6px 16px", cursor: "pointer" }}>Save</button>
            <button onClick={cancelEmergency} style={{ background: "transparent", border: `1px solid ${BORDER}`, borderRadius: 8, color: TEXT_DIM, fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 12, padding: "6px 12px", cursor: "pointer" }}>Cancel</button>
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
            <span style={{ fontSize: 12, fontWeight: 800, color: TEAL }}>{fmt(totalSinkingFunds)}/mo</span>
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
              style={{ padding: "8px 4px", borderBottom: `1px solid ${BORDER}`, cursor: "pointer", transition: "background 0.1s" }}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = SURFACE_HI}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: TEXT, fontWeight: 600 }}>{f.name}</div>
                  {(multiSinking || f.targetAmount != null || f.dueDate) && (
                    <div style={{ fontSize: 10, color: TEXT_DIM }}>
                      {multiSinking && (() => {
                        const a = f.accountId ? sinkingAccounts.find(x => x.id === f.accountId) : undefined;
                        return <span style={{ color: a ? TEXT_DIM : AMBER }}>→ {a ? displayName(a) : "no account"}</span>;
                      })()}
                      {multiSinking && f.targetAmount != null && <span> · </span>}
                      {f.targetAmount != null && <span>target {fmt(f.targetAmount)}</span>}
                      {projected != null && f.targetAmount != null && (
                        <span style={{ color: onTrack ? JADE : DANGER }}> · saves {fmt(projected)} by due</span>
                      )}
                      {f.dueDate && !f.targetAmount && (
                        <span>{multiSinking ? " · " : ""}due {new Date(f.dueDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", year: "numeric" })}</span>
                      )}
                    </div>
                  )}
                </div>
                {mo != null && <Pill color={mo <= 3 ? DANGER : mo <= 6 ? AMBER : TEAL}>{mo === 0 ? "due now" : `${mo} mo`}</Pill>}
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: TEXT }}>{fmt(f.monthlyAmount)}</div>
                  <div style={{ fontSize: 10, color: TEXT_DIM }}>/mo</div>
                </div>
              </div>
              {fillPct != null && (
                <div style={{ marginTop: 6 }}>
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
      {!adding && <button onClick={openAddFund} style={{ marginTop: 14, width: "100%", background: "transparent", border: `1px dashed ${BORDER}`, borderRadius: 8, color: JADE, fontSize: 12, fontWeight: 700, padding: "7px 0", cursor: "pointer", fontFamily: "'Montserrat',sans-serif" }}>+ Add Sinking Fund</button>}
    </Card>
  );
}

// ── Account cash flow card ────────────────────────────────────────────────

// ── Merged Account Plan section ───────────────────────────────────────────

interface PlanGroup {
  label: "Needs" | "Wants" | "Savings";
  color: string;
  target: number;   // 0–1
  planned: number;  // dollar total
  flows: AccountFlow[];
}

function AccountRow({ flow }: { flow: AccountFlow }) {
  const isSavings = flow.kind !== "spending";
  const covered = flow.net >= -1;
  const netColor = covered ? JADE : DANGER;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: "12px 20px 12px 28px", borderBottom: `1px solid ${BORDER}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>{displayName(flow.account)}</span>
        {!isSavings && (flow.inflow > 0 || flow.expenseOutflow > 0) && (
          <span style={{ fontSize: 11, fontWeight: 800, color: netColor, flexShrink: 0 }}>
            {covered ? "✓" : `Short ${fmt(flow.expenseOutflow - flow.inflow)}`}
          </span>
        )}
      </div>

      {/* Inflow */}
      {flow.inflow > 0 ? (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontSize: 11, color: TEXT_DIM, minWidth: 0, marginRight: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            In: {isSavings ? flow.inflowLabel : (flow.inflowSources.join(", ") || "income")}
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, color: JADE, flexShrink: 0 }}>+{fmt(flow.inflow)}</span>
        </div>
      ) : (
        <div style={{ fontSize: 11, color: isSavings ? TEXT_MUTED : AMBER }}>
          {isSavings ? "No transfer planned" : "No income linked"}
        </div>
      )}

      {/* Expenses */}
      {flow.expenseOutflow > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontSize: 11, color: TEXT_DIM }}>Out: Fixed expenses</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: TEXT }}>−{fmt(flow.expenseOutflow)}</span>
        </div>
      )}

      {/* Net / Monthly in */}
      {(flow.inflow > 0 || flow.expenseOutflow > 0) && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", paddingTop: 5, marginTop: 1, borderTop: `1px solid ${BORDER}` }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: TEXT_DIM }}>{isSavings ? "Monthly in" : "Net"}</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: isSavings ? JADE : netColor }}>
            {flow.net >= 0 ? "+" : ""}{fmt(flow.net)}
          </span>
        </div>
      )}
    </div>
  );
}

export function AccountPlanSection({
  flows, mappings, totalNeeds, totalWants, totalEmergency, totalSinkingFunds, totalIncome, nudges,
}: {
  flows: AccountFlow[];
  mappings: AccountMappings;
  totalNeeds: number; totalWants: number;
  totalEmergency: number; totalSinkingFunds: number; totalIncome: number;
  nudges?: Nudge[];
}) {
  const needsIds   = new Set(normalizeIds(mappings.fixedExpenses));
  const wantsIds   = new Set(normalizeIds(mappings.dailySpending));
  const savingsIds = new Set([...normalizeIds(mappings.emergencySavings), ...normalizeIds(mappings.sinkingFunds)]);
  const allRoleIds = new Set([...needsIds, ...wantsIds, ...savingsIds]);

  const groups: PlanGroup[] = [
    { label: "Needs",   color: PURPLE, target: 0.5, planned: totalNeeds,                      flows: flows.filter(f => needsIds.has(f.account.id)) },
    { label: "Wants",   color: PINK,   target: 0.3, planned: totalWants,                      flows: flows.filter(f => wantsIds.has(f.account.id)) },
    { label: "Savings", color: JADE,   target: 0.2, planned: totalEmergency + totalSinkingFunds, flows: flows.filter(f => savingsIds.has(f.account.id)) },
  ];
  const unassigned = flows.filter(f => !allRoleIds.has(f.account.id));

  if (flows.length === 0) return null;

  return (
    <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden", marginTop: 16 }}>
      <div style={{ padding: "14px 20px", borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ display: "flex", color: TEXT_DIM }}><Icon name="flow" /></span>
          <span style={{ fontSize: 13, fontWeight: 800, color: TEXT }}>Budget Plan</span>
        </div>
        <div style={{ fontSize: 11, color: TEXT_DIM, marginTop: 2 }}>Where every dollar lands this month</div>
      </div>

      <SectionNudges nudges={nudges} />

      {groups.map((g, gi) => {
        const actualPct = totalIncome > 0 ? pct(g.planned, totalIncome) : 0;
        const targetPct = Math.round(g.target * 100);
        const onTrack = Math.abs(actualPct - targetPct) <= 5;
        const show = g.flows.length > 0 || g.planned > 0;
        if (!show) return null;

        return (
          <div key={g.label} style={{ borderTop: gi === 0 ? "none" : `1px solid ${BORDER}` }}>
            {/* Group header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 20px", background: `${g.color}0d` }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: g.color, textTransform: "uppercase", letterSpacing: 0.8 }}>
                {g.label} · {targetPct}% target
              </span>
              <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                {g.planned > 0 && (
                  <span style={{ fontSize: 13, fontWeight: 800, color: TEXT }}>{fmt(g.planned)}/mo</span>
                )}
                {totalIncome > 0 && g.planned > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: onTrack ? JADE : AMBER }}>
                    {actualPct}%<span style={{ color: TEXT_MUTED }}>/{targetPct}%</span>
                  </span>
                )}
              </div>
            </div>

            {/* Account rows */}
            {g.flows.map(f => <AccountRow key={f.account.id} flow={f} />)}

            {g.flows.length === 0 && (
              <div style={{ padding: "10px 20px 10px 28px", fontSize: 11, color: TEXT_MUTED, fontStyle: "italic" }}>
                No accounts mapped to this role
              </div>
            )}
          </div>
        );
      })}

      {unassigned.length > 0 && (
        <div style={{ borderTop: `1px solid ${BORDER}` }}>
          <div style={{ display: "flex", alignItems: "center", padding: "10px 20px", background: `${TEXT_MUTED}0d` }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: 0.8 }}>
              Unassigned
            </span>
          </div>
          {unassigned.map(f => <AccountRow key={f.account.id} flow={f} />)}
        </div>
      )}
    </div>
  );
}

// ── Wants ─────────────────────────────────────────────────────────────────

export function WantsSection({ totalWants, totalIncome, dailySpendingAcctName }: {
  totalWants: number; totalIncome: number; dailySpendingAcctName: string;
}) {
  const wantsPct = pct(totalWants, totalIncome);
  const onTarget = Math.abs(wantsPct - 30) <= 3;

  return (
    <Card icon={<Icon name="bag" />} title="Safe to Spend">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
            → {dailySpendingAcctName}
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: totalWants > 0 ? PINK : TEXT_MUTED }}>
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
