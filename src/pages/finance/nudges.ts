import {
  BankAccount, FinancePlan, PaycheckSplit, BudgetTargets,
  countPaydays, displayName, expenseMonthly, emergencyMonthly, normalizeIds, fmt,
} from "./shared";

// ── Plan-balance advice ──────────────────────────────────────────────────────

export type NudgeLevel = "ok" | "warn" | "danger";

/** Where a nudge renders: inside the 50/30/20 overview card, or the account plan section. */
export type NudgeSection = "overview" | "accounts";

export interface Nudge {
  id: string;
  level: Exclude<NudgeLevel, "ok">;
  section: NudgeSection;
  title: string;
  message: string;
}

const DRIFT = 0.05; // 5% tolerance around a target before flagging

/**
 * Advice derived purely from the plan (no actuals).
 * - The overcommitted check (spending > income) always runs — cannot be suppressed.
 * - Percentage-split checks only run when targets is non-null.
 */
export function computePlanNudges(args: {
  totalIncome: number;
  totalNeeds: number;
  totalSavings: number;
  totalWants: number;
  targets: BudgetTargets | null;
}): Nudge[] {
  const { totalIncome, totalNeeds, totalSavings, totalWants, targets } = args;
  if (totalIncome <= 0) return [];

  const nudges: Nudge[] = [];

  // Overcommitted — always checked regardless of targets
  const committed = totalNeeds + totalSavings;
  if (committed > totalIncome + 1) {
    nudges.push({
      id: "overcommitted",
      level: "danger",
      section: "overview",
      title: "Plan doesn't balance",
      message: `Your fixed expenses and savings (${fmt(committed)}) exceed your income (${fmt(totalIncome)}) by ${fmt(committed - totalIncome)}. Trim a bill or lower a savings transfer.`,
    });
  }

  if (!targets) return nudges;

  const needsShare = totalNeeds / totalIncome;
  const savingsShare = totalSavings / totalIncome;
  const wantsShare = totalWants / totalIncome;
  const needsPct = Math.round(targets.needs * 100);
  const savingsPct = Math.round(targets.savings * 100);
  const wantsPct = Math.round(targets.wants * 100);

  if (needsShare > targets.needs + DRIFT) {
    nudges.push({
      id: "needs-high",
      level: needsShare > targets.needs + 0.1 ? "danger" : "warn",
      section: "overview",
      title: "Needs are above target",
      message: `Fixed expenses are ${Math.round(needsShare * 100)}% of income, above your ${needsPct}% target. See if any recurring bills can be trimmed.`,
    });
  }

  if (savingsShare < targets.savings - DRIFT) {
    nudges.push({
      id: "savings-low",
      level: savingsShare < targets.savings - 0.1 ? "danger" : "warn",
      section: "overview",
      title: "Savings is below target",
      message: `You're planning to save ${Math.round(savingsShare * 100)}% of income, below your ${savingsPct}% target. Consider raising your emergency transfer or a sinking fund.`,
    });
  }

  if (wantsShare > targets.wants + DRIFT) {
    nudges.push({
      id: "wants-high",
      level: "warn",
      section: "overview",
      title: "Discretionary is above target",
      message: `After needs and savings, ${Math.round(wantsShare * 100)}% of income is left for wants, above your ${wantsPct}% guideline. You could direct more toward savings.`,
    });
  }

  return nudges;
}

/** Worst level present, for the verdict banner. */
export function verdictLevel(nudges: Nudge[]): NudgeLevel {
  if (nudges.some(n => n.level === "danger")) return "danger";
  if (nudges.some(n => n.level === "warn")) return "warn";
  return "ok";
}

// ── Per-account cash flow ────────────────────────────────────────────────────

export type AccountKind = "spending" | "emergency" | "sinking";

export interface AccountFlow {
  account: BankAccount;
  kind: AccountKind;
  /** Income deposited here (spending accounts) or savings transfer in (savings accounts). */
  inflow: number;
  /** Fixed expenses charged here (spending accounts only). */
  expenseOutflow: number;
  /** inflow - expenseOutflow */
  net: number;
  /** Display labels for income sources depositing here. */
  inflowSources: string[];
  /** Human-readable description of what the inflow is (for savings accounts). */
  inflowLabel?: string;
}

/**
 * Build a flow row for every non-ignored account:
 * - Spending accounts: inflow = income splits, outflow = fixed expenses.
 * - Emergency savings accounts: inflow = planned monthly transfer.
 * - Sinking fund accounts: inflow = sum of monthly sinking fund contributions.
 */
