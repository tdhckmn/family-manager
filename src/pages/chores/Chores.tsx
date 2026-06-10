import { useState, useEffect, useMemo } from "react";
import {
  collection, onSnapshot, doc, setDoc, deleteDoc, query, orderBy,
} from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../auth";
import { Icon } from "../../components/Icon";
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
  assignedTo: string;     // free-text family member; "" = anyone
  daysOfWeek: number[];   // 0=Sun … 6=Sat
  category?: string;
  notes?: string;
}

/** Per-week completion log. doc id = weekKey; `done` keyed by `${choreId}:${dayIdx}`. */
interface WeekLog {
  done: Record<string, boolean>;
}

const ASSIGNEE_PALETTE = [PINK, BLUE, JADE, AMBER, LAV, TEAL];
function assigneeColor(name: string): string {
  if (!name) return TEXT_DIM;
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return ASSIGNEE_PALETTE[h % ASSIGNEE_PALETTE.length];
}

const EMPTY: Omit<Chore, "id"> = { name: "", assignedTo: "", daysOfWeek: [], category: "", notes: "" };

function formatDays(daysOfWeek: number[]): string {
  const s = [...daysOfWeek].sort((a, b) => a - b);
  if (s.length === 7) return "Every day";
  if (s.join() === "1,2,3,4,5") return "Weekdays";
  if (s.join() === "0,6") return "Weekends";
  return s.map(d => ["Su","Mo","Tu","We","Th","Fr","Sa"][d]).join(" · ");
}

