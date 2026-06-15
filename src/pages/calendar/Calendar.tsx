import { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  collection, onSnapshot, doc, setDoc, updateDoc, addDoc, query,
} from "firebase/firestore";
import { db } from "../../firebase";
import { useHouseholdUid } from "../../household";
import { usePeople, personColor } from "../../usePeople";
import { Icon, type IconName } from "../../components/Icon";
import { WisdomCard, useDailyQuote, type Quote } from "../../components/Wisdom";
import { usePrefs } from "../../prefs";
import {
  PageShell, Pill, useIsMobile,
  toISODate, fromISODate, daysUntil, weekKey, todayISO,
  DAY_NAMES, DAY_ABBR, MONTH_NAMES,
  BG, SURFACE, BORDER, TEXT, TEXT_DIM, TEXT_MUTED,
  JADE, BLUE, PINK, AMBER, TEAL, LAV, YELLOW, DANGER, FONT,
} from "../shared/kit";
import { useWeather, weatherInfo, temp, type Unit, type DayWeather, type WeatherData } from "./weather";
import GCalSection from "./GCalSection";

const TODAY_HI_BG = "rgba(232,200,74,0.07)";   // yellow wash for the current day
const TODAY_HI_BORDER = YELLOW + "55";

// ── Source data shapes (subset of each module's model) ───────────────────────
interface Note { id: string; title: string; completed: boolean; dueDate?: string | null; }
interface Chore { id: string; name: string; assignedTo: string; daysOfWeek: number[]; }
interface MaintTask { id: string; task: string; lastDone?: string | null; intervalDays: number; category: string; remindDays?: number; }
interface FinanceDue { id: string; name: string; cost: number; due: string; isSub: boolean; }
interface Meal { id: string; name: string; }
interface PlanEntry { id: string; mealId: string; day?: string; label?: string; }

// Raw recurring-expense shape we read off the finance plan (subset of FixedExpense).
interface RawExpense {
  id: string; name: string; amount: number;
  kind?: string; active?: boolean; renewalDate?: string; dayOfMonth?: number; frequency?: string;
}

/**
 * Next due date for a recurring expense, or null if it can't be determined.
 * Subscriptions carry an explicit renewalDate; monthly bills derive theirs from
 * dayOfMonth (clamped to the month length). Non-monthly bills without a date are skipped.
 */
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