export function computeAccountFlows(plan: FinancePlan, year: number, month: number): {
  flows: AccountFlow[];
  unlinkedIncome: number;
} {
  const accounts = plan.bankAccounts ?? [];
  const mappings = plan.accountMappings ?? {};

  const emergencyIds = new Set(normalizeIds(mappings.emergencySavings));
  const sinkingIds   = new Set(normalizeIds(mappings.sinkingFunds));

  // ── Income splits → per-account inflow ──────────────────────────────────
  const inflowMap = new Map<string, { amount: number; labels: string[] }>();
  let unlinkedIncome = 0;

  for (const src of plan.incomeSources) {
    const n = countPaydays(year, month, src.frequency, src.referenceDate);
    if (n <= 0) continue;
    const perCheck = src.amount;
    const label = n > 1 ? `${src.name} ×${n}` : src.name;

    // Resolve splits (migrate legacy destinationAccountId on the fly).
    let splits: PaycheckSplit[] = src.splits ?? [];
    if (splits.length === 0 && src.destinationAccountId) {
      splits = [{ order: 1, type: "balance", accountId: src.destinationAccountId }];
    }

    if (splits.length === 0) {
      unlinkedIncome += perCheck * n;
      continue;
    }

    const sorted = [...splits].sort((a, b) => a.order - b.order);
    const perCheckByAccount = new Map<string, number>();
    let remaining = perCheck;

    for (const sp of sorted) {
      if (remaining <= 0) break;
      let alloc = 0;
      if (sp.type === "amount") {
        alloc = Math.min(sp.value ?? 0, remaining);
      } else if (sp.type === "percentage") {
        alloc = Math.min((sp.value ?? 0) / 100 * perCheck, remaining);
      } else {
        alloc = remaining; // balance
      }
      if (alloc > 0) {
        perCheckByAccount.set(sp.accountId, (perCheckByAccount.get(sp.accountId) ?? 0) + alloc);
        remaining -= alloc;
      }
    }

    if (remaining > 0.005) unlinkedIncome += remaining * n;

    for (const [accountId, perCheckAmt] of perCheckByAccount) {
      const cur = inflowMap.get(accountId) ?? { amount: 0, labels: [] };
      cur.amount += perCheckAmt * n;
      if (!cur.labels.includes(label)) cur.labels.push(label);
      inflowMap.set(accountId, cur);
    }
  }

  // ── Fixed expense outflows → per-account ────────────────────────────────
  const expenseMap = new Map<string, number>();
  for (const exp of plan.fixedExpenses) {
    const acct = accounts.find(a => !a.ignored && displayName(a) === exp.account);
    if (!acct) continue;
    expenseMap.set(acct.id, (expenseMap.get(acct.id) ?? 0) + expenseMonthly(exp));
  }

  // ── Savings amounts ──────────────────────────────────────────────────────
  const emergencyMonthlyAmt = emergencyMonthly(plan.savings);
  const sinkingByAccount = new Map<string, number>(); // accountId → monthly total
  const sinkingIdsArr = [...sinkingIds];
  for (const f of plan.sinkingFunds ?? []) {
    if (f.monthlyAmount <= 0) continue;
    // Route each fund to its chosen account; fall back to the sole sinking account
    // when there's only one. (Previously every fund was added to every account.)
    let target: string | undefined;
    if (f.accountId && sinkingIds.has(f.accountId)) target = f.accountId;
    else if (sinkingIdsArr.length === 1) target = sinkingIdsArr[0];
    if (target) sinkingByAccount.set(target, (sinkingByAccount.get(target) ?? 0) + f.monthlyAmount);
  }

  // ── Build a flow row for every non-ignored account ───────────────────────
  const flows: AccountFlow[] = [];

  for (const account of accounts) {
    if (account.ignored) continue;

    const id = account.id;
    const isEmergency = emergencyIds.has(id);
    const isSinking   = sinkingIds.has(id);

    let kind: AccountKind;
    let inflow: number;
    let inflowSources: string[] = [];
    let inflowLabel: string | undefined;

    if (isEmergency && !isSinking) {
      kind = "emergency";
      inflow = emergencyMonthlyAmt;
      inflowLabel = "Emergency savings transfer";
    } else if (isSinking && !isEmergency) {
      kind = "sinking";
      inflow = sinkingByAccount.get(id) ?? 0;
      inflowLabel = "Sinking fund contributions";
    } else if (isEmergency && isSinking) {
      // Same account serves both roles — combine
      kind = "sinking";
      inflow = emergencyMonthlyAmt + (sinkingByAccount.get(id) ?? 0);
      inflowLabel = "Savings & sinking contributions";
    } else {
      kind = "spending";
      const inData = inflowMap.get(id);
      inflow = inData?.amount ?? 0;
      inflowSources = inData?.labels ?? [];
    }

    const expenseOutflow = expenseMap.get(id) ?? 0;

    flows.push({
      account,
      kind,
      inflow,
      expenseOutflow,
      net: inflow - expenseOutflow,
      inflowSources,
      inflowLabel,
    });
  }

  // Sort: spending accounts first (by inflow desc), then savings accounts by name
  flows.sort((a, b) => {
    if (a.kind !== b.kind) {
      const order: Record<AccountKind, number> = { spending: 0, emergency: 1, sinking: 2 };
      return order[a.kind] - order[b.kind];
    }
    return displayName(a.account).localeCompare(displayName(b.account));
  });

  return { flows, unlinkedIncome };
}

/** Account-level nudges — warns if an account is underfunded or income is unlinked. */
export function computeAccountNudges(flows: AccountFlow[], unlinkedIncome: number): Nudge[] {
  const nudges: Nudge[] = [];

  for (const f of flows) {
    if (f.net < -1) {
      nudges.push({
        id: `acct-short-${f.account.id}`,
        level: "danger",
        section: "accounts",
        title: `${displayName(f.account)} is underfunded`,
        message: `Expenses from ${displayName(f.account)} (${fmt(f.expenseOutflow)}) exceed the income deposited there (${fmt(f.inflow)}) by ${fmt(f.expenseOutflow - f.inflow)}. Link more income to this account or reduce its expenses.`,
      });
    }
  }

  if (unlinkedIncome > 1) {
    nudges.push({
      id: "unlinked-income",
      level: "warn",
      section: "accounts",
      title: "Some income isn't linked to an account",
      message: `${fmt(unlinkedIncome)} of monthly income has no destination account. Open each income source and set "Deposit to" so the cash flow check is accurate.`,
    });
  }

  return nudges;
}
