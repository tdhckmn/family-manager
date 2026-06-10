import { useState, useEffect, useMemo } from "react";
import {
  collection, onSnapshot, doc, setDoc, deleteDoc, query, orderBy,
} from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../auth";
import { Icon } from "../../components/Icon";
import {
  PageShell, Panel, Field, Pill, EmptyHint, useIsMobile,
  btn, inputStyle, uid, toISODate, fromISODate, daysUntil, prettyDate, todayISO,
  BG, SURFACE, BORDER, BORDER_HI, TEXT, TEXT_DIM, TEXT_MUTED,
  AMBER, ORANGE, JADE, DANGER, FONT,
} from "../shared/kit";

// ── Types ─────────────────────────────────────────────────────────────────
interface MaintTask {
  id: string;
  task: string;
  lastDone?: string | null;  // YYYY-MM-DD; null = never logged
  intervalDays: number;
  category: string;
  notes?: string;
}

const UPCOMING_WINDOW = 30; // days

// Category → suggested interval (days). Picking a category prefills a sensible cadence.
const CATEGORY_INTERVALS: Record<string, number> = {
  HVAC: 90, Plumbing: 180, Exterior: 180, Appliances: 365,
  Safety: 180, Yard: 30, Vehicle: 90, Other: 90,
};
const CATEGORIES = Object.keys(CATEGORY_INTERVALS);

// Quick-pick interval presets for the editor.
const INTERVAL_PRESETS: { label: string; days: number }[] = [
  { label: "Monthly", days: 30 }, { label: "Quarterly", days: 90 },
  { label: "Twice a year", days: 180 }, { label: "Yearly", days: 365 },
];

// Common household tasks offered as one-tap quick-adds.
const SUGGESTIONS: { task: string; category: string; days: number }[] = [
  { task: "Replace HVAC filter", category: "HVAC", days: 90 },
  { task: "HVAC seasonal tune-up", category: "HVAC", days: 365 },
  { task: "Change car oil", category: "Vehicle", days: 180 },
  { task: "Rotate tires", category: "Vehicle", days: 180 },
  { task: "Test smoke & CO detectors", category: "Safety", days: 180 },
  { task: "Inspect fire extinguisher", category: "Safety", days: 365 },
  { task: "Clean dryer vent", category: "Safety", days: 365 },
  { task: "Clean gutters", category: "Exterior", days: 180 },
  { task: "Reseal exterior caulk", category: "Exterior", days: 365 },
  { task: "Flush water heater", category: "Plumbing", days: 365 },
  { task: "Replace fridge water filter", category: "Appliances", days: 180 },
  { task: "Deep-clean dishwasher", category: "Appliances", days: 90 },
];

/** nextDue = lastDone + intervalDays. Null lastDone → null (needs first log). */
function nextDue(t: MaintTask): string | null {
  if (!t.lastDone) return null;
  const base = fromISODate(t.lastDone);
  const due = new Date(base.getFullYear(), base.getMonth(), base.getDate() + t.intervalDays);
  return toISODate(due);
}

type Status = "overdue" | "upcoming" | "ok" | "new";
function statusOf(t: MaintTask): Status {
  const due = nextDue(t);
  if (!due) return "new";
  const n = daysUntil(due);
  if (n < 0) return "overdue";
  if (n <= UPCOMING_WINDOW) return "upcoming";
  return "ok";
}

const intervalLabel = (days: number) => {
  if (days % 365 === 0) return `every ${days / 365} yr`;
  if (days % 30 === 0) return `every ${days / 30} mo`;
  if (days % 7 === 0) return `every ${days / 7} wk`;
  return `every ${days} days`;
};

const EMPTY: Omit<MaintTask, "id"> = { task: "", lastDone: "", intervalDays: 90, category: "Other", notes: "" };

