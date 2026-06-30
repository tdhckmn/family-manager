export type Theme = "dark" | "light";

export type HouseholdRole = "owner" | "member";
export type SubStatus = "active" | "trialing" | "past_due" | "cancelled" | "none";

export interface HouseholdPerson {
  id: string;
  name: string;
  color?: string;
  linkedUid?: string;
}

export interface HouseholdInfo {
  householdId: string;
  role: HouseholdRole;
  subStatus: SubStatus;
  trialEndsAt: string | null;
  periodEndsAt: string | null;
  isOverride: boolean;
  personId?: string;
  personName?: string;
}
