import type { SubStatus } from "./types";

export function subIsActive(s: SubStatus): boolean {
  return s === "active" || s === "trialing";
}

export function daysLeft(isoDate: string | null): number {
  if (!isoDate) return 0;
  return Math.max(0, Math.ceil((new Date(isoDate).getTime() - Date.now()) / 86_400_000));
}

export const OWNER_EMAIL = "thomasdhickman@gmail.com";

export function isOwnerEmail(email: string | null | undefined): boolean {
  return (email ?? "").toLowerCase() === OWNER_EMAIL;
}