// ── Page ─────────────────────────────────────────────────────────────────
export default function Maintenance() {
  const uidAuth = useAuth().uid;
  const isMobile = useIsMobile();
  const [tasks, setTasks] = useState<MaintTask[]>([]);
  const [editorId, setEditorId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Omit<MaintTask, "id">>(EMPTY);
  const [showSug, setShowSug] = useState(() => localStorage.getItem("maint-show-sug") !== "0");

  useEffect(() => {
    const q = query(collection(db, "users", uidAuth, "maintenance"), orderBy("task"));
    return onSnapshot(q, snap => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as MaintTask)));
    }, err => console.error("Maintenance load failed:", err));
  }, [uidAuth]);

  const sorted = useMemo(() => {
    const rank: Record<Status, number> = { overdue: 0, upcoming: 1, new: 2, ok: 3 };
    return [...tasks].sort((a, b) => {
      const ra = rank[statusOf(a)], rb = rank[statusOf(b)];
      if (ra !== rb) return ra - rb;
      const da = nextDue(a), dbb = nextDue(b);
      if (da && dbb) return da < dbb ? -1 : da > dbb ? 1 : 0;
      return 0;
    });
  }, [tasks]);

  const overdueCount = tasks.filter(t => statusOf(t) === "overdue").length;
  const soonCount = tasks.filter(t => statusOf(t) === "upcoming").length;

  function openNew() { setDraft(EMPTY); setEditorId("new"); }
  function openEdit(t: MaintTask) {
    setDraft({ task: t.task, lastDone: t.lastDone ?? "", intervalDays: t.intervalDays, category: t.category, notes: t.notes ?? "" });
    setEditorId(t.id);
  }
  function closeEditor() { setEditorId(null); }

  async function saveDraft() {
    if (!draft.task.trim()) return;
    const id = editorId && editorId !== "new" ? editorId : uid();
    const payload: MaintTask = {
      id,
      task: draft.task.trim(),
      lastDone: draft.lastDone?.trim() || null,
      intervalDays: Math.max(1, Math.round(Number(draft.intervalDays) || 1)),
      category: draft.category || "Other",
      notes: draft.notes?.trim() || "",
    };
    await setDoc(doc(db, "users", uidAuth, "maintenance", id), payload);
    closeEditor();
  }
  async function remove(id: string) {
    await deleteDoc(doc(db, "users", uidAuth, "maintenance", id));
    closeEditor();
  }
  /** Mark done today — advances the next-due clock. */
  async function markDone(t: MaintTask) {
    await setDoc(doc(db, "users", uidAuth, "maintenance", t.id), { ...t, lastDone: todayISO() });
  }

  /** One-tap add from the suggestion list (no last-done yet — user logs the first date). */
  async function addSuggestion(s: { task: string; category: string; days: number }) {
    const id = uid();
    await setDoc(doc(db, "users", uidAuth, "maintenance", id), {
      id, task: s.task, lastDone: null, intervalDays: s.days, category: s.category, notes: "",
    } as MaintTask);
  }

  const remainingSuggestions = SUGGESTIONS.filter(
    s => !tasks.some(t => t.task.trim().toLowerCase() === s.task.toLowerCase()),
  );

  return (
    <PageShell tool="maintenance" maxWidth={760}
      headerExtra={<button onClick={openNew} style={btn(ORANGE)}><Icon name="plus" size={15} color={BG} /> Add</button>}>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
        <Stat label="Overdue" value={`${overdueCount}`} color={overdueCount ? DANGER : JADE} />
        <Stat label="Due soon" value={`${soonCount}`} color={soonCount ? AMBER : JADE} />
        <Stat label="Tracked" value={`${tasks.length}`} color={TEXT} />
      </div>

      {/* Suggestions — common household tasks, one tap to add */}
      {!editorId && remainingSuggestions.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <Panel title="Suggested tasks" icon={<Icon name="sparkles" size={15} />} accent={ORANGE}
            action={
              <button onClick={() => {
                  const next = !showSug;
                  setShowSug(next);
                  localStorage.setItem("maint-show-sug", next ? "1" : "0");
                }} style={{ background: "transparent", border: "none", color: TEXT_DIM, cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: FONT }}>
                {showSug ? "Hide" : "Show"}
              </button>
            }>
            {showSug && (
              <>
                <div style={{ fontSize: 12, color: TEXT_DIM, marginBottom: 10 }}>
                  Tap to add. You can log the last-done date afterward to start the reminder clock.
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {remainingSuggestions.map(s => (
                    <button key={s.task} onClick={() => addSuggestion(s)}
                      style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "var(--surface)", border: `1px solid ${ORANGE}33`, borderRadius: 20, padding: "7px 13px", cursor: "pointer", fontFamily: FONT, transition: "all 0.12s" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = `${ORANGE}1a`; (e.currentTarget as HTMLButtonElement).style.borderColor = `${ORANGE}66`; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--surface)"; (e.currentTarget as HTMLButtonElement).style.borderColor = `${ORANGE}33`; }}>
                      <Icon name="plus" size={13} color={ORANGE} />
                      <span style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>{s.task}</span>
                      <span style={{ fontSize: 11, color: TEXT_MUTED }}>{intervalLabel(s.days)}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </Panel>
        </div>
      )}

      {/* Editor */}
      {editorId && (
        <div style={{ marginBottom: 20 }}>
          <Panel title={editorId === "new" ? "New maintenance task" : "Edit task"} icon={<Icon name="wrench" size={15} />} accent={ORANGE}>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
              <Field label="Task">
                <input autoFocus value={draft.task} onChange={e => setDraft({ ...draft, task: e.target.value })} placeholder="Replace HVAC filter" style={inputStyle} />
              </Field>
              <Field label="Category">
                <select value={draft.category}
                  onChange={e => {
                    const category = e.target.value;
                    setDraft(d => ({ ...d, category, intervalDays: CATEGORY_INTERVALS[category] ?? d.intervalDays }));
                  }}
                  style={{ ...inputStyle, colorScheme: "dark" }}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Last done">
                <input type="date" value={draft.lastDone ?? ""} onChange={e => setDraft({ ...draft, lastDone: e.target.value })} style={{ ...inputStyle, colorScheme: "dark" }} />
              </Field>
              <Field label="Repeat every (days)">
                <input type="number" min={1} value={draft.intervalDays || ""} onChange={e => setDraft({ ...draft, intervalDays: parseInt(e.target.value) || 0 })} style={inputStyle} />
              </Field>
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
              {INTERVAL_PRESETS.map(p => (
                <button key={p.days} onClick={() => setDraft({ ...draft, intervalDays: p.days })}
                  style={{ ...btn(draft.intervalDays === p.days ? ORANGE : "transparent", draft.intervalDays === p.days ? BG : TEXT_DIM, BORDER), fontSize: 11, padding: "5px 11px" }}>
                  {p.label}
                </button>
              ))}
            </div>
            <div style={{ marginTop: 12 }}>
              <Field label="Notes (optional)">
                <input value={draft.notes ?? ""} onChange={e => setDraft({ ...draft, notes: e.target.value })} placeholder="20×25×1 filter, two of them" style={inputStyle} />
              </Field>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
              <button onClick={saveDraft} style={btn(ORANGE)}>Save</button>
              <button onClick={closeEditor} style={btn("transparent", TEXT_DIM, BORDER)}>Cancel</button>
              {editorId !== "new" && (
                <button onClick={() => remove(editorId)} style={{ ...btn("transparent", DANGER, "transparent"), marginLeft: "auto" }}>
                  <Icon name="trash" size={14} color={DANGER} /> Delete
                </button>
              )}
            </div>
          </Panel>
        </div>
      )}

      {/* List */}
      {tasks.length === 0 && !editorId ? (
        <EmptyHint>Nothing tracked yet. Add recurring home tasks — filters, gutters, smoke detectors — and never lose track again.</EmptyHint>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {sorted.map(t => {
            const status = statusOf(t);
            const due = nextDue(t);
            const meta = STATUS_META[status];
            return (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, background: SURFACE, border: `1px solid ${meta.border}` }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>{t.task}</span>
                    <Pill color={meta.color}>{meta.dueLabel(due)}</Pill>
                  </div>
                  <div style={{ fontSize: 12, color: TEXT_DIM, marginTop: 3 }}>
                    {t.category} · {intervalLabel(t.intervalDays)}
                    {t.lastDone && <span style={{ color: TEXT_MUTED }}> · last {prettyDate(t.lastDone)}</span>}
                  </div>
                  {t.notes && <div style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 3, fontStyle: "italic" }}>{t.notes}</div>}
                </div>
                <button onClick={() => markDone(t)} title="Mark done today" style={btn(JADE)}>
                  <Icon name="check" size={14} color={BG} /> Done
                </button>
                <button onClick={() => openEdit(t)} title="Edit" style={{ flexShrink: 0, background: "transparent", border: `1px solid ${BORDER}`, borderRadius: 7, color: TEXT_DIM, padding: "5px 7px", cursor: "pointer", display: "flex" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = TEXT; (e.currentTarget as HTMLButtonElement).style.borderColor = BORDER_HI; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = TEXT_DIM; (e.currentTarget as HTMLButtonElement).style.borderColor = BORDER; }}>
                  <Icon name="pencil" size={13} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}

const STATUS_META: Record<Status, { color: string; border: string; dueLabel: (due: string | null) => string }> = {
  overdue:  { color: DANGER, border: DANGER + "44", dueLabel: due => due ? `${-daysUntil(due)} days overdue` : "Overdue" },
  upcoming: { color: AMBER,  border: AMBER + "33",  dueLabel: due => due ? `due in ${daysUntil(due)} days` : "Due soon" },
  ok:       { color: JADE,   border: BORDER,        dueLabel: due => due ? `due ${prettyDate(due)}` : "On track" },
  new:      { color: TEXT_DIM, border: BORDER,      dueLabel: () => "log first date" },
};

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "14px 16px" }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: TEXT_DIM }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color, marginTop: 4, fontFamily: FONT }}>{value}</div>
    </div>
  );
}
