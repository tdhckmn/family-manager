import { createContext, useContext } from "react";

export type HouseholdRole = "owner" | "member";
export type SubStatus = "active" | "trialing" | "past_due" | "cancelled" | "none";

export interface HouseholdPerson {
  id: string;
  name: string;
  color?: string;
  linkedUid?: string;
}

export interface HouseholdInfo {
  /** The household owner's uid — use for all Firestore data reads/writes. */
  householdId: string;
  role: HouseholdRole;
  subStatus: SubStatus;
  trialEndsAt: string | null;
  periodEndsAt: string | null;
  isOverride: boolean;
  /** Which named household person this account is currently identified as. */
  personId?: string;
  personName?: string;
}

export const HouseholdContext = createContext<HouseholdInfo | null>(null);

export function useHousehold(): HouseholdInfo {
  const ctx = useContext(HouseholdContext);
  if (!ctx) throw new Error("useHousehold() must be inside HouseholdContext");
  return ctx;
}

/** Returns the uid to use for all Firestore data paths (always the household owner's uid). */
export function useHouseholdUid(): string {
  return useHousehold().householdId;
}

export function subIsActive(s: SubStatus): boolean {
  return s === "active" || s === "trialing";
}

export function daysLeft(isoDate: string | null): number {
  if (!isoDate) return 0;
  return Math.max(0, Math.ceil((new Date(isoDate).getTime() - Date.now()) / 86_400_000));
}

/** The app founder — bypasses billing and sees the Admin panel. */
export const OWNER_EMAIL = "thomasdhickman@gmail.com";
export function isOwnerEmail(email: string | null | undefined): boolean {
  return (email ?? "").toLowerCase() === OWNER_EMAIL;
}
