import { MONTH_ABBR } from "./dates";

export { MONTH_ABBR };

export type Frequency = "weekly" | "biweekly" | "semimonthly" | "monthly";
export type IncomeFrequency = Frequency | "onetime";
export type ExpenseFrequency = "weekly" | "biweekly" | "semimonthly" | "monthly" | "bimonthly" | "quarterly" | "semiannual" | "annual";
export type Owner = string;
export type AccountRole = "fixedExpenses" | "dailySpending" | "emergencySavings" | "sinkingFunds";
export type SplitType = "amount" | "percentage" | "balance";

export interface BankAccount {
  id: string;
  name: string;
  nickname?: string;
  lastFour?: string;
  url?: string;
  tag?: "personal" | "business";
  ignored?: boolean;
}

export interface AccountMappings {
  fixedExpenses?: string[];
  dailySpending?: string[];
  emergencySavings?: string[];
  sinkingFunds?: string[];
}

export function normalizeIds(v: string | string[] | undefined): string[] {
  if (!v) return [];
  if (typeof v === "string") return [v];
  return v;
}

export interface PaycheckSplit {
  order: number;
  type: SplitType;
  value?: number;
  accountId: string;
}

export interface IncomeSource {
  id: string;
  name: string;
  owner: Owner;
  amount: number;
  frequency: IncomeFrequency;
  referenceDate: string;
  splits?: PaycheckSplit[];
  /** @deprecated use splits instead */
  destinationAccountId?: string;
}

export interface FixedExpense {
  id: string;
  name: string;
  amount: number;
  dayOfMonth?: number;
  account: string;
  frequency?: ExpenseFrequency;
  url?: string;
  kind?: "subscription";
  bucket?: "needs" | "wants";
  active?: boolean;
  renewalDate?: string;
  category?: string;
}

export interface SinkingFund {
  id: string;
  name: string;
  monthlyAmount: number;
  targetAmount?: number;
  dueDate?: string;
  accountId?: string;
}

export interface EmergencySavings {
  amount: number;
  frequency: Frequency;
}

export interface BudgetTargets {
  needs: number;
  savings: number;
  wants: number;
}

export const DEFAULT_TARGETS: BudgetTargets = { needs: 0.5, savings: 0.2, wants: 0.3 };

export interface MonthlyGoal {
  id: string;
  text: string;
  completed: boolean;
}

export interface FinancePlan {
  incomeSources: IncomeSource[];
  fixedExpenses: FixedExpense[];
  monthlyGoals?: Record<string, MonthlyGoal[]>;
  savings: {
    emergency: number;
    emergencyTransfer?: EmergencySavings;
  };
  sinkingFunds: SinkingFund[];
  wants: { projectsMonthly: number; cashAppPerCheck: number };
  bankAccounts?: BankAccount[];
  accountMappings?: AccountMappings;
  budgetTargets?: BudgetTargets | null;
}

export const DEFAULT_PLAN: FinancePlan = {
  incomeSources: [], fixedExpenses: [],
  savings: { emergency: 0 },
  sinkingFunds: [],
  wants: { projectsMonthly: 0, cashAppPerCheck: 200 },
  bankAccounts: [],
  accountMappings: {},
};

export const FREQ_LABELS: Record<Frequency, string> = {
  weekly: "Weekly", biweekly: "Bi-weekly", semimonthly: "Semi-monthly", monthly: "Monthly",
};

export const INCOME_FREQ_LABELS: Record<IncomeFrequency, string> = {
  weekly: "Weekly", biweekly: "Bi-weekly", semimonthly: "Semi-monthly", monthly: "Monthly", onetime: "One-time",
};

export const EXPENSE_FREQ_LABELS: Record<ExpenseFrequency, string> = {
  weekly: "Weekly", biweekly: "Bi-weekly", semimonthly: "Semi-monthly (2×/mo)", monthly: "Monthly",
  bimonthly: "Every 2 months", quarterly: "Quarterly", semiannual: "Semi-annual", annual: "Annual",
};

export const EXPENSE_FREQ_MONTHLY: Record<ExpenseFrequency, number> = {
  weekly: 52 / 12, biweekly: 26 / 12, semimonthly: 2, monthly: 1,
  bimonthly: 1 / 2, quarterly: 1 / 3, semiannual: 1 / 6, annual: 1 / 12,
};

export const SAVINGS_FREQ_MONTHLY: Record<Frequency, number> = {
  weekly: 52 / 12, biweekly: 26 / 12, semimonthly: 2, monthly: 1,
};

export const SAVINGS_FREQ_LABELS: Record<Frequency, string> = {
  weekly: "Weekly", biweekly: "Bi-weekly", semimonthly: "Semi-monthly", monthly: "Monthly",
};

export const ROLE_FALLBACKS: Record<AccountRole, string> = {
  fixedExpenses: "Fixed Expenses", dailySpending: "Daily Spending",
  emergencySavings: "Emergency Savings", sinkingFunds: "Sinking Funds",
};

export function getPlanTargets(plan: FinancePlan): BudgetTargets | null {
  if (plan.budgetTargets === null) return null;
  return plan.budgetTargets ?? DEFAULT_TARGETS;
}

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

export const fmt = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 });

export const fmtDec = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function emergencyMonthly(savings: FinancePlan["savings"]): number {
  if (savings.emergencyTransfer) {
    return savings.emergencyTransfer.amount * SAVINGS_FREQ_MONTHLY[savings.emergencyTransfer.frequency];
  }
  return savings.emergency || 0;
}

export function expenseMonthly(e: FixedExpense): number {
  return e.amount * EXPENSE_FREQ_MONTHLY[e.frequency ?? "monthly"];
}

export function isExpenseActive(e: FixedExpense): boolean {
  return e.active !== false;
}

export function expenseBucket(e: FixedExpense): "needs" | "wants" {
  return e.bucket === "wants" ? "wants" : "needs";
}

export function recurringTotals(expenses: FixedExpense[]): { needs: number; wantsCommitted: number } {
  let needs = 0, wantsCommitted = 0;
  for (const e of expenses) {
    if (!isExpenseActive(e)) continue;
    const m = expenseMonthly(e);
    if (expenseBucket(e) === "wants") wantsCommitted += m;
    else needs += m;
  }
  return { needs, wantsCommitted };
}

export function monthsUntil(dateStr: string): number {
  const due = new Date(dateStr + "T12:00:00");
  const now = new Date();
  return Math.max(0, (due.getFullYear() - now.getFullYear()) * 12 + (due.getMonth() - now.getMonth()));
}

export function displayName(a: BankAccount): string {
  const base = a.nickname || a.name;
  return a.lastFour ? `${base} ••${a.lastFour}` : base;
}

export function resolveAccount(role: AccountRole, accounts: BankAccount[], mappings: AccountMappings): string {
  const ids = normalizeIds(mappings[role]);
  if (ids.length === 0) return ROLE_FALLBACKS[role];
  const names = ids
    .map(id => accounts.find(a => a.id === id))
    .filter((a): a is BankAccount => !!a)
    .map(displayName);
  return names.length > 0 ? names.join(" & ") : ROLE_FALLBACKS[role];
}
