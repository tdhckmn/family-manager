import { fmt } from "./shared";

// ── Plan-balance advice ──────────────────────────────────────────────────────

export type NudgeLevel = "ok" | "warn" | "danger";

export interface Nudge {
  id: string;
  level: Exclude<NudgeLevel, "ok">;
  title: string;
  message: string;
}

const DRIFT = 0.05; // 5% drift from a 50/30/20 target before we flag it

/**
 * Advice derived purely from the plan (no actuals). Flags when the plan doesn't
 * balance or drifts from 50/30/20. An empty result means the plan looks healthy.
 */
export function computePlanNudges(args: {
  totalIncome: number;
  totalNeeds: number;
  totalSavings: number;
  totalWants: number;
}): Nudge[] {
  const { totalIncome, totalNeeds, totalSavings, totalWants } = args;
  if (totalIncome <= 0) return [];

  const nudges: Nudge[] = [];

  // Overcommitted — fixed expenses + savings exceed income
  const committed = totalNeeds + totalSavings;
  if (committed > totalIncome + 1) {
    nudges.push({
      id: "overcommitted",
      level: "danger",
      title: "Plan doesn't balance",
      message: `Your fixed expenses and savings (${fmt(committed)}) exceed your income (${fmt(totalIncome)}) by ${fmt(committed - totalIncome)}. Trim a bill or lower a savings transfer.`,
    });
  }

  const needsShare = totalNeeds / totalIncome;
  const savingsShare = totalSavings / totalIncome;
  const wantsShare = totalWants / totalIncome;

  if (needsShare > 0.5 + DRIFT) {
    nudges.push({
      id: "needs-high",
      level: needsShare > 0.6 ? "danger" : "warn",
      title: "Needs are above target",
      message: `Fixed expenses are ${Math.round(needsShare * 100)}% of income, above the 50% target. See if any recurring bills can be trimmed.`,
    });
  }

  if (savingsShare < 0.2 - DRIFT) {
    nudges.push({
      id: "savings-low",
      level: savingsShare < 0.1 ? "danger" : "warn",
      title: "Savings is below target",
      message: `You're planning to save ${Math.round(savingsShare * 100)}% of income, below the 20% target. Consider raising your emergency transfer or a sinking fund.`,
    });
  }

  if (wantsShare > 0.3 + DRIFT) {
    nudges.push({
      id: "wants-high",
      level: "warn",
      title: "Discretionary is above target",
      message: `After needs and savings, ${Math.round(wantsShare * 100)}% of income is left for wants, above the 30% guideline. You could direct more toward savings.`,
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
