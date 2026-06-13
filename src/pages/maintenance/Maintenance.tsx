import { useState, useEffect, useMemo } from "react";
import {
  collection, onSnapshot, doc, setDoc, deleteDoc, query, orderBy,
} from "firebase/firestore";
import { db } from "../../firebase";
import { useHouseholdUid } from "../../household";
import { useOverlay } from "../../overlay";
import { Icon } from "../../components/Icon";
import StarField from "../../components/StarField";
import {
  PageShell, Panel, Field, Pill, EmptyHint,
  btn, inputStyle, uid, toISODate, fromISODate, daysUntil, prettyDate, todayISO,
  BG, SURFACE, BORDER, TEXT, TEXT_DIM, TEXT_MUTED,
  AMBER, ORANGE, JADE, DANGER, FONT,
} from "../shared/kit";

// ── Types ─────────────────────────────────────────────────────────────────
interface MaintTask {
  id: string;
  task: string;
  lastDone?: string | null;  // YYYY-MM-DD; null = never logged
  intervalDays: number;
  category: string;
  remindDays?: number;       // how many days ahead the calendar surfaces it (default 7)
  notes?: string;
}

const UPCOMING_WINDOW = 30; // days
const DEFAULT_REMIND = 7;

// Category → suggested interval (days). Picking a category prefills a sensible cadence.
const CATEGORY_INTERVALS: Record<string, number> = {
  HVAC: 90, Plumbing: 180, Exterior: 180, Appliances: 365,
  Cleaning: 7, Safety: 180, Yard: 30, Vehicle: 90, Other: 90,
};
const CATEGORIES = Object.keys(CATEGORY_INTERVALS);

// Quick-pick interval presets for the editor.
const INTERVAL_PRESETS: { label: string; days: number }[] = [
  { label: "Weekly", days: 7 }, { label: "Monthly", days: 30 }, { label: "Quarterly", days: 90 },
  { label: "Twice a year", days: 180 }, { label: "Yearly", days: 365 },
];

// How far ahead the calendar should remind for a task.
const REMIND_OPTIONS: { label: string; days: number }[] = [
  { label: "Day of", days: 0 },
  { label: "1 day before", days: 1 },
  { label: "2 days before", days: 2 },
  { label: "3 days before", days: 3 },
  { label: "1 week before", days: 7 },
  { label: "2 weeks before", days: 14 },
];
const remindLabel = (days: number) => REMIND_OPTIONS.find(o => o.days === days)?.label ?? `${days} days before`;

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

const EMPTY: Omit<MaintTask, "id"> = { task: "", lastDone: "", intervalDays: 90, category: "Other", remindDays: DEFAULT_REMIND, notes: "" };
const taskToDraft = (t: MaintTask): Omit<MaintTask, "id"> => ({
  task: t.task, lastDone: t.lastDone ?? "", intervalDays: t.intervalDays, category: t.category,
  remindDays: t.remindDays ?? DEFAULT_REMIND, notes: t.notes ?? "",
});

