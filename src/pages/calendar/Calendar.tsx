import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  collection, onSnapshot, doc, setDoc, updateDoc, addDoc, query,
} from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../auth";
import { Icon, type IconName } from "../../components/Icon";
import { WisdomCard, quoteOfDay } from "../../components/Wisdom";
import {
  PageShell, Pill, useIsMobile,
  toISODate, fromISODate, daysUntil, weekKey, todayISO,
  DAY_NAMES, DAY_ABBR, MONTH_NAMES,
  BG, SURFACE, BORDER, TEXT, TEXT_DIM, TEXT_MUTED,
  JADE, BLUE, PINK, AMBER, TEAL, LAV, YELLOW, DANGER, FONT,
} from "../shared/kit";

const TODAY_HI_BG = "rgba(232,200,74,0.07)";   // yellow wash for the current day
const TODAY_HI_BORDER = YELLOW + "55";

// ── Source data shapes (subset of each module's model) ───────────────────────
interface Note { id: string; title: string; completed: boolean; dueDate?: string | null; }
interface Chore { id: string; name: string; assignedTo: string; daysOfWeek: number[]; }
interface MaintTask { id: string; task: string; lastDone?: string | null; intervalDays: number; category: string; }
interface SubRenewal { id: string; name: string; cost: number; renewalDate: string; }
interface Meal { id: string; name: string; }
interface PlanEntry { id: string; mealId: string; day?: string; label?: string; }

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

const assignPalette = [PINK, BLUE, JADE, AMBER, LAV, TEAL];
function assigneeColor(name: string) {
  if (!name) return TEXT_DIM;
  let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return assignPalette[h % assignPalette.length];
}