// ── Page ─────────────────────────────────────────────────────────────────
export default function Chores() {
  const uidAuth = useAuth().uid;
  const isMobile = useIsMobile();
  const [chores, setChores] = useState<Chore[]>([]);
  const [log, setLog] = useState<WeekLog>({ done: {} });
  const [editorId, setEditorId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Omit<Chore, "id">>(EMPTY);
  const [choreDetailId, setChoreDetailId] = useState<string | null>(null);

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
      setLog(snap.exists() ? (snap.data() as WeekLog) : { done: {} });
    }, err => console.error("Chore log load failed:", err));
  }, [uidAuth, wk]);

  const choresByDay = useMemo(() => {
    const map: Chore[][] = [[], [], [], [], [], [], []];
    for (const c of chores) for (const d of c.daysOfWeek) if (d >= 0 && d <= 6) map[d].push(c);
    return map;
  }, [chores]);

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
    setLog({ done: next });
    setDoc(doc(db, "users", uidAuth, "choreLog", wk), { done: next }).catch(console.error);
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
  function openEdit(c: Chore) {
    setDraft({ name: c.name, assignedTo: c.assignedTo, daysOfWeek: [...c.daysOfWeek], category: c.category ?? "", notes: c.notes ?? "" });
    setEditorId(c.id);
  }
  function closeEditor() { setEditorId(null); }

  async function saveDraft() {
    if (!draft.name.trim() || draft.daysOfWeek.length === 0) return;
    const id = editorId && editorId !== "new" ? editorId : uid();
    const payload: Chore = {
      id,
      name: draft.name.trim(),
      assignedTo: draft.assignedTo.trim(),
      daysOfWeek: [...draft.daysOfWeek].sort((a, b) => a - b),
      category: draft.category?.trim() || "",
      notes: draft.notes?.trim() || "",
    };
    await setDoc(doc(db, "users", uidAuth, "chores", id), payload);
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
                <input value={draft.assignedTo} onChange={e => setDraft({ ...draft, assignedTo: e.target.value })} placeholder="Name" list="chore-assignees" style={inputStyle} />
                <datalist id="chore-assignees">{assignees.map(a => <option key={a} value={a} />)}</datalist>
              </Field>
            </div>
            <div style={{ marginTop: 12 }}>
              <Field label="Repeats on">
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
        <EmptyHint>No chores yet. Add a chore, pick who's responsible and which days it repeats — it'll show up on the board and everyone's Today view.</EmptyHint>
      ) : (
        <>
          {/* Assignee legend */}
          {assignees.length > 0 && (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
              {assignees.map(a => (
                <span key={a} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: TEXT_DIM }}>
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: assigneeColor(a) }} /> {a}
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
              if (isMobile && list.length === 0) return null;
              return (
                <div key={dayIdx} style={{ background: isToday ? "rgba(93,184,138,0.06)" : SURFACE, border: `1px solid ${isToday ? JADE + "44" : BORDER}`, borderRadius: 12, overflow: "hidden", minHeight: isMobile ? 0 : 80 }}>
                  <div style={{ padding: "8px 10px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", color: isToday ? JADE : TEXT_DIM }}>
                      {isMobile ? dayName : DAY_ABBR[dayIdx]}
                    </span>
                    <span style={{ fontSize: 11, color: TEXT_MUTED }}>{date.getDate()}</span>
                  </div>
                  <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                    {list.length === 0 && !isMobile && <span style={{ fontSize: 11, color: TEXT_MUTED, fontStyle: "italic", padding: "2px 4px" }}>—</span>}
                    {list.map(c => {
                      const checked = !!log.done[`${c.id}:${dayIdx}`];
                      const color = assigneeColor(c.assignedTo);
                      return (
                        <button key={c.id} onClick={() => toggle(c.id, dayIdx)}
                          style={{ display: "flex", alignItems: "flex-start", gap: 8, textAlign: "left", padding: "8px 9px", borderRadius: 9, cursor: "pointer", fontFamily: FONT,
                            background: checked ? "rgba(93,184,138,0.10)" : "var(--surface)", border: `1px solid ${checked ? JADE + "40" : BORDER}`, transition: "all 0.12s" }}
                          onMouseEnter={e => { if (!checked) (e.currentTarget as HTMLButtonElement).style.background = SURFACE_HI; }}
                          onMouseLeave={e => { if (!checked) (e.currentTarget as HTMLButtonElement).style.background = "var(--surface)"; }}>
                          <span style={{ flexShrink: 0, width: 16, height: 16, marginTop: 1, borderRadius: 4, border: `1.5px solid ${checked ? JADE : "var(--border-hi)"}`, background: checked ? JADE : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {checked && <span style={{ color: BG, fontSize: 10, fontWeight: 700, lineHeight: 1 }}>✓</span>}
                          </span>
                          <span style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: checked ? TEXT_MUTED : TEXT, textDecoration: checked ? "line-through" : "none", lineHeight: 1.35 }}>{c.name}</span>
                            {c.assignedTo && <span style={{ display: "block", fontSize: 10, fontWeight: 700, color, marginTop: 2 }}>{c.assignedTo}</span>}
                          </span>
                        </button>
                      );
                    })}
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
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: assigneeColor(c.assignedTo), flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>{c.name}</span>
                    {c.assignedTo && <span style={{ fontSize: 12, color: TEXT_DIM }}> · {c.assignedTo}</span>}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: TEXT_MUTED, flexShrink: 0 }}>{formatDays(c.daysOfWeek)}</span>
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
            onClose={() => setChoreDetailId(null)}
            onEdit={() => { setChoreDetailId(null); openEdit(c); }}
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
function ChoreDetail({ chore, log, weekStart, todayIdx, onClose, onEdit, onToggle }: {
  chore: Chore;
  log: Record<string, boolean>;
  weekStart: Date;
  todayIdx: number;
  onClose: () => void;
  onEdit: () => void;
  onToggle: (dayIdx: number) => void;
}) {
  const sortedDays = [...chore.daysOfWeek].sort((a, b) => a - b);
  const doneCount = sortedDays.filter(d => log[`${chore.id}:${d}`]).length;
  const color = assigneeColor(chore.assignedTo);

  return (
    <div style={{ position: "fixed", inset: 0, background: BG, zIndex: 50, overflowY: "auto", fontFamily: FONT, color: TEXT }}>
      {/* Header */}
      <div style={{ position: "sticky", top: 0, zIndex: 10, background: "rgba(6,9,26,0.92)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", padding: "0 20px", minHeight: 60, gap: 12, boxSizing: "border-box" }}>
        <button onClick={onClose}
          style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 8, cursor: "pointer", color: TEXT_DIM, padding: "6px 10px", display: "flex", alignItems: "center", lineHeight: 1, flexShrink: 0 }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = TEXT; (e.currentTarget as HTMLButtonElement).style.borderColor = BORDER_HI; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = TEXT_DIM; (e.currentTarget as HTMLButtonElement).style.borderColor = BORDER; }}>
          <Icon name="x" size={16} color="currentColor" />
        </button>
        <div style={{ flex: 1, textAlign: "center", fontWeight: 800, fontSize: 16, color: TEXT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          Chore
        </div>
        <button onClick={onEdit}
          style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 8, cursor: "pointer", color: TEXT_DIM, padding: "6px 10px", display: "flex", alignItems: "center", lineHeight: 1, flexShrink: 0 }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = PINK; (e.currentTarget as HTMLButtonElement).style.borderColor = PINK + "60"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = TEXT_DIM; (e.currentTarget as HTMLButtonElement).style.borderColor = BORDER; }}>
          <Icon name="pencil" size={16} color="currentColor" />
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: "32px 24px 80px", maxWidth: 600, margin: "0 auto" }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: TEXT, margin: "0 0 12px", lineHeight: 1.2 }}>{chore.name}</h1>

        {/* Meta */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 20 }}>
          {chore.assignedTo && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color }}>
              <span style={{ width: 9, height: 9, borderRadius: "50%", background: color, flexShrink: 0 }} />
              {chore.assignedTo}
            </span>
          )}
          <span style={{ fontSize: 13, color: TEXT_DIM, fontWeight: 600 }}>{formatDays(chore.daysOfWeek)}</span>
          <span style={{ fontSize: 12, color: TEXT_MUTED }}>{sortedDays.length} day{sortedDays.length !== 1 ? "s" : ""}/week</span>
        </div>

        {chore.notes && (
          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "12px 14px", fontSize: 13, color: TEXT_DIM, marginBottom: 20, fontStyle: "italic" }}>
            {chore.notes}
          </div>
        )}

        {/* This week's progress */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: TEXT_MUTED, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
            This week
            <span style={{ fontSize: 12, fontWeight: 800, color: doneCount === sortedDays.length && sortedDays.length > 0 ? JADE : TEXT_DIM }}>
              {doneCount}/{sortedDays.length}
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {sortedDays.map(dayIdx => {
              const date = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + dayIdx);
              const checked = !!log[`${chore.id}:${dayIdx}`];
              const isToday = dayIdx === todayIdx;
              return (
                <button key={dayIdx} onClick={() => onToggle(dayIdx)}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 10, cursor: "pointer", fontFamily: FONT, background: checked ? "rgba(93,184,138,0.08)" : SURFACE, border: `1px solid ${checked ? JADE + "40" : isToday ? JADE + "44" : BORDER}`, transition: "all 0.12s", textAlign: "left" }}>
                  <span style={{ flexShrink: 0, width: 20, height: 20, borderRadius: 6, border: `2px solid ${checked ? JADE : "var(--border-hi)"}`, background: checked ? JADE : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {checked && <span style={{ color: BG, fontSize: 12, fontWeight: 800, lineHeight: 1 }}>✓</span>}
                  </span>
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: checked ? TEXT_MUTED : TEXT, textDecoration: checked ? "line-through" : "none" }}>
                    {DAY_NAMES[dayIdx]}
                  </span>
                  <span style={{ fontSize: 12, color: TEXT_MUTED }}>{date.getDate()}</span>
                  {isToday && <span style={{ fontSize: 11, fontWeight: 700, color: JADE, background: JADE + "22", borderRadius: 6, padding: "2px 8px" }}>Today</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
