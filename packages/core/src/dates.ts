export const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
export const DAY_ABBR  = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
export const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
export const MONTH_ABBR  = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromISODate(s: string): Date {
  return new Date(s + "T12:00:00");
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function daysUntil(iso: string): number {
  const target = fromISODate(iso);
  const now = new Date();
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const b = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  return Math.round((b - a) / 86_400_000);
}

export function relativeDay(iso: string): string {
  const n = daysUntil(iso);
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  if (n === -1) return "Yesterday";
  if (n > 1) return `In ${n} days`;
  return `${-n} days ago`;
}

export function prettyDate(iso: string): string {
  const d = fromISODate(iso);
  return `${DAY_ABBR[d.getDay()]}, ${MONTH_NAMES[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
}

export function weekKey(d: Date): string {
  const sunday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay());
  return toISODate(sunday);
}

export const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
