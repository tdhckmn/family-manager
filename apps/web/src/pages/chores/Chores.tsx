import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  collection, onSnapshot, doc, setDoc, deleteDoc, query, orderBy,
} from "firebase/firestore";
import { db } from "../../firebase";
import { useHouseholdUid } from "../../household";
import { useOverlay } from "../../overlay";
import { Icon, type IconName } from "../../components/Icon";
import { usePeople, personColor } from "../../usePeople";
import {
  PageShell, Panel, Field, Pill, EmptyHint, useIsMobile,
  btn, inputStyle, uid, toISODate, weekKey, DAY_NAMES, DAY_ABBR, MONTH_NAMES,
  BG, SURFACE, SURFACE_HI, BORDER, BORDER_HI, TEXT, TEXT_DIM, TEXT_MUTED,
  PINK, BLUE, JADE, AMBER, LAV, TEAL, DANGER, FONT,
} from "../shared/kit";

// ── Types ─────────────────────────────────────────────────────────────────
interface Chore {
  id: string;
  name: string;
  assignedTo: string;     // household person name; "" = anyone
  daysOfWeek: number[];   // 0=Sun … 6=Sat
  category?: string;
  notes?: string;
}

const EMPTY: Omit<Chore, "id"> = { name: "", assignedTo: "", daysOfWeek: [], category: "", notes: "" };
const choreToDraft = (c: Chore): Omit<Chore, "id"> => ({
  name: c.name, assignedTo: c.assignedTo, daysOfWeek: [...c.daysOfWeek], category: c.category ?? "", notes: c.notes ?? "",
});

function formatDays(daysOfWeek: number[]): string {
  const s = [...daysOfWeek].sort((a, b) => a - b);
  if (s.length === 7) return "Every day";
  if (s.join() === "1,2,3,4,5") return "Weekdays";
  if (s.join() === "0,6") return "Weekends";
  return s.map(d => ["Su","Mo","Tu","We","Th","Fr","Sa"][d]).join(" · ");
}

/** Per-week log. `done` and `added` keyed by `${choreId}:${dayIdx}`. */
interface WeekLog {
  done: Record<string, boolean>;
  added: Record<string, boolean>; // manually scheduled this week (not in daysOfWeek)
}