// ── Page ─────────────────────────────────────────────────────────────────
export default function Calendar() {
  const uidAuth = useHouseholdUid();
  const { prefs } = usePrefs();
  const people = usePeople();
  const isMobile = useIsMobile();
  const [searchParams] = useSearchParams();
  const kiosk = searchParams.get("kiosk") === "true";
  const [view, setView] = useState<"today" | "week">("today");
  const [showAddNote, setShowAddNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");

  const [notes, setNotes] = useState<Note[]>([]);
  const [chores, setChores] = useState<Chore[]>([]);
  const [maint, setMaint] = useState<MaintTask[]>([]);
  const [financeDue, setFinanceDue] = useState<FinanceDue[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [planEntries, setPlanEntries] = useState<PlanEntry[]>([]);
  const [log, setLog] = useState<Record<string, boolean>>({});
  const [justDoneNoteIds, setJustDoneNoteIds] = useState<Set<string>>(new Set());
  const [justDoneMaintIds, setJustDoneMaintIds] = useState<Set<string>>(new Set());

  const unit = prefs.tempUnit;
  const { data: weather } = useWeather(prefs.weatherZip);

  const today = useMemo(() => new Date(), []);
  const showWisdom = prefs.wisdomPages.includes("calendar");
  const quote = useDailyQuote();
  const todayIdx = today.getDay();
  const wk = weekKey(today);

  useEffect(() => {
    const subsList = [
      onSnapshot(query(collection(db, "users", uidAuth, "notes")), s => setNotes(s.docs.map(d => ({ id: d.id, ...d.data() } as Note))), e => console.error("notes", e)),
      onSnapshot(query(collection(db, "users", uidAuth, "chores")), s => setChores(s.docs.map(d => ({ id: d.id, ...d.data() } as Chore))), e => console.error("chores", e)),
      onSnapshot(query(collection(db, "users", uidAuth, "maintenance")), s => setMaint(s.docs.map(d => ({ id: d.id, ...d.data() } as MaintTask))), e => console.error("maint", e)),
      // Recurring expenses live inside the finance plan (bills + kind="subscription").
      onSnapshot(doc(db, "users", uidAuth, "finance", "plan"), s => {
        if (!s.exists()) { setFinanceDue([]); return; }
        const fx = (s.data().fixedExpenses ?? []) as RawExpense[];
        setFinanceDue(
          fx.filter(e => e.active !== false)
            .map(e => {
              const due = financeDueDate(e);
              return due ? { id: e.id, name: e.name, cost: e.amount, due, isSub: e.kind === "subscription" } : null;
            })
            .filter((x): x is FinanceDue => x !== null),
        );
      }, e => console.error("plan", e)),
      onSnapshot(doc(db, "users", uidAuth, "choreLog", wk), s => setLog(s.exists() ? (s.data().done ?? {}) : {}), e => console.error("log", e)),
      // Meal plan now lives in the user's own space (was a shared owner-only doc).
      onSnapshot(doc(db, "users", uidAuth, "food", "planner"),
        s => { if (s.exists()) { const d = s.data(); setMeals(d.meals ?? []); setPlanEntries(d.planEntries ?? []); } },
        e => console.error("meals", e)),
    ];
    return () => subsList.forEach(u => u());
  }, [uidAuth, wk]);

  const mealName = useMemo(() => {
    const m = new Map(meals.map(x => [x.id, x.name]));
    return (id: string) => m.get(id) ?? "—";
  }, [meals]);

  function mealsForDay(dayIdx: number): PlanEntry[] {
    const dayName = DAY_NAMES[dayIdx];
    return planEntries.filter(e => e.day === dayName).sort((a, b) => mealLabelRank(a.label) - mealLabelRank(b.label));
  }
  function choresForDay(dayIdx: number): Chore[] {
    return chores.filter(c => c.daysOfWeek?.includes(dayIdx));
  }
  function notesForDay(dayIdx: number): Note[] {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - todayIdx + dayIdx);
    const iso = toISODate(date);
    return notes.filter(t => !t.completed && t.dueDate === iso);
  }

  // ── Today aggregations ──
  const todayChores = choresForDay(todayIdx);
  const todayMeals = mealsForDay(todayIdx);
  // Notes due: anything due today (checked or unchecked) always shows; overdue
  // shows while still open (or just-checked this session, so it lingers briefly).
  const dueNotes = notes.filter(t => {
    if (!t.dueDate) return false;
    const d = daysUntil(t.dueDate);
    if (d > 0) return false;                          // future — not yet
    if (d === 0) return true;                          // due today — always
    return !t.completed || justDoneNoteIds.has(t.id);  // overdue — if open / just-done
  }).sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1));
  // Heads-up: each task surfaces within its own lead time (remindDays; default 7),
  // and stays while overdue. Plus finances (bills & subscriptions) due within 3 days.
  const maintAlerts = maint
    .map(t => ({ t, due: nextMaintDue(t) }))
    .filter(x => x.due && daysUntil(x.due) <= (x.t.remindDays ?? 7))
    .sort((a, b) => daysUntil(a.due!) - daysUntil(b.due!));
  const financeAlerts = financeDue
    .filter(s => daysUntil(s.due) >= 0 && daysUntil(s.due) <= 3)
    .sort((a, b) => daysUntil(a.due) - daysUntil(b.due));

  const choresDone = todayChores.filter(c => log[`${c.id}:${todayIdx}`]).length;

  function toggleChore(choreId: string) {
    const key = `${choreId}:${todayIdx}`;
    const next = { ...log };
    if (next[key]) delete next[key]; else next[key] = true;
    setLog(next);
    setDoc(doc(db, "users", uidAuth, "choreLog", wk), { done: next }).catch(console.error);
  }
  function toggleNote(t: Note) {
    updateDoc(doc(db, "users", uidAuth, "notes", t.id), { completed: !t.completed }).catch(console.error);
    setJustDoneNoteIds(prev => {
      const next = new Set(prev);
      if (!t.completed) next.add(t.id); else next.delete(t.id);
      return next;
    });
  }
  function markMaintDone(t: MaintTask) {
    updateDoc(doc(db, "users", uidAuth, "maintenance", t.id), { lastDone: todayISO() }).catch(console.error);
    setJustDoneMaintIds(prev => new Set([...prev, t.id]));
  }
  // Add a note straight from the Today page, due today. Stays on the calendar —
  // the live snapshot surfaces it under "Notes due".
  function addNoteToday() {
    const title = noteDraft.trim();
    if (!title) return;
    addDoc(collection(db, "users", uidAuth, "notes"), {
      title, notes: "", completed: false, createdAt: Date.now(), dueDate: todayISO(),
    }).catch(console.error);
    setNoteDraft("");
    setShowAddNote(false);
  }

  const dateLine = `${DAY_NAMES[todayIdx]}, ${MONTH_NAMES[today.getMonth()]} ${today.getDate()}`;
  const nothingToday = todayChores.length === 0 && todayMeals.length === 0 && dueNotes.length === 0 && maintAlerts.length === 0 && financeAlerts.length === 0;

  // Kiosk / wall-display mode — full-screen, no chrome
  if (kiosk) {
    return (
      <KioskView
        dateLine={dateLine}
        todayChores={todayChores} log={log} todayIdx={todayIdx}
        dueNotes={dueNotes} todayMeals={todayMeals} mealName={mealName}
        maintAlerts={maintAlerts} financeAlerts={financeAlerts}
        onToggleChore={toggleChore}
        nothingToday={nothingToday}
        weather={weather} unit={unit}
        people={people}
        quote={quote} showWisdom={showWisdom}
      />
    );
  }

  const toggle = (
    <div style={{ display: "flex", gap: 4, background: "var(--surface)", borderRadius: 9, padding: 3 }}>
      {(["today", "week"] as const).map(v => (
        <button key={v} onClick={() => setView(v)}
          style={{ padding: "5px 14px", borderRadius: 7, border: "none", cursor: "pointer", fontFamily: FONT, fontSize: 12, fontWeight: 700, textTransform: "capitalize",
            background: view === v ? YELLOW : "transparent", color: view === v ? BG : TEXT_DIM }}>
          {v}
        </button>
      ))}
    </div>
  );

  return (
    <PageShell tool="calendar" maxWidth={view === "week" ? 1100 : 760} headerExtra={toggle}>

      {/* Date heading */}
      {isMobile ? (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: YELLOW }}>
            {view === "today" ? "Your day" : "Your week"}
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: TEXT, margin: "4px 0 12px" }}>{dateLine}</h1>
          {weather?.current && (
            <CurrentWeather current={weather.current} day={weather.daily[todayISO()] ?? null} unit={unit} location={weather.location} fullWidth />
          )}
        </div>
      ) : (
        <div style={{ marginBottom: 20, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: YELLOW }}>
              {view === "today" ? "Your day" : "Your week"}
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: TEXT, margin: "4px 0 0" }}>{dateLine}</h1>
          </div>
          {weather?.current && (
            <CurrentWeather current={weather.current} day={weather.daily[todayISO()] ?? null} unit={unit} location={weather.location} />
          )}
        </div>
      )}

      {view === "today" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Quick-add a note due today */}
          {showAddNote ? (
            <div style={{ display: "flex", gap: 8, alignItems: "center", background: SURFACE, border: `1px solid ${BLUE}55`, borderRadius: 12, padding: "8px 10px" }}>
              <Icon name="check" size={16} color={BLUE} />
              <input
                autoFocus
                value={noteDraft}
                onChange={e => setNoteDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") addNoteToday();
                  if (e.key === "Escape") { setShowAddNote(false); setNoteDraft(""); }
                }}
                placeholder="New todo…"
                style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: TEXT, fontSize: 14, fontFamily: FONT }}
              />
              <button onClick={addNoteToday} disabled={!noteDraft.trim()}
                style={{ background: BLUE, color: BG, border: "none", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontFamily: FONT, fontSize: 13, fontWeight: 700, opacity: noteDraft.trim() ? 1 : 0.5 }}>
                Add
              </button>
              <button onClick={() => { setShowAddNote(false); setNoteDraft(""); }}
                style={{ background: "transparent", color: TEXT_DIM, border: "none", cursor: "pointer", padding: "6px 6px", display: "flex", alignItems: "center" }}>
                <Icon name="x" size={16} color={TEXT_DIM} />
              </button>
            </div>
          ) : (
            <button onClick={() => setShowAddNote(true)}
              style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", padding: "10px 12px", borderRadius: 12, cursor: "pointer", fontFamily: FONT, fontSize: 13, fontWeight: 600, color: TEXT_DIM, background: "transparent", border: `1px dashed ${BORDER}`, transition: "all 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = BLUE; e.currentTarget.style.color = BLUE; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = TEXT_DIM; }}>
              <Icon name="plus" size={15} color="currentColor" /> Add a todo
            </button>
          )}

          {/* Todo (notes due) */}
          {dueNotes.length > 0 && (
            <Section icon="check" accent={BLUE} title="Todo" to="/app/notes">
              {dueNotes.map(t => {
                const done = t.completed || justDoneNoteIds.has(t.id);
                const overdue = daysUntil(t.dueDate!) < 0;
                return (
                  <button key={t.id} onClick={() => toggleNote(t)} style={rowBtn(done)}>
                    <CheckBox on={done} color={BLUE} />
                    <span style={{ flex: 1, fontSize: 14, color: done ? TEXT_MUTED : TEXT, textDecoration: done ? "line-through" : "none" }}>{t.title}</span>
                    {!done && <Pill color={overdue ? DANGER : AMBER}>{overdue ? `${-daysUntil(t.dueDate!)}d overdue` : "today"}</Pill>}
                  </button>
                );
              })}
            </Section>
          )}

          {nothingToday && (
            <div style={{ textAlign: "center", padding: "40px 20px", color: TEXT_MUTED }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: TEXT_DIM }}>A clear day.</div>
              <div style={{ fontSize: 13, marginTop: 6 }}>Nothing scheduled. Enjoy the stillness — or plan ahead.</div>
            </div>
          )}

          {/* Chores */}
          {todayChores.length > 0 && (
            <Section icon="sparkles" accent={PINK} title="Chores"
              right={<span style={{ fontSize: 12, fontWeight: 700, color: choresDone === todayChores.length ? JADE : TEXT_DIM }}>{choresDone}/{todayChores.length}</span>}
              to="/app/chores">
              {todayChores.map(c => {
                const checked = !!log[`${c.id}:${todayIdx}`];
                return (
                  <button key={c.id} onClick={() => toggleChore(c.id)} style={rowBtn(checked)}>
                    <CheckBox on={checked} color={JADE} />
                    <span style={{ flex: 1, fontSize: 14, color: checked ? TEXT_MUTED : TEXT, textDecoration: checked ? "line-through" : "none" }}>{c.name}</span>
                    {c.assignedTo && <span style={{ fontSize: 11, fontWeight: 700, color: personColor(people.find(p => p.name === c.assignedTo), c.assignedTo) }}>{c.assignedTo}</span>}
                  </button>
                );
              })}
            </Section>
          )}

          {/* Meals */}
          {todayMeals.length > 0 && (
            <Section icon="book" accent={LAV} title="Meals" to="/app/food">
              {todayMeals.map(e => (
                <Link key={e.id} to={`/app/food?meal=${e.mealId}`} style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, background: "var(--surface)", border: `1px solid ${BORDER}`, transition: "border-color 0.15s" }}
                  onMouseEnter={ev => (ev.currentTarget as HTMLAnchorElement).style.borderColor = LAV + "55"}
                  onMouseLeave={ev => (ev.currentTarget as HTMLAnchorElement).style.borderColor = BORDER}>
                  {e.label && <Pill color={LAV}>{e.label}</Pill>}
                  <span style={{ fontSize: 14, color: TEXT, flex: 1 }}>{mealName(e.mealId)}</span>
                  <Icon name="chevronRight" size={12} color={TEXT_MUTED} style={{ opacity: 0.5 }} />
                </Link>
              ))}
            </Section>
          )}

          {/* Heads up */}
          {(maintAlerts.length > 0 || financeAlerts.length > 0) && (
            <Section icon="clock" accent={AMBER} title="Heads up">
              {maintAlerts.map(({ t, due }) => {
                const n = daysUntil(due!);
                const done = justDoneMaintIds.has(t.id);
                return (
                  <button key={t.id} onClick={() => markMaintDone(t)} style={rowBtn(done)}>
                    <CheckBox on={done} color={AMBER} />
                    <Icon name="wrench" size={14} color={done ? TEXT_MUTED : AMBER} />
                    <span style={{ flex: 1, fontSize: 14, color: done ? TEXT_MUTED : TEXT, textDecoration: done ? "line-through" : "none" }}>{t.task}</span>
                    {!done && <Pill color={n < 0 ? DANGER : AMBER}>{n < 0 ? `${-n}d overdue` : n === 0 ? "today" : `${n}d`}</Pill>}
                  </button>
                );
              })}
              {financeAlerts.map(s => (
                <Link key={s.id} to="/app/finance" style={{ textDecoration: "none" }}>
                  <div style={infoRow}>
                    <Icon name="card" size={14} color={TEAL} />
                    <span style={{ flex: 1, fontSize: 14, color: TEXT }}>{s.name} {s.isSub ? "renews" : "due"}</span>
                    <span style={{ fontSize: 12, color: TEXT_DIM }}>{fmtMoney(s.cost)}</span>
                    <Pill color={daysUntil(s.due) <= 1 ? DANGER : TEAL}>{daysUntil(s.due) === 0 ? "today" : `${daysUntil(s.due)}d`}</Pill>
                  </div>
                </Link>
              ))}
            </Section>
          )}

          <GCalSection />
        </div>
      ) : (
        // ── Week view ──
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(7, 1fr)", gap: 10 }}>
          {DAY_NAMES.map((dayName, dayIdx) => {
            const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - todayIdx + dayIdx);
            const isToday = dayIdx === todayIdx;
            const dMeals = mealsForDay(dayIdx);
            const dChores = choresForDay(dayIdx);
            const dNotes = notesForDay(dayIdx);
            const dWeather = weather?.daily[toISODate(date)] ?? null;
            return (
              <div key={dayIdx} style={{ background: isToday ? TODAY_HI_BG : SURFACE, border: `1px solid ${isToday ? TODAY_HI_BORDER : BORDER}`, borderRadius: 12, overflow: "hidden" }}>
                <div style={{ padding: "8px 12px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", color: isToday ? YELLOW : TEXT_DIM }}>{isMobile ? dayName : DAY_ABBR[dayIdx]}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {dWeather && (() => {
                      const wi = weatherInfo(dWeather.code);
                      return (
                        <span title={wi.label} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                          <Icon name={wi.icon} size={13} color={wi.color} />
                          <span style={{ fontSize: 10, color: TEXT_DIM, fontWeight: 700 }}>{temp(unit, dWeather.maxC, dWeather.maxF)}°<span style={{ color: TEXT_MUTED, fontWeight: 600 }}>/{temp(unit, dWeather.minC, dWeather.minF)}°</span></span>
                        </span>
                      );
                    })()}
                    <span style={{ fontSize: 11, color: TEXT_MUTED }}>{date.getDate()}</span>
                  </span>
                </div>
                <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                  {dMeals.length === 0 && dChores.length === 0 && dNotes.length === 0 && (
                    <span style={{ fontSize: 11, color: TEXT_MUTED, fontStyle: "italic" }}>—</span>
                  )}
                  {dMeals.map(e => (
                    <div key={e.id} style={{ fontSize: 12, color: TEXT, display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: LAV, flexShrink: 0 }} />
                      <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{mealName(e.mealId)}</span>
                    </div>
                  ))}
                  {dChores.map(c => (
                    <div key={c.id} style={{ fontSize: 12, color: TEXT_DIM, display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: personColor(people.find(p => p.name === c.assignedTo), c.assignedTo), flexShrink: 0 }} />
                      <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>
                    </div>
                  ))}
                  {dNotes.map(t => (
                    <div key={t.id} style={{ fontSize: 12, color: BLUE, display: "flex", alignItems: "center", gap: 6 }}>
                      <Icon name="check" size={11} color={BLUE} />
                      <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}

// ── Kiosk / wall-display view ─────────────────────────────────────────────
interface KioskProps {
  dateLine: string;
  todayChores: Chore[]; log: Record<string, boolean>; todayIdx: number;
  dueNotes: Note[]; todayMeals: PlanEntry[]; mealName: (id: string) => string;
  maintAlerts: { t: MaintTask; due: string | null }[]; financeAlerts: FinanceDue[];
  onToggleChore: (id: string) => void;
  nothingToday: boolean;
  weather: WeatherData | null; unit: Unit;
  people: ReturnType<typeof usePeople>;
  quote: Quote;
  showWisdom: boolean;
}

function KioskView({ dateLine, todayChores, log, todayIdx, dueNotes, todayMeals, mealName, maintAlerts, financeAlerts, onToggleChore, nothingToday, weather, unit, people, quote, showWisdom }: KioskProps) {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const hh = String(time.getHours() % 12 || 12).padStart(2, "0");
  const mm = String(time.getMinutes()).padStart(2, "0");
  const ss = String(time.getSeconds()).padStart(2, "0");
  const ampm = time.getHours() >= 12 ? "PM" : "AM";
  const choresDone = todayChores.filter(c => log[`${c.id}:${todayIdx}`]).length;

  return (
    <div data-theme="dark" style={{ background: "#06091a", minHeight: "100vh", fontFamily: FONT, color: "var(--text)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Clock header */}
      <div style={{ padding: "32px 48px 20px", borderBottom: `1px solid rgba(255,255,255,0.06)`, display: "flex", alignItems: "flex-end", gap: 20, flexWrap: "wrap" }}>
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
                  <div style={{ fontSize: 38, fontWeight: 800, color: TEXT }}>{temp(unit, weather.current.tempC, weather.current.tempF)}°{unit}</div>
                  <div style={{ fontSize: 13, color: TEXT_MUTED, fontWeight: 600 }}>
                    {wi.label}{day && ` · ${temp(unit, day.maxC, day.maxF)}°/${temp(unit, day.minC, day.minF)}°`}{weather.location && ` · ${weather.location}`}
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

      {/* Content */}
      <div style={{ flex: 1, overflow: "auto", padding: "24px 48px 40px", display: "flex", flexDirection: "column", gap: 20, maxWidth: 960 }}>
        {showWisdom && (
          <WisdomCard quote={quote} compact noLink />
        )}

        {nothingToday && (
          <div style={{ fontSize: 20, color: "var(--text-dim)", fontWeight: 600, marginTop: 20 }}>A clear day — nothing scheduled.</div>
        )}

        {todayChores.length > 0 && (
          <KioskSection title="Chores" accent={PINK}>
            {todayChores.map(c => {
              const checked = !!log[`${c.id}:${todayIdx}`];
              return (
                <button key={c.id} onClick={() => onToggleChore(c.id)}
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
              const n = daysUntil(due!);
              return (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <Icon name="wrench" size={18} color={AMBER} />
                  <span style={{ fontSize: 16, color: TEXT }}>{t.task}</span>
                  <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: n < 0 ? DANGER : AMBER }}>{n < 0 ? `${-n}d overdue` : n === 0 ? "today" : `${n}d`}</span>
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

// ── Small building blocks ────────────────────────────────────────────────
function CurrentWeather({ current, day, unit, location, fullWidth }: {
  current: { code: number; isDay: boolean; tempC: number; tempF: number };
  day: DayWeather | null;
  unit: Unit;
  location: string;
  fullWidth?: boolean;
}) {
  const wi = weatherInfo(current.code, current.isDay);
  const now = temp(unit, current.tempC, current.tempF);
  const hi = day && temp(unit, day.maxC, day.maxF);
  const lo = day && temp(unit, day.minC, day.minF);
  const href = `https://duckduckgo.com/?q=weather+${encodeURIComponent(location || "near me")}`;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 9, padding: "7px 12px", background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, width: fullWidth ? "100%" : undefined, boxSizing: "border-box", cursor: "pointer", transition: "border-color 0.15s" }}
      onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.borderColor = YELLOW}
      onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.borderColor = BORDER}>
      <Icon name={wi.icon} size={22} color={wi.color} />
      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
        <span style={{ fontSize: 16, fontWeight: 800, color: TEXT }}>{now}°{unit}</span>
        <span style={{ fontSize: 10, color: TEXT_DIM, fontWeight: 600 }}>
          {wi.label}{hi != null && ` · ${hi}°/${lo}°`}{location && ` · ${location}`}
        </span>
      </div>
    </a>
  );
}

function Section({ icon, accent, title, right, to, children }: {
  icon: IconName; accent: string; title: string; right?: React.ReactNode; to?: string; children: React.ReactNode;
}) {
  const header = (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
      <Icon name={icon} size={16} color={accent} />
      <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", color: TEXT }}>{title}</span>
      {to && <Icon name="chevronDown" size={13} color={TEXT_MUTED} style={{ transform: "rotate(-90deg)", opacity: 0.5 }} />}
      <span style={{ marginLeft: "auto" }}>{right}</span>
    </div>
  );
  return (
    <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "14px 16px" }}>
      {to ? <Link to={to} style={{ textDecoration: "none" }}>{header}</Link> : header}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{children}</div>
    </div>
  );
}

function CheckBox({ on, color }: { on: boolean; color: string }) {
  return (
    <span style={{ flexShrink: 0, width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${on ? color : "var(--border-hi)"}`, background: on ? color : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {on && <Icon name="checkMark" size={11} />}
    </span>
  );
}

const rowBtn = (checked: boolean): React.CSSProperties => ({
  display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
  padding: "10px 12px", borderRadius: 10, cursor: "pointer", fontFamily: FONT,
  background: checked ? "rgba(93,184,138,0.08)" : "var(--surface)",
  border: `1px solid ${checked ? JADE + "33" : BORDER}`, transition: "all 0.12s",
});

const infoRow: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10,
  background: "var(--surface)", border: `1px solid ${BORDER}`,
};
