import { createContext, useContext } from "react";
import type { HouseholdInfo } from "@equanimity/core";

export type { HouseholdRole, SubStatus, HouseholdPerson, HouseholdInfo } from "@equanimity/core";
export { subIsActive, daysLeft, OWNER_EMAIL, isOwnerEmail } from "@equanimity/core";

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