// ── Page ─────────────────────────────────────────────────────────────────
export default function Chores() {
  const uidAuth = useHouseholdUid();
  const isMobile = useIsMobile();
  const people = usePeople();
  const [searchParams] = useSearchParams();
  const [chores, setChores] = useState<Chore[]>([]);
  const [log, setLog] = useState<WeekLog>({ done: {}, added: {} });
  const [editorId, setEditorId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Omit<Chore, "id">>(EMPTY);
  const [choreDetailId, setChoreDetailId] = useState<string | null>(() => searchParams.get("id"));

  // Sunday of the currently-viewed week.
  const [weekStart, setWeekStart] = useState(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), t.getDate() - t.getDay());
  });
  const wk = weekKey(weekStart);
  const todayIdx = useMemo(() => {
    const t = new Date();
    const sameWeek = weekKey(t) === wk;
    return sameWeek ? t.getDay() : -1;
  }, [wk]);

  useEffect(() => {
    const q = query(collection(db, "users", uidAuth, "chores"), orderBy("name"));
    return onSnapshot(q, snap => {
      setChores(snap.docs.map(d => ({ id: d.id, ...d.data() } as Chore)));
    }, err => console.error("Chores load failed:", err));
  }, [uidAuth]);

  useEffect(() => {
    const ref = doc(db, "users", uidAuth, "choreLog", wk);
    return onSnapshot(ref, snap => {
      const d = snap.data() ?? {};
      setLog({ done: (d.done as Record<string, boolean>) ?? {}, added: (d.added as Record<string, boolean>) ?? {} });
    }, err => console.error("Chore log load failed:", err));
  }, [uidAuth, wk]);

  const choresByDay = useMemo(() => {
    const map: Chore[][] = [[], [], [], [], [], [], []];
    for (const c of chores) {
      for (const d of c.daysOfWeek) if (d >= 0 && d <= 6) map[d].push(c);
      for (let d = 0; d <= 6; d++) {
        if (log.added[`${c.id}:${d}`] && !c.daysOfWeek.includes(d)) map[d].push(c);
      }
    }
    return map;
  }, [chores, log.added]);

  // Week progress.
  const { total, done } = useMemo(() => {
    let total = 0, done = 0;
    choresByDay.forEach((list, dayIdx) => {
      for (const c of list) { total++; if (log.done[`${c.id}:${dayIdx}`]) done++; }
    });
    return { total, done };
  }, [choresByDay, log]);

  const assignees = useMemo(() =>
    Array.from(new Set(chores.map(c => c.assignedTo).filter(Boolean))).sort(),
    [chores]);

  function toggle(choreId: string, dayIdx: number) {
    const key = `${choreId}:${dayIdx}`;
    const next = { ...log.done };
    if (next[key]) delete next[key]; else next[key] = true;
    setLog({ done: next, added: log.added });
    setDoc(doc(db, "users", uidAuth, "choreLog", wk), { done: next, added: log.added }).catch(console.error);
  }

  function addToDay(choreId: string, dayIdx: number) {
    const key = `${choreId}:${dayIdx}`;
    const nextAdded = { ...log.added, [key]: true };
    setLog(l => ({ ...l, added: nextAdded }));
    setDoc(doc(db, "users", uidAuth, "choreLog", wk), { done: log.done, added: nextAdded }).catch(console.error);
  }

  function removeFromDay(choreId: string, dayIdx: number) {
    const key = `${choreId}:${dayIdx}`;
    const nextAdded = { ...log.added };
    delete nextAdded[key];
    const nextDone = { ...log.done };
    delete nextDone[key];
    setLog({ done: nextDone, added: nextAdded });
    setDoc(doc(db, "users", uidAuth, "choreLog", wk), { done: nextDone, added: nextAdded }).catch(console.error);
  }

  function shiftWeek(delta: number) {
    setWeekStart(d => new Date(d.getFullYear(), d.getMonth(), d.getDate() + delta * 7));
  }
  function thisWeek() {
    const t = new Date();
    setWeekStart(new Date(t.getFullYear(), t.getMonth(), t.getDate() - t.getDay()));
  }
  const isThisWeek = wk === weekKey(new Date());

  function openNew() { setDraft(EMPTY); setEditorId("new"); }
  function closeEditor() { setEditorId(null); }

  async function persistChore(id: string, d: Omit<Chore, "id">) {
    const payload: Chore = {
      id,
      name: d.name.trim(),
      assignedTo: d.assignedTo.trim(),
      daysOfWeek: [...d.daysOfWeek].sort((a, b) => a - b),
      category: d.category?.trim() || "",
      notes: d.notes?.trim() || "",
    };
    await setDoc(doc(db, "users", uidAuth, "chores", id), payload);
  }
  async function saveDraft() {
    if (!draft.name.trim()) return;
    const id = editorId && editorId !== "new" ? editorId : uid();
    await persistChore(id, draft);
    closeEditor();
  }
  async function remove(id: string) {
    await deleteDoc(doc(db, "users", uidAuth, "chores", id));
    closeEditor();
  }

  const weekLabel = `${MONTH_NAMES[weekStart.getMonth()].slice(0, 3)} ${weekStart.getDate()}`;

  return (
    <PageShell tool="chores" maxWidth={1100}
      headerExtra={<button onClick={openNew} style={btn(PINK)}><Icon name="plus" size={15} color={BG} /> Add chore</button>}>

      {/* Week nav + progress */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => shiftWeek(-1)} style={navBtn}>‹</button>
          <span style={{ fontSize: 14, fontWeight: 800, color: TEXT, minWidth: 110, textAlign: "center" }}>Week of {weekLabel}</span>
          <button onClick={() => shiftWeek(1)} style={navBtn}>›</button>
          {!isThisWeek && <button onClick={thisWeek} style={{ ...btn("transparent", JADE, JADE + "55"), fontSize: 11, padding: "5px 12px" }}>This week</button>}
        </div>
        {total > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 120, height: 6, background: "var(--surface-hi)", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${(done / total) * 100}%`, background: done === total ? JADE : PINK, borderRadius: 3, transition: "width 0.3s" }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: done === total ? JADE : TEXT_DIM }}>{done}/{total} done</span>
          </div>
        )}
      </div>

      {/* Editor */}
      {editorId && (
        <div style={{ marginBottom: 20 }}>
          <Panel title={editorId === "new" ? "New chore" : "Edit chore"} icon={<Icon name="sparkles" size={15} />} accent={PINK}>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
              <Field label="Chore">
                <input autoFocus value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="Take out trash" style={inputStyle} />
              </Field>
              <Field label="Assigned to (optional)">
                <select value={draft.assignedTo} onChange={e => setDraft({ ...draft, assignedTo: e.target.value })} style={inputStyle}>
                  <option value="">Anyone</option>
                  {people.length > 0
                    ? people.map(p => <option key={p.id} value={p.name}>{p.name}</option>)
                    : assignees.filter(a => a !== draft.assignedTo).concat(draft.assignedTo ? [draft.assignedTo] : []).map(a => <option key={a} value={a}>{a}</option>)
                  }
                </select>
              </Field>
            </div>
            <div style={{ marginTop: 12 }}>
              <Field label="Repeats on (optional)">
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {DAY_ABBR.map((d, i) => {
                    const on = draft.daysOfWeek.includes(i);
                    return (
                      <button key={i} onClick={() => setDraft(dr => ({ ...dr, daysOfWeek: on ? dr.daysOfWeek.filter(x => x !== i) : [...dr.daysOfWeek, i] }))}
                        style={{ width: 44, padding: "8px 0", borderRadius: 8, cursor: "pointer", fontFamily: FONT, fontSize: 12, fontWeight: 700,
                          background: on ? PINK : "transparent", color: on ? BG : TEXT_DIM, border: `1px solid ${on ? PINK : BORDER}`, transition: "all 0.12s" }}>
                        {d}
                      </button>
                    );
                  })}
                </div>
              </Field>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
              <button onClick={saveDraft} style={btn(PINK)}>Save</button>
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

      {chores.length === 0 && !editorId ? (
        <EmptyHint>No chores yet. Add a chore and assign it to people — then schedule it on any day directly from the weekly board.</EmptyHint>
      ) : (
        <>
          {/* Assignee legend */}
          {assignees.length > 0 && (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
              {assignees.map(a => (
                <span key={a} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: TEXT_DIM }}>
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: personColor(people.find(p => p.name === a), a) }} /> {a}
                </span>
              ))}
            </div>
          )}

          {/* Week board */}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(7, 1fr)", gap: 10 }}>
            {DAY_NAMES.map((dayName, dayIdx) => {
              const list = choresByDay[dayIdx];
              const isToday = dayIdx === todayIdx;
              const date = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + dayIdx);
              const available = chores.filter(c => !list.some(x => x.id === c.id));
              return (
                <div key={dayIdx} style={{ background: isToday ? "rgba(93,184,138,0.06)" : SURFACE, border: `1px solid ${isToday ? JADE + "44" : BORDER}`, borderRadius: 12, overflow: "hidden", minHeight: isMobile ? 0 : 80 }}>
                  <div style={{ padding: "8px 10px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", color: isToday ? JADE : TEXT_DIM }}>
                      {isMobile ? dayName : DAY_ABBR[dayIdx]}
                    </span>
                    <span style={{ fontSize: 11, color: TEXT_MUTED }}>{date.getDate()}</span>
                  </div>
                  <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                    {list.map(c => {
                      const checked = !!log.done[`${c.id}:${dayIdx}`];
                      const isAdded = !c.daysOfWeek.includes(dayIdx);
                      const color = personColor(people.find(p => p.name === c.assignedTo), c.assignedTo);
                      return (
                        <div key={c.id} style={{ display: "flex", alignItems: "flex-start", gap: 4 }}>
                          <button onClick={() => toggle(c.id, dayIdx)}
                            style={{ flex: 1, display: "flex", alignItems: "flex-start", gap: 8, textAlign: "left", padding: "8px 9px", borderRadius: 9, cursor: "pointer", fontFamily: FONT,
                              background: checked ? "rgba(93,184,138,0.10)" : "var(--surface)", border: `1px solid ${checked ? JADE + "40" : BORDER}`, transition: "all 0.12s" }}
                            onMouseEnter={e => { if (!checked) (e.currentTarget as HTMLButtonElement).style.background = SURFACE_HI; }}
                            onMouseLeave={e => { if (!checked) (e.currentTarget as HTMLButtonElement).style.background = "var(--surface)"; }}>
                            <span style={{ flexShrink: 0, width: 16, height: 16, marginTop: 1, borderRadius: 4, border: `1.5px solid ${checked ? JADE : "var(--border-hi)"}`, background: checked ? JADE : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              {checked && <Icon name="checkMark" size={10} />}
                            </span>
                            <span style={{ flex: 1, minWidth: 0 }}>
                              <span style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: checked ? TEXT_MUTED : TEXT, textDecoration: checked ? "line-through" : "none", lineHeight: 1.35 }}>{c.name}</span>
                              {c.assignedTo && <span style={{ display: "block", fontSize: 10, fontWeight: 700, color, marginTop: 2 }}>{c.assignedTo}</span>}
                            </span>
                          </button>
                          {isAdded && (
                            <button onClick={() => removeFromDay(c.id, dayIdx)} title="Remove from today"
                              style={{ flexShrink: 0, padding: "4px 6px", marginTop: 4, background: "none", border: "none", cursor: "pointer", color: TEXT_MUTED, fontSize: 14, lineHeight: 1, borderRadius: 4 }}
                              onMouseEnter={e => (e.currentTarget.style.color = DANGER)}
                              onMouseLeave={e => (e.currentTarget.style.color = TEXT_MUTED)}>×</button>
                          )}
                        </div>
                      );
                    })}
                    {available.length > 0 && (
                      <select defaultValue="" onChange={e => { if (e.target.value) { addToDay(e.target.value, dayIdx); e.target.value = ""; } }}
                        style={{ fontSize: 11, background: "transparent", border: `1px dashed ${BORDER}`, borderRadius: 7, color: TEXT_MUTED, padding: "5px 6px", cursor: "pointer", width: "100%", fontFamily: FONT }}>
                        <option value="" disabled>＋ add chore</option>
                        {available.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Manage list */}
          <div style={{ marginTop: 24 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: TEXT_MUTED, marginBottom: 10 }}>All chores</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {chores.map(c => (
                <div key={c.id} onClick={() => setChoreDetailId(c.id)}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 13px", borderRadius: 10, background: SURFACE, border: `1px solid ${BORDER}`, cursor: "pointer", transition: "background 0.12s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = SURFACE_HI)}
                  onMouseLeave={e => (e.currentTarget.style.background = SURFACE)}>
                  {(() => {
                    const doneToday = todayIdx >= 0 && !!log.done[`${c.id}:${todayIdx}`];
                    return (
                      <span style={{
                        width: 9, height: 9, borderRadius: "50%", flexShrink: 0,
                        background: doneToday ? JADE : personColor(people.find(p => p.name === c.assignedTo), c.assignedTo),
                        boxShadow: doneToday ? `0 0 6px ${JADE}` : undefined,
                      }} />
                    );
                  })()}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>{c.name}</span>
                    {c.assignedTo && <span style={{ fontSize: 12, color: TEXT_DIM }}> · {c.assignedTo}</span>}
                  </div>
                  {c.daysOfWeek.length > 0 && <span style={{ fontSize: 11, fontWeight: 600, color: TEXT_MUTED, flexShrink: 0 }}>{formatDays(c.daysOfWeek)}</span>}
                  <Icon name="chevronDown" size={13} color={TEXT_MUTED} style={{ transform: "rotate(-90deg)", opacity: 0.5, flexShrink: 0 }} />
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Chore detail overlay */}
      {choreDetailId && (() => {
        const c = chores.find(x => x.id === choreDetailId);
        if (!c) return null;
        return (
          <ChoreDetail
            chore={c}
            log={log.done}
            weekStart={weekStart}
            todayIdx={todayIdx}
            assignees={assignees}
            people={people}
            onClose={() => setChoreDetailId(null)}
            onSave={(d) => persistChore(c.id, d)}
            onDelete={async () => { await remove(c.id); setChoreDetailId(null); }}
            onToggle={(dayIdx) => toggle(c.id, dayIdx)}
          />
        );
      })()}
    </PageShell>
  );
}

const navBtn: React.CSSProperties = {
  background: "transparent", border: `1px solid ${BORDER}`, borderRadius: 8, color: TEXT_DIM,
  fontSize: 16, width: 30, height: 30, cursor: "pointer", display: "flex", alignItems: "center",
  justifyContent: "center", fontFamily: FONT,
};

// ── Chore detail overlay ─────────────────────────────────────────────────────
function ChoreDetail({ chore, log, weekStart, todayIdx, assignees, people, onClose, onSave, onDelete, onToggle }: {
  chore: Chore;
  log: Record<string, boolean>;
  weekStart: Date;
  todayIdx: number;
  assignees: string[];
  people: ReturnType<typeof usePeople>;
  onClose: () => void;
  onSave: (draft: Omit<Chore, "id">) => void | Promise<void>;
  onDelete: () => void;
  onToggle: (dayIdx: number) => void;
}) {
  useOverlay();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [draft, setDraft] = useState<Omit<Chore, "id">>(() => choreToDraft(chore));

  const sortedDays = [...chore.daysOfWeek].sort((a, b) => a - b);
  const doneCount = sortedDays.filter(d => log[`${chore.id}:${d}`]).length;
  const color = personColor(people.find(p => p.name === chore.assignedTo), chore.assignedTo);
  const isDoneToday = todayIdx >= 0 && !!log[`${chore.id}:${todayIdx}`];
  const canSave = draft.name.trim().length > 0;

  function startEdit() { setDraft(choreToDraft(chore)); setEditing(true); }
  function cancelEdit() { setEditing(false); setConfirmDelete(false); }
  async function save() {
    if (!canSave) return;
    await onSave(draft);
    setEditing(false);
  }

  const iconBtn = (onClick: () => void, icon: IconName, hover: string) => (
    <button onClick={onClick}
      style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 8, cursor: "pointer", color: TEXT_DIM, padding: "6px 10px", display: "flex", alignItems: "center", lineHeight: 1, flexShrink: 0 }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = hover; (e.currentTarget as HTMLButtonElement).style.borderColor = hover + "60"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = TEXT_DIM; (e.currentTarget as HTMLButtonElement).style.borderColor = BORDER; }}>
      <Icon name={icon} size={16} color="currentColor" />
    </button>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: BG, zIndex: 1100, overflowY: "auto", fontFamily: FONT, color: TEXT }}>
      {/* Header */}
      <div style={{ position: "sticky", top: 0, zIndex: 1110, background: "rgba(6,9,26,0.92)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", padding: "0 20px", minHeight: 60, gap: 12, boxSizing: "border-box" }}>
        {iconBtn(editing ? cancelEdit : onClose, "x", TEXT)}
        <div style={{ flex: 1, textAlign: "center", fontWeight: 800, fontSize: 16, color: confirmDelete ? DANGER : TEXT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {confirmDelete ? "Delete chore?" : "Chore"}
        </div>
        {editing ? (
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={cancelEdit} style={{ ...btn("transparent", TEXT_DIM, BORDER), fontSize: 12, padding: "6px 14px" }}>Cancel</button>
            <button onClick={save} disabled={!canSave} style={{ ...btn(PINK), opacity: canSave ? 1 : 0.5 }}>Save</button>
          </div>
        ) : confirmDelete ? (
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={onDelete} style={{ ...btn(DANGER), fontSize: 12, padding: "6px 14px" }}>Delete</button>
            <button onClick={() => setConfirmDelete(false)} style={{ ...btn("transparent", TEXT_DIM, BORDER), fontSize: 12, padding: "6px 14px" }}>Cancel</button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 8 }}>
            {iconBtn(() => setConfirmDelete(true), "trash", DANGER)}
            {iconBtn(startEdit, "pencil", PINK)}
          </div>
        )}
      </div>

      {/* Content — same structure in both view and edit modes */}
      <div style={{ padding: "32px 24px 80px", maxWidth: 600, margin: "0 auto" }}>

        {/* Name */}
        {editing ? (
          <input autoFocus value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })}
            placeholder="Take out trash" style={{ ...inputStyle, fontSize: 22, fontWeight: 800, marginBottom: 20 }} />
        ) : (
          <h1 style={{ fontSize: 28, fontWeight: 800, color: TEXT, margin: "0 0 20px", lineHeight: 1.2 }}>{chore.name}</h1>
        )}

        {/* Assigned to */}
        {editing ? (
          <div style={{ marginBottom: 16 }}>
            <Field label="Assigned to (optional)">
              <select value={draft.assignedTo} onChange={e => setDraft({ ...draft, assignedTo: e.target.value })} style={inputStyle}>
                <option value="">Anyone</option>
                {people.length > 0
                  ? people.map(p => <option key={p.id} value={p.name}>{p.name}</option>)
                  : assignees.filter(a => a !== draft.assignedTo).concat(draft.assignedTo ? [draft.assignedTo] : []).map(a => <option key={a} value={a}>{a}</option>)
                }
              </select>
            </Field>
          </div>
        ) : chore.assignedTo ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: color, flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 700, color }}>{chore.assignedTo}</span>
          </div>
        ) : null}

        {/* Days of week — pills (toggleable when editing) */}
        <div style={{ marginBottom: 20 }}>
          {editing && <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: TEXT_MUTED, marginBottom: 8 }}>Repeats on (optional)</div>}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {DAY_ABBR.map((d, i) => {
              const active = editing ? draft.daysOfWeek.includes(i) : chore.daysOfWeek.includes(i);
              if (!editing && !active) return null;
              return (
                <button key={i}
                  onClick={editing ? () => setDraft(dr => ({ ...dr, daysOfWeek: active ? dr.daysOfWeek.filter(x => x !== i) : [...dr.daysOfWeek, i] })) : undefined}
                  style={{ width: 44, padding: "8px 0", borderRadius: 8, fontFamily: FONT, fontSize: 12, fontWeight: 700,
                    background: active ? (editing ? PINK : PINK + "22") : "transparent",
                    color: active ? (editing ? BG : PINK) : TEXT_DIM,
                    border: `1px solid ${active ? (editing ? PINK : PINK + "55") : BORDER}`,
                    cursor: editing ? "pointer" : "default",
                    transition: "all 0.12s",
                  }}>
                  {d}
                </button>
              );
            })}
          </div>
        </div>

        {/* Notes */}
        {editing ? (
          <div style={{ marginBottom: 24 }}>
            <Field label="Notes (optional)">
              <textarea value={draft.notes} onChange={e => setDraft({ ...draft, notes: e.target.value })}
                placeholder="Any details…" rows={3} style={{ ...inputStyle, resize: "vertical" }} />
            </Field>
          </div>
        ) : chore.notes ? (
          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "12px 14px", fontSize: 13, color: TEXT_DIM, marginBottom: 24, fontStyle: "italic" }}>
            {chore.notes}
          </div>
        ) : null}

        {/* Mark done today */}
        {todayIdx >= 0 && (
          <button onClick={() => onToggle(todayIdx)} style={{
            ...btn(isDoneToday ? "transparent" : JADE, isDoneToday ? JADE : BG, isDoneToday ? JADE + "55" : JADE),
            padding: "11px 20px", marginBottom: 28,
          }}>
            <Icon name={isDoneToday ? "checkMark" : "check"} size={15} color={isDoneToday ? JADE : BG} />
            {isDoneToday ? "Done today ✓" : "Mark done today"}
          </button>
        )}

        {/* This week — compact chips */}
        {sortedDays.length > 0 && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: TEXT_MUTED, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
              This week
              <span style={{ fontSize: 12, fontWeight: 800, color: doneCount === sortedDays.length ? JADE : TEXT_DIM }}>{doneCount}/{sortedDays.length}</span>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {sortedDays.map(dayIdx => {
                const date = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + dayIdx);
                const checked = !!log[`${chore.id}:${dayIdx}`];
                const isToday = dayIdx === todayIdx;
                return (
                  <button key={dayIdx} onClick={() => onToggle(dayIdx)}
                    style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 8, cursor: "pointer", fontFamily: FONT, transition: "all 0.12s",
                      background: checked ? JADE + "18" : SURFACE,
                      border: `1px solid ${checked ? JADE + "55" : isToday ? JADE + "33" : BORDER}`,
                    }}>
                    {checked && <Icon name="checkMark" size={11} color={JADE} />}
                    <span style={{ fontSize: 12, fontWeight: 700, color: checked ? JADE : isToday ? TEXT : TEXT_DIM }}>{DAY_ABBR[dayIdx]}</span>
                    <span style={{ fontSize: 11, color: TEXT_MUTED }}>{date.getDate()}</span>
                    {isToday && <span style={{ fontSize: 10, fontWeight: 700, color: JADE }}>·</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