// ── Page ─────────────────────────────────────────────────────────────────
export default function Calendar() {
  const uidAuth = useAuth().uid;
  const isMobile = useIsMobile();
  const [view, setView] = useState<"today" | "week">("today");
  const [showAddNote, setShowAddNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");

  const [notes, setNotes] = useState<Note[]>([]);
  const [chores, setChores] = useState<Chore[]>([]);
  const [maint, setMaint] = useState<MaintTask[]>([]);
  const [subs, setSubs] = useState<SubRenewal[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [planEntries, setPlanEntries] = useState<PlanEntry[]>([]);
  const [log, setLog] = useState<Record<string, boolean>>({});

  const today = useMemo(() => new Date(), []);
  const quote = useMemo(() => quoteOfDay(), []);
  const todayIdx = today.getDay();
  const wk = weekKey(today);

  useEffect(() => {
    const subsList = [
      onSnapshot(query(collection(db, "users", uidAuth, "notes")), s => setNotes(s.docs.map(d => ({ id: d.id, ...d.data() } as Note))), e => console.error("notes", e)),
      onSnapshot(query(collection(db, "users", uidAuth, "chores")), s => setChores(s.docs.map(d => ({ id: d.id, ...d.data() } as Chore))), e => console.error("chores", e)),
      onSnapshot(query(collection(db, "users", uidAuth, "maintenance")), s => setMaint(s.docs.map(d => ({ id: d.id, ...d.data() } as MaintTask))), e => console.error("maint", e)),
      // Subscriptions now live inside the finance plan as recurring expenses (kind="subscription").
      onSnapshot(doc(db, "users", uidAuth, "finance", "plan"), s => {
        if (!s.exists()) { setSubs([]); return; }
        const fx = (s.data().fixedExpenses ?? []) as Array<{ id: string; name: string; amount: number; kind?: string; active?: boolean; renewalDate?: string }>;
        setSubs(fx.filter(e => e.kind === "subscription" && e.active !== false && e.renewalDate)
                  .map(e => ({ id: e.id, name: e.name, cost: e.amount, renewalDate: e.renewalDate as string })));
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
  // Notes due: overdue + due today, not completed.
  const dueNotes = notes.filter(t => !t.completed && t.dueDate && daysUntil(t.dueDate) <= 0)
    .sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1));
  // Heads-up: maintenance overdue/within 7 days + subscription renewals within 7 days.
  const maintAlerts = maint
    .map(t => ({ t, due: nextMaintDue(t) }))
    .filter(x => x.due && daysUntil(x.due) <= 7)
    .sort((a, b) => daysUntil(a.due!) - daysUntil(b.due!));
  const subAlerts = subs
    .filter(s => daysUntil(s.renewalDate) >= 0 && daysUntil(s.renewalDate) <= 7)
    .sort((a, b) => daysUntil(a.renewalDate) - daysUntil(b.renewalDate));

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
  const nothingToday = todayChores.length === 0 && todayMeals.length === 0 && dueNotes.length === 0 && maintAlerts.length === 0 && subAlerts.length === 0;

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

      <div style={{ marginBottom: 20 }}>
        <WisdomCard quote={quote} compact />
      </div>

      {/* Date heading */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: YELLOW }}>
          {view === "today" ? "Your day" : "Your week"}
        </div>
        <h1 style={{ fontSize: isMobile ? 22 : 26, fontWeight: 800, color: TEXT, margin: "4px 0 0" }}>{dateLine}</h1>
      </div>

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
                placeholder="New note for today…"
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
              <Icon name="plus" size={15} color="currentColor" /> Add a note for today
            </button>
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
              to="/chores">
              {todayChores.map(c => {
                const checked = !!log[`${c.id}:${todayIdx}`];
                return (
                  <button key={c.id} onClick={() => toggleChore(c.id)} style={rowBtn(checked)}>
                    <CheckBox on={checked} color={JADE} />
                    <span style={{ flex: 1, fontSize: 14, color: checked ? TEXT_MUTED : TEXT, textDecoration: checked ? "line-through" : "none" }}>{c.name}</span>
                    {c.assignedTo && <span style={{ fontSize: 11, fontWeight: 700, color: assigneeColor(c.assignedTo) }}>{c.assignedTo}</span>}
                  </button>
                );
              })}
            </Section>
          )}

          {/* Notes due */}
          {dueNotes.length > 0 && (
            <Section icon="check" accent={BLUE} title="Notes due" to="/notes">
              {dueNotes.map(t => {
                const overdue = daysUntil(t.dueDate!) < 0;
                return (
                  <button key={t.id} onClick={() => toggleNote(t)} style={rowBtn(false)}>
                    <CheckBox on={false} color={BLUE} />
                    <span style={{ flex: 1, fontSize: 14, color: TEXT }}>{t.title}</span>
                    <Pill color={overdue ? DANGER : AMBER}>{overdue ? `${-daysUntil(t.dueDate!)}d overdue` : "today"}</Pill>
                  </button>
                );
              })}
            </Section>
          )}

          {/* Meals */}
          {todayMeals.length > 0 && (
            <Section icon="book" accent={LAV} title="Meals" to="/food">
              {todayMeals.map(e => (
                <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, background: "var(--surface)", border: `1px solid ${BORDER}` }}>
                  {e.label && <Pill color={LAV}>{e.label}</Pill>}
                  <span style={{ fontSize: 14, color: TEXT }}>{mealName(e.mealId)}</span>
                </div>
              ))}
            </Section>
          )}

          {/* Heads up */}
          {(maintAlerts.length > 0 || subAlerts.length > 0) && (
            <Section icon="clock" accent={AMBER} title="Heads up">
              {maintAlerts.map(({ t, due }) => {
                const n = daysUntil(due!);
                return (
                  <Link key={t.id} to="/maintenance" style={{ textDecoration: "none" }}>
                    <div style={infoRow}>
                      <Icon name="wrench" size={14} color={AMBER} />
                      <span style={{ flex: 1, fontSize: 14, color: TEXT }}>{t.task}</span>
                      <Pill color={n < 0 ? DANGER : AMBER}>{n < 0 ? `${-n}d overdue` : n === 0 ? "today" : `${n}d`}</Pill>
                    </div>
                  </Link>
                );
              })}
              {subAlerts.map(s => (
                <Link key={s.id} to="/finance" style={{ textDecoration: "none" }}>
                  <div style={infoRow}>
                    <Icon name="card" size={14} color={TEAL} />
                    <span style={{ flex: 1, fontSize: 14, color: TEXT }}>{s.name} renews</span>
                    <span style={{ fontSize: 12, color: TEXT_DIM }}>{fmtMoney(s.cost)}</span>
                    <Pill color={daysUntil(s.renewalDate) <= 2 ? DANGER : TEAL}>{daysUntil(s.renewalDate) === 0 ? "today" : `${daysUntil(s.renewalDate)}d`}</Pill>
                  </div>
                </Link>
              ))}
            </Section>
          )}
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
            return (
              <div key={dayIdx} style={{ background: isToday ? TODAY_HI_BG : SURFACE, border: `1px solid ${isToday ? TODAY_HI_BORDER : BORDER}`, borderRadius: 12, overflow: "hidden" }}>
                <div style={{ padding: "8px 12px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", color: isToday ? YELLOW : TEXT_DIM }}>{isMobile ? dayName : DAY_ABBR[dayIdx]}</span>
                  <span style={{ fontSize: 11, color: TEXT_MUTED }}>{date.getDate()}</span>
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
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: assigneeColor(c.assignedTo), flexShrink: 0 }} />
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

// ── Small building blocks ────────────────────────────────────────────────
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
      {on && <span style={{ color: BG, fontSize: 11, fontWeight: 700, lineHeight: 1 }}>✓</span>}
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
