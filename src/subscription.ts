import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "./firebase";

export type SubStatus = "active" | "trialing" | "canceled" | "past_due" | "override";

export interface Subscription {
  status: SubStatus;
  plan?: "monthly" | "yearly";
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  currentPeriodEnd?: string; // ISO date YYYY-MM-DD
  trialEnd?: string;         // ISO date YYYY-MM-DD
  override?: boolean;        // admin bypass, skip all checks
  overrideReason?: string;
  couponCode?: string;
  createdAt?: string;
}

export const OWNER_EMAIL = "thomasdhickman@gmail.com";

export function isOwnerEmail(email: string | null | undefined): boolean {
  return email === OWNER_EMAIL;
}

/** Returns true if the subscription is currently active (or overridden). */
export function isSubActive(sub: Subscription | null | undefined): boolean {
  if (!sub) return false;
  if (sub.override) return true;
  const now = new Date();
  if (sub.status === "trialing") {
    return !sub.trialEnd || new Date(sub.trialEnd) > now;
  }
  if (sub.status === "active") {
    return !sub.currentPeriodEnd || new Date(sub.currentPeriodEnd) > now;
  }
  return false;
}

/** Days remaining in a trial. Returns 0 if not on trial or expired. */
export function trialDaysLeft(sub: Subscription | null | undefined): number {
  if (!sub?.trialEnd) return 0;
  const diff = new Date(sub.trialEnd).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86_400_000));
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function futureDateISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Start a 14-day free trial for a new user. */
export async function startTrial(uid: string): Promise<void> {
  const sub: Subscription = {
    status: "trialing",
    trialEnd: futureDateISO(14),
    createdAt: todayISO(),
  };
  await setDoc(doc(db, "users", uid, "sub", "info"), sub);
}

/** React hook — live-synced subscription for the given uid. */
export function useSubscription(uid: string): { sub: Subscription | null; loading: boolean } {
  const [sub, setSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ref = doc(db, "users", uid, "sub", "info");
    return onSnapshot(ref, snap => {
      setSub(snap.exists() ? (snap.data() as Subscription) : null);
      setLoading(false);
    }, () => setLoading(false));
  }, [uid]);

  return { sub, loading };
}
