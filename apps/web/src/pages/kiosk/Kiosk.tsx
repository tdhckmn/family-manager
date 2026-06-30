import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { collection, onSnapshot, doc, setDoc, query } from "firebase/firestore";
import { db } from "../../firebase";
import { useHouseholdUid } from "../../household";
import { usePeople, personColor } from "../../usePeople";
import { Icon } from "../../components/Icon";
import { WisdomCard, useDailyQuote } from "../../components/Wisdom";
import { usePrefs } from "../../prefs";
import {
  toISODate, fromISODate, daysUntil, weekKey, todayISO,
  DAY_NAMES, MONTH_NAMES,
  JADE, BLUE, PINK, AMBER, TEAL, LAV, YELLOW, DANGER, FONT,
  useCurrentDate,
} from "../shared/kit";
import { useWeather, weatherInfo, temp, type Unit, type WeatherData } from "../calendar/weather";

// ── Data shapes (same as Calendar) ───────────────────────────────────────────
interface Note { id: string; title: string; completed: boolean; dueDate?: string | null; isTodo?: boolean; }
interface Chore { id: string; name: string; assignedTo: string; daysOfWeek: number[]; }
interface MaintTask { id: string; task: string; lastDone?: string | null; intervalDays: number; category: string; remindDays?: number; }
interface FinanceDue { id: string; name: string; cost: number; due: string; isSub: boolean; }
interface Meal { id: string; name: string; }
interface PlanEntry { id: string; mealId: string; day?: string; label?: string; }

interface RawExpense {
  id: string; name: string; amount: number;
  kind?: string; active?: boolean; renewalDate?: string; dayOfMonth?: number; frequency?: string;
}

function financeDueDate(e: RawExpense): string | null {
  if (e.renewalDate) return e.renewalDate;
  if (e.dayOfMonth && (!e.frequency || e.frequency === "monthly")) {
    const now = new Date();
    const y = now.getFullYear(), m = now.getMonth();
    const dayIn = (yy: number, mm: number) => Math.min(e.dayOfMonth!, new Date(yy, mm + 1, 0).getDate());
    const thisMonth = new Date(y, m, dayIn(y, m));
    const todayMidnight = new Date(y, m, now.getDate());
    const target = thisMonth < todayMidnight ? new Date(y, m + 1, dayIn(y, m + 1)) : thisMonth;
    return toISODate(target);
  }
  return null;
}

const MEAL_ORDER = ["Breakfast", "Lunch", "Dinner", "Snack", "Dessert"];
function mealLabelRank(label?: string) {
  const i = MEAL_ORDER.indexOf(label ?? "");
  return i === -1 ? MEAL_ORDER.length : i;
}

function nextMaintDue(t: MaintTask): string | null {
  if (!t.lastDone) return null;
  const base = fromISODate(t.lastDone);
  return toISODate(new Date(base.getFullYear(), base.getMonth(), base.getDate() + t.intervalDays));
}

const fmtMoney = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 });

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── Atmospheric glow background (always dark, uses accent color) ──────────────
function KioskGlow({ accent }: { accent: string }) {
  const dim = accent; // use same color, just vary opacity
  const particles = useMemo(() =>
    Array.from({ length: 55 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: 1 + Math.random() * 1.8,
      delay: Math.random() * 8,
      duration: 4 + Math.random() * 6,
      op: 0.08 + Math.random() * 0.22,
    })), []);

  return (
    <>
      {/* Corner gradient washes */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        background: `radial-gradient(ellipse 55% 35% at 10% 0%, ${hexToRgba(accent, 0.15)} 0%, transparent 60%), radial-gradient(ellipse 40% 30% at 90% 100%, ${hexToRgba(dim, 0.12)} 0%, transparent 60%)`,
      }} />

      {/* Pulsing orbs */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }} aria-hidden>
        <div style={{
          position: "absolute", borderRadius: "50%", filter: "blur(80px)", opacity: 0,
          width: 800, height: 800,
          background: `radial-gradient(circle, ${hexToRgba(accent, 0.50)} 0%, ${hexToRgba(accent, 0.15)} 40%, transparent 70%)`,
          top: "-25%", left: "-12%",
          animation: "orbPulse 11s ease-in-out infinite", animationDelay: "0s",
        }} />
        <div style={{
          position: "absolute", borderRadius: "50%", filter: "blur(80px)", opacity: 0,
          width: 680, height: 680,
          background: `radial-gradient(circle, ${hexToRgba(dim, 0.40)} 0%, ${hexToRgba(dim, 0.10)} 40%, transparent 70%)`,
          bottom: "-18%", right: "-8%",
          animation: "orbPulse 13s ease-in-out infinite", animationDelay: "-4s",
        }} />
      </div>

      {/* Star particles */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
        {particles.map(p => (
          <div key={p.id} style={{
            position: "absolute", borderRadius: "50%",
            background: hexToRgba(accent, 0.55),
            width: p.size, height: p.size, left: `${p.left}%`, top: `${p.top}%`,
            animation: `twinkle ${p.duration}s ${p.delay}s infinite`,
            ["--op" as string]: p.op,
          }} />
        ))}
      </div>
    </>
  );
}