// ── Page ─────────────────────────────────────────────────────────────────
export default function Maintenance() {
  const uidAuth = useHouseholdUid();
  const [tasks, setTasks] = useState<MaintTask[]>([]);
  // null = list; "new" = create overlay; otherwise the id of the task being viewed.
  const [detailId, setDetailId] = useState<string | "new" | null>(null);
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

  async function persistTask(id: string, d: Omit<MaintTask, "id">) {
    const payload: MaintTask = {
      id,
      task: d.task.trim(),
      lastDone: d.lastDone?.trim() || null,
      intervalDays: Math.max(1, Math.round(Number(d.intervalDays) || 1)),
      category: d.category || "Other",
      remindDays: Math.max(0, Math.round(Number(d.remindDays ?? DEFAULT_REMIND))),
      notes: d.notes?.trim() || "",
    };
    await setDoc(doc(db, "users", uidAuth, "maintenance", id), payload);
  }
  async function remove(id: string) {
    await deleteDoc(doc(db, "users", uidAuth, "maintenance", id));
    setDetailId(null);
  }
  /** Mark done today — advances the next-due clock. */
  async function markDone(t: MaintTask) {
    await persistTask(t.id, { ...taskToDraft(t), lastDone: todayISO() });
  }

  /** One-tap add from the suggestion list (no last-done yet — user logs the first date). */
  async function addSuggestion(s: { task: string; category: string; days: number }) {
    const id = uid();
    await setDoc(doc(db, "users", uidAuth, "maintenance", id), {
      id, task: s.task, lastDone: null, intervalDays: s.days, category: s.category, remindDays: DEFAULT_REMIND, notes: "",
    } as MaintTask);
  }

  const remainingSuggestions = SUGGESTIONS.filter(
    s => !tasks.some(t => t.task.trim().toLowerCase() === s.task.toLowerCase()),
  );

  const detailTask = detailId && detailId !== "new" ? tasks.find(t => t.id === detailId) ?? null : null;

  return (
    <PageShell tool="maintenance" maxWidth={760}
      headerExtra={<button onClick={() => setDetailId("new")} style={btn(ORANGE)}><Icon name="plus" size={15} color={BG} /> Add</button>}>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
        <Stat label="Overdue" value={`${overdueCount}`} color={overdueCount ? DANGER : JADE} />
        <Stat label="Due soon" value={`${soonCount}`} color={soonCount ? AMBER : JADE} />
        <Stat label="Tracked" value={`${tasks.length}`} color={TEXT} />
      </div>

      {/* Suggestions — common household tasks, one tap to add */}
      {remainingSuggestions.length > 0 && (
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

      {/* List */}
      {tasks.length === 0 ? (
        <EmptyHint>Nothing tracked yet. Add recurring home tasks — filters, gutters, smoke detectors — and never lose track again.</EmptyHint>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {sorted.map(t => {
            const status = statusOf(t);
            const due = nextDue(t);
            const meta = STATUS_META[status];
            return (
              <div key={t.id} onClick={() => setDetailId(t.id)}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, background: SURFACE, border: `1px solid ${meta.border}`, cursor: "pointer", transition: "background 0.12s" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-hi)")}
                onMouseLeave={e => (e.currentTarget.style.background = SURFACE)}>
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
                <button onClick={e => { e.stopPropagation(); markDone(t); }} title="Mark done today" style={btn(JADE)}>
                  <Icon name="check" size={14} color={BG} /> Done
                </button>
                <Icon name="chevronDown" size={14} color={TEXT_MUTED} style={{ transform: "rotate(-90deg)", opacity: 0.5, flexShrink: 0 }} />
              </div>
            );
          })}
        </div>
      )}

      {/* Detail / editor overlay */}
      {detailId && (
        <MaintDetail
          task={detailTask}
          isNew={detailId === "new"}
          onClose={() => setDetailId(null)}
          onSave={(d) => persistTask(detailId === "new" ? uid() : (detailId as string), d)}
          onDelete={() => detailTask && remove(detailTask.id)}
          onMarkDone={() => detailTask && markDone(detailTask)}
        />
      )}
    </PageShell>
  );
}

// ── Detail overlay (view + inline edit), mirrors the recipe screen ───────────
function MaintDetail({ task, isNew, onClose, onSave, onDelete, onMarkDone }: {
  task: MaintTask | null;
  isNew: boolean;
  onClose: () => void;
  onSave: (draft: Omit<MaintTask, "id">) => void | Promise<void>;
  onDelete: () => void;
  onMarkDone: () => void;
}) {
  useOverlay();
  const [editing, setEditing] = useState(isNew);
  const [draft, setDraft] = useState<Omit<MaintTask, "id">>(() => (task ? taskToDraft(task) : EMPTY));

  function startEdit() { if (task) setDraft(taskToDraft(task)); setEditing(true); }
  async function save() {
    if (!draft.task.trim()) return;
    await onSave(draft);
    if (isNew) onClose(); else setEditing(false);
  }

  const iconBtn = (onClick: () => void, icon: "x" | "pencil", hover: string) => (
    <button onClick={onClick}
      style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 8, cursor: "pointer", color: TEXT_DIM, padding: "6px 10px", display: "flex", alignItems: "center", lineHeight: 1, flexShrink: 0 }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = hover; (e.currentTarget as HTMLButtonElement).style.borderColor = hover + "60"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = TEXT_DIM; (e.currentTarget as HTMLButtonElement).style.borderColor = BORDER; }}>
      <Icon name={icon} size={16} color="currentColor" />
    </button>
  );

  const due = task ? nextDue(task) : null;
  const status = task ? statusOf(task) : "new";
  const meta = STATUS_META[status];

  return (
    <div style={{ position: "fixed", inset: 0, background: BG, zIndex: 50, overflowY: "auto", fontFamily: FONT, color: TEXT }}>
      <StarField />
      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Header */}
        <div style={{ position: "sticky", top: 0, zIndex: 10, background: "rgba(6,9,26,0.92)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", padding: "0 20px", minHeight: 60, gap: 12, boxSizing: "border-box" }}>
          {iconBtn(editing && !isNew ? () => setEditing(false) : onClose, "x", TEXT)}
          <div style={{ flex: 1, textAlign: "center", fontWeight: 800, fontSize: 16, color: TEXT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {isNew ? "New task" : editing ? "Edit task" : (task?.task ?? "Task")}
          </div>
          {editing
            ? <button onClick={save} disabled={!draft.task.trim()} style={{ ...btn(ORANGE), opacity: draft.task.trim() ? 1 : 0.5 }}>Save</button>
            : iconBtn(startEdit, "pencil", ORANGE)}
        </div>

        {editing ? (
          /* ── Editor ── */
          <div style={{ padding: "28px 24px 80px", maxWidth: 640, margin: "0 auto" }}>
            <Field label="Task">
              <input autoFocus value={draft.task} onChange={e => setDraft({ ...draft, task: e.target.value })} placeholder="Replace HVAC filter" style={inputStyle} />
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
              <Field label="Category">
                <select value={draft.category}
                  onChange={e => { const category = e.target.value; setDraft(d => ({ ...d, category, intervalDays: CATEGORY_INTERVALS[category] ?? d.intervalDays })); }}
                  style={{ ...inputStyle, colorScheme: "dark" }}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Last done">
                <input type="date" value={draft.lastDone ?? ""} onChange={e => setDraft({ ...draft, lastDone: e.target.value })} style={{ ...inputStyle, colorScheme: "dark" }} />
              </Field>
            </div>
            <div style={{ marginTop: 12 }}>
              <Field label="Repeat every (days)">
                <input type="number" min={1} value={draft.intervalDays || ""} onChange={e => setDraft({ ...draft, intervalDays: parseInt(e.target.value) || 0 })} style={inputStyle} />
              </Field>
              <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                {INTERVAL_PRESETS.map(p => (
                  <button key={p.days} onClick={() => setDraft({ ...draft, intervalDays: p.days })}
                    style={{ ...btn(draft.intervalDays === p.days ? ORANGE : "transparent", draft.intervalDays === p.days ? BG : TEXT_DIM, BORDER), fontSize: 11, padding: "5px 11px" }}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <Field label="Remind me (on the calendar)">
                <select value={draft.remindDays ?? DEFAULT_REMIND} onChange={e => setDraft({ ...draft, remindDays: parseInt(e.target.value) })}
                  style={{ ...inputStyle, colorScheme: "dark" }}>
                  {REMIND_OPTIONS.map(o => <option key={o.days} value={o.days}>{o.label}</option>)}
                </select>
              </Field>
            </div>
            <div style={{ marginTop: 12 }}>
              <Field label="Notes (optional)">
                <input value={draft.notes ?? ""} onChange={e => setDraft({ ...draft, notes: e.target.value })} placeholder="20×25×1 filter, two of them" style={inputStyle} />
              </Field>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 20, flexWrap: "wrap" }}>
              <button onClick={save} disabled={!draft.task.trim()} style={{ ...btn(ORANGE), opacity: draft.task.trim() ? 1 : 0.5 }}>Save</button>
              <button onClick={() => (isNew ? onClose() : setEditing(false))} style={btn("transparent", TEXT_DIM, BORDER)}>Cancel</button>
              {!isNew && (
                <button onClick={onDelete} style={{ ...btn("transparent", DANGER, "transparent"), marginLeft: "auto" }}>
                  <Icon name="trash" size={14} color={DANGER} /> Delete
                </button>
              )}
            </div>
          </div>
        ) : task ? (
          /* ── View ── */
          <div style={{ padding: "32px 24px 80px", maxWidth: 640, margin: "0 auto" }}>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: TEXT, margin: "0 0 12px", lineHeight: 1.2 }}>{task.task}</h1>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 20 }}>
              <Pill color={meta.color}>{meta.dueLabel(due)}</Pill>
              <span style={{ fontSize: 13, color: TEXT_DIM, fontWeight: 600 }}>{task.category}</span>
              <span style={{ fontSize: 13, color: TEXT_DIM }}>{intervalLabel(task.intervalDays)}</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
              <DetailRow label="Last done" value={task.lastDone ? prettyDate(task.lastDone) : "Not logged yet"} />
              <DetailRow label="Next due" value={due ? prettyDate(due) : "Log a last-done date to start"} />
              <DetailRow label="Reminds" value={`${remindLabel(task.remindDays ?? DEFAULT_REMIND)} on the calendar`} />
            </div>

            {task.notes && (
              <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "14px 16px", fontSize: 14, color: TEXT_DIM, marginBottom: 24, fontStyle: "italic" }}>
                {task.notes}
              </div>
            )}

            <button onClick={onMarkDone} style={{ ...btn(JADE), padding: "11px 20px" }}>
              <Icon name="check" size={15} color={BG} /> Mark done today
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "11px 14px", background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10 }}>
      <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: TEXT_MUTED }}>{label}</span>
      <span style={{ fontSize: 14, color: TEXT, fontWeight: 600 }}>{value}</span>
    </div>
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