// ── Main Kiosk page ───────────────────────────────────────────────────────────
export default function Kiosk() {
  const uidAuth = useHouseholdUid();
  const { prefs } = usePrefs();
  const people = usePeople();
  const today = useCurrentDate();
  const todayIdx = today.getDay();
  const wk = weekKey(today);

  const unit = prefs.tempUnit;
  const { data: weather } = useWeather(prefs.weatherZip);
  const showWisdom = prefs.wisdomPages.includes("calendar");
  const quote = useDailyQuote();

  const [notes, setNotes] = useState<Note[]>([]);
  const [chores, setChores] = useState<Chore[]>([]);
  const [maint, setMaint] = useState<MaintTask[]>([]);
  const [financeDue, setFinanceDue] = useState<FinanceDue[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [planEntries, setPlanEntries] = useState<PlanEntry[]>([]);
  const [log, setLog] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const subs = [
      onSnapshot(query(collection(db, "users", uidAuth, "notes")), s => setNotes(s.docs.map(d => ({ id: d.id, ...d.data() } as Note)))),
      onSnapshot(query(collection(db, "users", uidAuth, "chores")), s => setChores(s.docs.map(d => ({ id: d.id, ...d.data() } as Chore)))),
      onSnapshot(query(collection(db, "users", uidAuth, "maintenance")), s => setMaint(s.docs.map(d => ({ id: d.id, ...d.data() } as MaintTask)))),
      onSnapshot(doc(db, "users", uidAuth, "finance", "plan"), s => {
        if (!s.exists()) { setFinanceDue([]); return; }
        const fx = (s.data().fixedExpenses ?? []) as RawExpense[];
        setFinanceDue(
          fx.filter(e => e.active !== false)
            .map(e => { const due = financeDueDate(e); return due ? { id: e.id, name: e.name, cost: e.amount, due, isSub: e.kind === "subscription" } : null; })
            .filter((x): x is FinanceDue => x !== null),
        );
      }),
      onSnapshot(doc(db, "users", uidAuth, "choreLog", wk), s => setLog(s.exists() ? (s.data().done ?? {}) : {})),
      onSnapshot(doc(db, "users", uidAuth, "food", "planner"),
        s => { if (s.exists()) { const d = s.data(); setMeals(d.meals ?? []); setPlanEntries(d.planEntries ?? []); } }),
    ];
    return () => subs.forEach(u => u());
  }, [uidAuth, wk]);

  const mealName = useMemo(() => {
    const m = new Map(meals.map(x => [x.id, x.name]));
    return (id: string) => m.get(id) ?? "—";
  }, [meals]);

  const todayChores = chores.filter(c => c.daysOfWeek?.includes(todayIdx));
  const todayMeals = planEntries
    .filter(e => e.day === DAY_NAMES[todayIdx])
    .sort((a, b) => mealLabelRank(a.label) - mealLabelRank(b.label));

  const dueNotes = notes.filter(t => {
    if (t.isTodo && !t.dueDate) return !t.completed;
    if (!t.dueDate) return false;
    const d = daysUntil(t.dueDate);
    return d <= 0 && !t.completed;
  }).sort((a, b) => {
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return a.dueDate < b.dueDate ? -1 : 1;
  });

  const maintAlerts = maint
    .map(t => ({ t, due: nextMaintDue(t) }))
    .filter(x => x.t.lastDone === todayISO() || (x.due && daysUntil(x.due) <= (x.t.remindDays ?? 7)))
    .sort((a, b) => daysUntil(a.due!) - daysUntil(b.due!));

  const financeAlerts = financeDue
    .filter(s => daysUntil(s.due) >= 0 && daysUntil(s.due) <= 3)
    .sort((a, b) => daysUntil(a.due) - daysUntil(b.due));

  const choresDone = todayChores.filter(c => log[`${c.id}:${todayIdx}`]).length;
  const nothingToday = todayChores.length === 0 && todayMeals.length === 0 && dueNotes.length === 0 && maintAlerts.length === 0 && financeAlerts.length === 0;

  function toggleChore(choreId: string) {
    const key = `${choreId}:${todayIdx}`;
    const next = { ...log };
    if (next[key]) delete next[key]; else next[key] = true;
    setLog(next);
    setDoc(doc(db, "users", uidAuth, "choreLog", wk), { done: next }).catch(console.error);
  }

  const dateLine = `${DAY_NAMES[todayIdx]}, ${MONTH_NAMES[today.getMonth()]} ${today.getDate()}`;
  const accent = prefs.accentColor ?? "#5db88a";

  // Live clock
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const hh = String(time.getHours() % 12 || 12).padStart(2, "0");
  const mm = String(time.getMinutes()).padStart(2, "0");
  const ss = String(time.getSeconds()).padStart(2, "0");
  const ampm = time.getHours() >= 12 ? "PM" : "AM";

  const TEXT = "#dedad0";
  const TEXT_DIM = "#8a8899";
  const TEXT_MUTED = "#5a5868";

  return (
    <div data-theme="dark" style={{ background: "#020408", minHeight: "100vh", fontFamily: FONT, color: TEXT, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
      <KioskGlow accent={accent} />

      {/* Clock header */}
      <div style={{ position: "relative", zIndex: 1, padding: "32px 48px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "flex-end", gap: 20, flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ fontSize: "clamp(56px, 8vw, 96px)", fontWeight: 800, lineHeight: 1, letterSpacing: -3, color: TEXT }}>{hh}:{mm}</span>
            <span style={{ fontSize: "clamp(20px, 3vw, 36px)", fontWeight: 700, color: TEXT_DIM }}>{ss}</span>
            <span style={{ fontSize: "clamp(16px, 2.5vw, 28px)", fontWeight: 700, color: YELLOW, marginLeft: 4 }}>{ampm}</span>
          </div>
          <div style={{ fontSize: "clamp(13px, 1.8vw, 18px)", color: TEXT_DIM, marginTop: 4, fontWeight: 600 }}>{dateLine}</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 36 }}>
          {weather?.current && (() => {
            const wi = weatherInfo(weather.current.code, weather.current.isDay);
            const day = weather.daily[todayISO()] ?? null;
            return (
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <Icon name={wi.icon} size={46} color={wi.color} />
                <div style={{ lineHeight: 1.1 }}>
                  <div style={{ fontSize: 38, fontWeight: 800, color: TEXT }}>{temp(unit as Unit, weather.current.tempC, weather.current.tempF)}°{unit}</div>
                  <div style={{ fontSize: 13, color: TEXT_MUTED, fontWeight: 600 }}>
                    {wi.label}{day && ` · ${temp(unit as Unit, day.maxC, day.maxF)}°/${temp(unit as Unit, day.minC, day.minF)}°`}{weather.location && ` · ${weather.location}`}
                  </div>
                </div>
              </div>
            );
          })()}
          {todayChores.length > 0 && (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: choresDone === todayChores.length ? JADE : YELLOW }}>{choresDone}/{todayChores.length}</div>
              <div style={{ fontSize: 12, color: TEXT_MUTED, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>chores done</div>
            </div>
          )}
        </div>
      </div>

      {/* Exit button — fixed bottom-right, subtle */}
      <Link to="/app" style={{
        position: "fixed", bottom: 20, right: 24, zIndex: 10,
        display: "flex", alignItems: "center", gap: 6,
        padding: "7px 14px", borderRadius: 20,
        background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)",
        color: TEXT_MUTED, textDecoration: "none",
        fontSize: 12, fontWeight: 700, fontFamily: FONT,
        opacity: 0.4, transition: "opacity 0.2s",
      }}
        onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.opacity = "1"}
        onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.opacity = "0.4"}
      >
        <Icon name="x" size={13} color={TEXT_MUTED} /> Exit kiosk
      </Link>

      {/* Content */}
      <div style={{ position: "relative", zIndex: 1, flex: 1, overflow: "auto", padding: "24px 48px 40px", display: "flex", flexDirection: "column", gap: 20, maxWidth: 960 }}>
        {showWisdom && <WisdomCard quote={quote} compact noLink />}

        {nothingToday && (
          <div style={{ fontSize: 20, color: TEXT_DIM, fontWeight: 600, marginTop: 20 }}>A clear day — nothing scheduled.</div>
        )}

        {todayChores.length > 0 && (
          <KioskSection title="Chores" accent={PINK}>
            {todayChores.map(c => {
              const checked = !!log[`${c.id}:${todayIdx}`];
              return (
                <button key={c.id} onClick={() => toggleChore(c.id)}
                  style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", borderRadius: 12, background: checked ? "rgba(93,184,138,0.1)" : "rgba(255,255,255,0.04)", border: `1px solid ${checked ? JADE + "44" : "rgba(255,255,255,0.07)"}`, cursor: "pointer", fontFamily: FONT, textAlign: "left", transition: "all 0.12s" }}>
                  <span style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${checked ? JADE : "rgba(255,255,255,0.2)"}`, background: checked ? JADE : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {checked && <Icon name="checkMark" size={13} />}
                  </span>
                  <span style={{ fontSize: 16, color: checked ? TEXT_MUTED : TEXT, textDecoration: checked ? "line-through" : "none" }}>{c.name}</span>
                  {c.assignedTo && <span style={{ fontSize: 13, color: personColor(people.find(p => p.name === c.assignedTo), c.assignedTo), marginLeft: "auto", fontWeight: 700 }}>{c.assignedTo}</span>}
                </button>
              );
            })}
          </KioskSection>
        )}

        {dueNotes.length > 0 && (
          <KioskSection title="Todo" accent={BLUE}>
            {dueNotes.map(t => (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <Icon name="check" size={18} color={BLUE} />
                <span style={{ fontSize: 16, color: TEXT }}>{t.title}</span>
                <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: daysUntil(t.dueDate!) < 0 ? DANGER : AMBER }}>{daysUntil(t.dueDate!) < 0 ? `${-daysUntil(t.dueDate!)}d overdue` : "today"}</span>
              </div>
            ))}
          </KioskSection>
        )}

        {todayMeals.length > 0 && (
          <KioskSection title="Meals" accent={LAV}>
            {todayMeals.map(e => (
              <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <Icon name="utensils" size={18} color={LAV} />
                {e.label && <span style={{ fontSize: 12, fontWeight: 700, color: LAV }}>{e.label}</span>}
                <span style={{ fontSize: 16, color: TEXT }}>{mealName(e.mealId)}</span>
              </div>
            ))}
          </KioskSection>
        )}

        {(maintAlerts.length > 0 || financeAlerts.length > 0) && (
          <KioskSection title="Heads up" accent={AMBER}>
            {maintAlerts.map(({ t, due }) => {
              const done = t.lastDone === todayISO();
              const n = due ? daysUntil(due) : 0;
              return (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", borderRadius: 12, background: done ? "rgba(93,184,138,0.08)" : "rgba(255,255,255,0.04)", border: `1px solid ${done ? JADE + "33" : "rgba(255,255,255,0.07)"}` }}>
                  <Icon name="wrench" size={18} color={done ? TEXT_MUTED : AMBER} />
                  <span style={{ fontSize: 16, color: done ? TEXT_MUTED : TEXT, textDecoration: done ? "line-through" : "none" }}>{t.task}</span>
                  {!done && <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: n < 0 ? DANGER : AMBER }}>{n < 0 ? `${-n}d overdue` : n === 0 ? "today" : `${n}d`}</span>}
                  {done && <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: JADE }}>done</span>}
                </div>
              );
            })}
            {financeAlerts.map(s => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <Icon name="card" size={18} color={TEAL} />
                <span style={{ fontSize: 16, color: TEXT }}>{s.name} {s.isSub ? "renews" : "due"}</span>
                <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: TEAL }}>{fmtMoney(s.cost)} · {daysUntil(s.due) === 0 ? "today" : `${daysUntil(s.due)}d`}</span>
              </div>
            ))}
          </KioskSection>
        )}
      </div>
    </div>
  );
}

function KioskSection({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: accent, marginBottom: 10 }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{children}</div>
    </div>
  );
}
