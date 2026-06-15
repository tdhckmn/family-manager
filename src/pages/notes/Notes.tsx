import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import ToolNav from "../../components/ToolNav";
import { Icon } from "../../components/Icon";
import { useHouseholdUid } from "../../household";
import ReactMarkdown from "react-markdown";
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, query, orderBy,
} from "firebase/firestore";
import { db } from "../../firebase";
import StarField from "../../components/StarField";
import { WisdomCard, useDailyQuote } from "../../components/Wisdom";
import { usePrefs } from "../../prefs";

// ── Types ─────────────────────────────────────────────────────────────────

interface Note {
  id: string;
  title: string;
  notes: string;
  completed: boolean;
  createdAt: number;
  dueDate?: string | null;   // YYYY-MM-DD — optional; surfaces on the calendar
}

// ── Due-date helpers ────────────────────────────────────────────────────────

/** Whole calendar days from today → iso date. Negative = overdue, 0 = today. */
function daysUntilDue(iso: string): number {
  const target = new Date(iso + "T12:00:00");
  const now = new Date();
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const b = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  return Math.round((b - a) / 86_400_000);
}

function dueLabel(iso: string): string {
  const n = daysUntilDue(iso);
  if (n === 0) return "Due today";
  if (n === 1) return "Due tomorrow";
  if (n === -1) return "1 day overdue";
  if (n < -1) return `${-n} days overdue`;
  if (n <= 7) return `Due in ${n} days`;
  const d = new Date(iso + "T12:00:00");
  return `Due ${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()]} ${d.getDate()}`;
}

/** Accent color for a due date by urgency. */
function dueColor(iso: string): string {
  const n = daysUntilDue(iso);
  if (n < 0) return "#c0566a";   // overdue → danger
  if (n === 0) return "#d4a45b"; // today → amber
  return "#7a7890";              // upcoming → dim
}

function DueBadge({ iso }: { iso: string }) {
  const color = dueColor(iso);
  return (
    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.4, color, background: `${color}1a`, border: `1px solid ${color}33`, borderRadius: 12, padding: "1px 7px", whiteSpace: "nowrap" }}>
      {dueLabel(iso)}
    </span>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────

const BG = "var(--bg)";
const SURFACE = "var(--surface)";
const SURFACE_HOVER = "var(--surface-hi)";
const SURFACE_SELECTED = "rgba(91,143,212,0.10)";
const BORDER = "var(--border)";
const BORDER_ACCENT = "rgba(91,143,212,0.35)";
const JADE = "#5b8fd4";
const JADE_DIM = "#5b8fd4";
const TEXT = "var(--text)";
const TEXT_DIM = "var(--text-dim)";
const TEXT_MUTED = "var(--text-muted)";
const DANGER = "#c0566a";

// ── Hook: responsive breakpoint ───────────────────────────────────────────

function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < breakpoint);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [breakpoint]);
  return isMobile;
}

// ── Component ─────────────────────────────────────────────────────────────

export default function Notes() {
  const uid = useHouseholdUid();
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftNotes, setDraftNotes] = useState("");
  const [draftDue, setDraftDue] = useState("");
  const [addingTitle, setAddingTitle] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Mobile: whether we're showing the detail view (true) or the list (false)
  const [mobileShowDetail, setMobileShowDetail] = useState(false);

  const isMobile = useIsMobile();
  const { prefs } = usePrefs();
  const showWisdom = prefs.wisdomPages.includes("notes");
  const todayQuote = useDailyQuote();

  const addInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const selected = notes.find(t => t.id === selectedId) ?? null;
  const todos = notes
    .filter(t => !t.completed && !!t.dueDate)
    .sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : a.dueDate! > b.dueDate! ? 1 : 0));
  const plainNotes = notes
    .filter(t => !t.completed && !t.dueDate)
    .sort((a, b) => b.createdAt - a.createdAt);
  const done = notes.filter(t => t.completed);

  useEffect(() => {
    const q = query(collection(db, "users", uid, "notes"), orderBy("createdAt", "desc"));
    return onSnapshot(q, snap => {
      setNotes(snap.docs.map(d => ({ id: d.id, ...d.data() } as Note)));
    }, err => console.error("Notes load failed:", err));
  }, [uid]);

  useEffect(() => {
    if (showAdd) addInputRef.current?.focus();
  }, [showAdd]);

  useEffect(() => {
    if (editing) titleInputRef.current?.focus();
  }, [editing]);

  // On mobile, switching to a different screen should close the add input
  useEffect(() => {
    if (isMobile && mobileShowDetail) {
      setShowAdd(false);
      setAddingTitle("");
    }
  }, [isMobile, mobileShowDetail]);

  function selectNote(id: string) {
    if (editing) return;
    setSelectedId(id);
    setConfirmDelete(false);
    if (isMobile) setMobileShowDetail(true);
  }

  function backToList() {
    setMobileShowDetail(false);
    setEditing(false);
    setConfirmDelete(false);
  }

  function startEdit() {
    if (!selected) return;
    setDraftTitle(selected.title);
    setDraftNotes(selected.notes);
    setDraftDue(selected.dueDate ?? "");
    setEditing(true);
    setConfirmDelete(false);
  }

  async function saveEdit() {
    if (!selected) return;
    await updateDoc(doc(db, "users", uid, "notes", selected.id), {
      title: draftTitle.trim() || selected.title,
      notes: draftNotes,
      dueDate: draftDue.trim() || null,
    });
    setEditing(false);
  }

  function cancelEdit() {
    setEditing(false);
  }

  async function toggleComplete(note: Note) {
    await updateDoc(doc(db, "users", uid, "notes", note.id), { completed: !note.completed });
  }

  async function addNote() {
    const title = addingTitle.trim();
    if (!title) return;
    const ref = await addDoc(collection(db, "users", uid, "notes"), {
      title,
      notes: "",
      completed: false,
      createdAt: Date.now(),
    });
    setAddingTitle("");
    setShowAdd(false);
    setSelectedId(ref.id);
    setEditing(false);
    if (isMobile) setMobileShowDetail(true);
  }

  async function deleteNote() {
    if (!selected) return;
    await deleteDoc(doc(db, "users", uid, "notes", selected.id));
    setSelectedId(null);
    setEditing(false);
    setConfirmDelete(false);
    if (isMobile) setMobileShowDetail(false);
  }

  function handleAddKey(e: React.KeyboardEvent) {
    if (e.key === "Enter") addNote();
    if (e.key === "Escape") { setShowAdd(false); setAddingTitle(""); }
  }

  function handleEditKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Escape") cancelEdit();
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") saveEdit();
  }

  // ── Mobile layout ────────────────────────────────────────────────────────

  if (isMobile) {
    return (
      <div style={{ background: BG, minHeight: "100vh", fontFamily: "'Montserrat', sans-serif", color: TEXT, position: "relative" }}>
        <StarField />

        <div style={{ position: "relative", zIndex: 1 }}>

          {/* Header bar — right padding reserves room for the fixed global gear (top-right) */}
          <div style={{ padding: "14px 62px 14px 16px", minHeight: 60, borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: 12, boxSizing: "border-box" }}>
            <Link to="/app" style={{ textDecoration: "none", color: TEXT_DIM, fontSize: 13, fontWeight: 600, opacity: 0.7, flexShrink: 0, transition: "opacity 0.15s", display: "flex", alignItems: "center", gap: 4 }}
              onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.opacity = "1"}
              onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.opacity = "0.7"}>
              <Icon name="chevronLeft" size={13} /> Home
            </Link>
            <div style={{ width: 1, height: 14, background: "var(--border)", flexShrink: 0 }} />
            <ToolNav current="notes" />
            <div style={{ flex: 1 }} />
            <button onClick={() => setShowAdd(true)}
              style={{ ...btnStyle(JADE), fontSize: 13, padding: "8px 16px", display: "flex", alignItems: "center", gap: 6 }}>
              + New Note
            </button>
          </div>

          {/* ── LIST VIEW ── */}
          {!mobileShowDetail && (
            <div style={{ padding: "16px 16px 32px" }}>

              {showWisdom && (
                <div style={{ marginBottom: 20 }}>
                  <WisdomCard quote={todayQuote} compact />
                </div>
              )}

              {/* Inline add input */}
              {showAdd && (
                <div style={{ background: SURFACE, border: `1px solid ${BORDER_ACCENT}`, borderRadius: 14, padding: "12px 14px", marginBottom: 16, display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    ref={addInputRef}
                    value={addingTitle}
                    onChange={e => setAddingTitle(e.target.value)}
                    onKeyDown={handleAddKey}
                    placeholder="New note…"
                    style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: TEXT, fontSize: 15, fontFamily: "'Montserrat', sans-serif" }}
                  />
                  <button onClick={addNote} style={{ ...btnStyle(JADE), padding: "7px 16px", fontSize: 13 }}>Add</button>
                  <button onClick={() => { setShowAdd(false); setAddingTitle(""); }}
                    style={{ ...btnStyle("transparent"), color: TEXT_DIM, padding: "7px 8px", fontSize: 16, lineHeight: 1, display: "flex", alignItems: "center" }}><Icon name="x" size={14} /></button>
                </div>
              )}

              {/* TODO section — dated notes */}
              {todos.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: TEXT_MUTED, paddingLeft: 4, marginBottom: 8 }}>TODO</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {todos.map(note => (
                      <MobileNoteItem key={note.id} note={note} onSelect={() => selectNote(note.id)} onToggle={() => toggleComplete(note)} />
                    ))}
                  </div>
                </div>
              )}

              {/* Notes section — undated */}
              <div>
                {(todos.length > 0 || done.length > 0) && (
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: TEXT_MUTED, paddingLeft: 4, marginBottom: 8 }}>Notes</div>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {plainNotes.map(note => (
                    <MobileNoteItem key={note.id} note={note} onSelect={() => selectNote(note.id)} />
                  ))}
                  {plainNotes.length === 0 && todos.length === 0 && !showAdd && (
                    <div style={{ color: TEXT_MUTED, fontSize: 13, padding: "12px 4px", fontStyle: "italic" }}>No notes yet.</div>
                  )}
                </div>
              </div>

              {done.length > 0 && (
                <div style={{ marginTop: 24 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: TEXT_MUTED, paddingLeft: 4, marginBottom: 8 }}>Done</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {done.map(note => (
                      <MobileNoteItem key={note.id} note={note} onSelect={() => selectNote(note.id)} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── DETAIL VIEW ── */}
          {mobileShowDetail && selected && (
            <div style={{ padding: "16px 16px 32px", minHeight: "100vh" }}>
              {/* Back bar */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <button onClick={backToList}
                  style={{ ...btnStyle("transparent"), color: TEXT_DIM, fontSize: 13, fontWeight: 600, padding: "8px 0", display: "flex", alignItems: "center", gap: 6 }}>
                  <Icon name="chevronLeft" size={13} /> Back
                </button>
                {/* Action buttons in detail header */}
                <div style={{ display: "flex", gap: 8 }}>
                  {editing ? (
                    <>
                      <button onClick={saveEdit} style={{ ...btnStyle(JADE), fontSize: 13, padding: "8px 18px" }}>Save</button>
                      <button onClick={cancelEdit} style={{ ...btnStyle("transparent"), color: TEXT_DIM, border: `1px solid ${BORDER}`, fontSize: 13, padding: "8px 14px" }}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <button onClick={startEdit} style={{ ...btnStyle("transparent"), color: TEXT_DIM, border: `1px solid ${BORDER}`, fontSize: 13, padding: "8px 16px" }}>Edit</button>
                      {confirmDelete ? (
                        <>
                          <button onClick={deleteNote} style={{ ...btnStyle(DANGER), fontSize: 13, padding: "8px 14px" }}>Delete</button>
                          <button onClick={() => setConfirmDelete(false)} style={{ ...btnStyle("transparent"), color: TEXT_DIM, border: `1px solid ${BORDER}`, fontSize: 13, padding: "8px 12px", display: "flex", alignItems: "center" }}><Icon name="x" size={14} /></button>
                        </>
                      ) : (
                        <button onClick={() => setConfirmDelete(true)} style={{ ...btnStyle("transparent"), color: TEXT_MUTED, border: `1px solid transparent`, fontSize: 13, padding: "8px 12px" }}>Delete</button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Title */}
              {editing ? (
                <>
                  <input
                    ref={titleInputRef}
                    value={draftTitle}
                    onChange={e => setDraftTitle(e.target.value)}
                    style={{ width: "100%", boxSizing: "border-box", background: "transparent", border: "none", borderBottom: `1.5px solid ${JADE_DIM}`, outline: "none", color: TEXT, fontSize: 22, fontWeight: 700, fontFamily: "'Montserrat', sans-serif", padding: "4px 0", marginBottom: 16 }}
                  />
                  <DueDateEditor value={draftDue} onChange={setDraftDue} style={{ marginBottom: 20 }} />
                </>
              ) : (
                <div style={{ marginBottom: 20 }}>
                  <h2 style={{ fontSize: 22, fontWeight: 700, color: selected.completed ? TEXT_MUTED : TEXT, textDecoration: selected.completed ? "line-through" : "none", margin: 0, lineHeight: 1.3 }}>
                    {selected.title}
                  </h2>
                  {selected.dueDate && <div style={{ marginTop: 8 }}><DueBadge iso={selected.dueDate} /></div>}
                </div>
              )}

              <div style={{ height: 1, background: BORDER, marginBottom: 20 }} />

              {/* Notes */}
              {editing ? (
                <MobileEditArea draftNotes={draftNotes} onDraftNotes={setDraftNotes} onEditKey={handleEditKey} />
              ) : (
                <div style={{ flex: 1, overflow: "auto" }}>
                  {selected.notes.trim() ? (
                    <div className="md-view">
                      <ReactMarkdown components={MD_COMPONENTS}>{selected.notes}</ReactMarkdown>
                    </div>
                  ) : (
                    <div style={{ color: TEXT_MUTED, fontSize: 14, fontStyle: "italic" }}>
                      No notes yet — tap Edit to add some.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    );
  }

  // ── Desktop layout (unchanged) ────────────────────────────────────────────

  return (
    <div style={{ background: BG, minHeight: "100vh", display: "flex", flexDirection: "column", fontFamily: "'Montserrat', sans-serif" }}>

      <StarField />

      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", minHeight: "100vh" }}>

        {/* Header bar — right padding reserves room for the fixed global gear (top-right) */}
        <div style={{ padding: "14px 62px 14px 24px", minHeight: 60, borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: 12, boxSizing: "border-box" }}>
          <Link to="/app" style={{ textDecoration: "none", color: TEXT_DIM, fontSize: 13, fontWeight: 600, opacity: 0.7, flexShrink: 0, transition: "opacity 0.15s", display: "flex", alignItems: "center", gap: 4 }}
            onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.opacity = "1"}
            onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.opacity = "0.7"}>
            <Icon name="chevronLeft" size={13} /> Home
          </Link>
          <div style={{ width: 1, height: 14, background: "var(--border)", flexShrink: 0 }} />
          <ToolNav current="notes" />
          <div style={{ flex: 1 }} />
          <button onClick={() => setShowAdd(true)}
            style={{ ...btnStyle(JADE), fontSize: 13, padding: "8px 16px", display: "flex", alignItems: "center", gap: 6 }}>
            + New Note
          </button>
        </div>

        <div style={{ maxWidth: 1200, margin: "0 auto", width: "100%", padding: "24px 20px", display: "flex", flexDirection: "column", flex: 1 }}>

        {showWisdom && (
          <div style={{ marginBottom: 20 }}>
            <WisdomCard quote={todayQuote} compact />
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20, flex: 1 }}>

          {/* Sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {showAdd && (
              <div style={{ background: SURFACE, border: `1px solid ${BORDER_ACCENT}`, borderRadius: 12, padding: "10px 14px", marginBottom: 12, display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  ref={addInputRef}
                  value={addingTitle}
                  onChange={e => setAddingTitle(e.target.value)}
                  onKeyDown={handleAddKey}
                  placeholder="Note title…"
                  style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: TEXT, fontSize: 14, fontFamily: "'Montserrat', sans-serif" }}
                />
                <button onClick={addNote} style={{ ...btnStyle(JADE), padding: "4px 12px", fontSize: 12 }}>Add</button>
                <button onClick={() => { setShowAdd(false); setAddingTitle(""); }} style={{ ...btnStyle("transparent"), color: TEXT_DIM, padding: "4px 8px", fontSize: 12, display: "flex", alignItems: "center" }}><Icon name="x" size={14} /></button>
              </div>
            )}

            {/* TODO section — dated notes */}
            {todos.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: TEXT_MUTED, paddingLeft: 4, marginBottom: 6 }}>TODO</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {todos.map(note => (
                    <NoteItem key={note.id} note={note} selected={selectedId === note.id} onSelect={() => selectNote(note.id)} onToggle={() => toggleComplete(note)} />
                  ))}
                </div>
              </div>
            )}

            {/* Notes section — undated */}
            <div>
              {(todos.length > 0 || done.length > 0) && (
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: TEXT_MUTED, paddingLeft: 4, marginBottom: 6 }}>Notes</div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {plainNotes.map(note => (
                  <NoteItem key={note.id} note={note} selected={selectedId === note.id} onSelect={() => selectNote(note.id)} />
                ))}
                {plainNotes.length === 0 && todos.length === 0 && !showAdd && (
                  <div style={{ color: TEXT_MUTED, fontSize: 12, padding: "8px 4px", fontStyle: "italic" }}>No notes yet.</div>
                )}
              </div>
            </div>

            {done.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: TEXT_MUTED, paddingLeft: 4, marginBottom: 6 }}>Done</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {done.map(note => (
                    <NoteItem key={note.id} note={note} selected={selectedId === note.id} onSelect={() => selectNote(note.id)} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Detail panel */}
          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "28px 32px", minHeight: 400, display: "flex", flexDirection: "column" }}>
            {selected ? (
              <DetailPanel
                note={selected}
                editing={editing}
                draftTitle={draftTitle}
                draftNotes={draftNotes}
                draftDue={draftDue}
                confirmDelete={confirmDelete}
                titleInputRef={titleInputRef}
                onDraftTitle={setDraftTitle}
                onDraftNotes={setDraftNotes}
                onDraftDue={setDraftDue}
                onEdit={startEdit}
                onSave={saveEdit}
                onCancel={cancelEdit}
                onEditKey={handleEditKey}
                onDeleteRequest={() => setConfirmDelete(true)}
                onDeleteCancel={() => setConfirmDelete(false)}
                onDeleteConfirm={deleteNote}
              />
            ) : (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: TEXT_MUTED, fontSize: 14, fontStyle: "italic" }}>
                Select a note to view details
              </div>
            )}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────

/** Desktop sidebar note row */
function NoteItem({ note, selected, onSelect, onToggle }: {
  note: Note;
  selected: boolean;
  onSelect: () => void;
  onToggle?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const bg = selected ? SURFACE_SELECTED : hovered ? SURFACE_HOVER : SURFACE;
  const border = selected ? BORDER_ACCENT : "transparent";
  const showCheckbox = !!note.dueDate || note.completed;

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", borderRadius: 10, background: bg, border: `1px solid ${border}`, cursor: "pointer", transition: "all 0.15s" }}>
      {showCheckbox && (
        <button
          onClick={e => { e.stopPropagation(); onToggle?.(); }}
          style={{ flexShrink: 0, width: 18, height: 18, marginTop: 1, borderRadius: 5, border: `1.5px solid ${note.completed ? JADE : "var(--border-hi)"}`, background: note.completed ? JADE : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s", padding: 0 }}>
          {note.completed && <Icon name="checkMark" size={11} />}
        </button>
      )}
      <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 13, color: note.completed ? TEXT_MUTED : TEXT, textDecoration: note.completed ? "line-through" : "none", lineHeight: 1.45, wordBreak: "break-word" }}>
          {note.title}
        </span>
        {!note.completed && note.dueDate && <DueBadge iso={note.dueDate} />}
      </div>
    </div>
  );
}

/** Mobile note row — larger touch target, swipe-friendly feel */
function MobileNoteItem({ note, onSelect, onToggle }: {
  note: Note;
  onSelect: () => void;
  onToggle?: () => void;
}) {
  const showCheckbox = !!note.dueDate || note.completed;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 14px", borderRadius: 14, background: SURFACE, border: `1px solid ${BORDER}`, cursor: "pointer", transition: "background 0.15s" }}
      onTouchStart={e => (e.currentTarget as HTMLDivElement).style.background = SURFACE_HOVER}
      onTouchEnd={e => (e.currentTarget as HTMLDivElement).style.background = SURFACE}
    >
      {showCheckbox && (
        <button
          onClick={e => { e.stopPropagation(); onToggle?.(); }}
          style={{ flexShrink: 0, width: 24, height: 24, borderRadius: 7, border: `2px solid ${note.completed ? JADE : "var(--border-hi)"}`, background: note.completed ? JADE : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
          {note.completed && <Icon name="checkMark" size={14} />}
        </button>
      )}

      {/* Title — tapping opens detail */}
      <div onClick={onSelect} style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 15, color: note.completed ? TEXT_MUTED : TEXT, textDecoration: note.completed ? "line-through" : "none", lineHeight: 1.4, wordBreak: "break-word" }}>
          {note.title}
        </span>
        {!note.completed && note.dueDate && <DueBadge iso={note.dueDate} />}
      </div>

      {/* Chevron */}
      <span onClick={onSelect} style={{ fontSize: 16, color: TEXT_MUTED, flexShrink: 0 }}>›</span>
    </div>
  );
}

function DetailPanel({
  note, editing, draftTitle, draftNotes, draftDue, confirmDelete, titleInputRef,
  onDraftTitle, onDraftNotes, onDraftDue, onEdit, onSave, onCancel, onEditKey,
  onDeleteRequest, onDeleteCancel, onDeleteConfirm,
}: {
  note: Note;
  editing: boolean;
  draftTitle: string;
  draftNotes: string;
  draftDue: string;
  confirmDelete: boolean;
  titleInputRef: React.RefObject<HTMLInputElement>;
  onDraftTitle: (v: string) => void;
  onDraftNotes: (v: string) => void;
  onDraftDue: (v: string) => void;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onEditKey: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onDeleteRequest: () => void;
  onDeleteCancel: () => void;
  onDeleteConfirm: () => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 0 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, gap: 12 }}>
        {editing ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
            <input
              ref={titleInputRef}
              value={draftTitle}
              onChange={e => onDraftTitle(e.target.value)}
              style={{ width: "100%", boxSizing: "border-box", background: "transparent", border: "none", borderBottom: `1.5px solid ${JADE_DIM}`, outline: "none", color: TEXT, fontSize: 20, fontWeight: 700, fontFamily: "'Montserrat', sans-serif", padding: "2px 0" }}
            />
            <DueDateEditor value={draftDue} onChange={onDraftDue} />
          </div>
        ) : (
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: note.completed ? TEXT_MUTED : TEXT, textDecoration: note.completed ? "line-through" : "none", margin: 0, lineHeight: 1.3 }}>
              {note.title}
            </h2>
            {note.dueDate && <div style={{ marginTop: 8 }}><DueBadge iso={note.dueDate} /></div>}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          {editing ? (
            <>
              <button onClick={onSave} style={{ ...btnStyle(JADE), fontSize: 12, padding: "5px 14px" }}>Save</button>
              <button onClick={onCancel} style={{ ...btnStyle("transparent"), color: TEXT_DIM, border: `1px solid ${BORDER}`, fontSize: 12, padding: "5px 12px" }}>Cancel</button>
            </>
          ) : (
            <>
              <button onClick={onEdit} style={{ ...btnStyle("transparent"), color: TEXT_DIM, border: `1px solid ${BORDER}`, fontSize: 12, padding: "5px 12px", transition: "all 0.15s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = TEXT; (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-hi)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = TEXT_DIM; (e.currentTarget as HTMLButtonElement).style.borderColor = BORDER; }}>
                Edit
              </button>
              {confirmDelete ? (
                <>
                  <button onClick={onDeleteConfirm} style={{ ...btnStyle(DANGER), fontSize: 12, padding: "5px 12px" }}>Confirm</button>
                  <button onClick={onDeleteCancel} style={{ ...btnStyle("transparent"), color: TEXT_DIM, border: `1px solid ${BORDER}`, fontSize: 12, padding: "5px 10px", display: "flex", alignItems: "center" }}><Icon name="x" size={14} /></button>
                </>
              ) : (
                <button onClick={onDeleteRequest} style={{ ...btnStyle("transparent"), color: TEXT_MUTED, border: `1px solid transparent`, fontSize: 12, padding: "5px 10px", transition: "all 0.15s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = DANGER; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = TEXT_MUTED; }}>
                  Delete
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div style={{ height: 1, background: BORDER, marginBottom: 20 }} />

      {editing ? (
        <DesktopEditArea draftNotes={draftNotes} onDraftNotes={onDraftNotes} onEditKey={onEditKey} />
      ) : (
        <div style={{ flex: 1, overflow: "auto" }}>
          {note.notes.trim() ? (
            <div className="md-view">
              <ReactMarkdown components={MD_COMPONENTS}>{note.notes}</ReactMarkdown>
            </div>
          ) : (
            <div style={{ color: TEXT_MUTED, fontSize: 13, fontStyle: "italic" }}>
              No notes yet — click Edit to add some.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MobileEditArea({ draftNotes, onDraftNotes, onEditKey }: {
  draftNotes: string;
  onDraftNotes: (v: string) => void;
  onEditKey: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
        <div style={{ fontSize: 11, color: TEXT_MUTED, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>Notes · Markdown</div>
        <MarkdownToolbar textareaRef={taRef} onValue={onDraftNotes} />
      </div>
      <textarea
        ref={taRef}
        value={draftNotes}
        onChange={e => onDraftNotes(e.target.value)}
        onKeyDown={onEditKey}
        placeholder={"# Heading\n\nWrite **markdown** here…\n\n- List item\n- Another item"}
        style={{ background: "var(--input-bg)", border: `1px solid ${BORDER}`, borderRadius: 10, padding: "14px 16px", color: TEXT, fontSize: 14, fontFamily: "ui-monospace, 'SF Mono', 'Fira Mono', monospace", lineHeight: 1.7, resize: "none", outline: "none", minHeight: 280, width: "100%", boxSizing: "border-box" }}
        onFocus={e => (e.target.style.borderColor = JADE_DIM)}
        onBlur={e => (e.target.style.borderColor = BORDER)}
      />
      <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 2 }}>⌘↩ to save · Esc to cancel</div>
    </div>
  );
}

function DesktopEditArea({ draftNotes, onDraftNotes, onEditKey }: {
  draftNotes: string;
  onDraftNotes: (v: string) => void;
  onEditKey: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
        <div style={{ fontSize: 11, color: TEXT_MUTED, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>
          Notes · Markdown <span style={{ marginLeft: 8, opacity: 0.6, fontWeight: 400, letterSpacing: 0, textTransform: "none" }}>⌘↩ to save · Esc to cancel</span>
        </div>
        <MarkdownToolbar textareaRef={taRef} onValue={onDraftNotes} />
      </div>
      <textarea
        ref={taRef}
        value={draftNotes}
        onChange={e => onDraftNotes(e.target.value)}
        onKeyDown={onEditKey}
        placeholder={"# Heading\n\nWrite **markdown** here…\n\n- List item\n- Another item"}
        style={{ flex: 1, background: "var(--input-bg)", border: `1px solid ${BORDER}`, borderRadius: 10, padding: "14px 16px", color: TEXT, fontSize: 13, fontFamily: "ui-monospace, 'SF Mono', 'Fira Mono', monospace", lineHeight: 1.7, resize: "none", outline: "none", minHeight: 320, transition: "border-color 0.15s" }}
        onFocus={e => (e.target.style.borderColor = JADE_DIM)}
        onBlur={e => (e.target.style.borderColor = BORDER)}
      />
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────

/** Compact due-date picker used in the edit views. Empty = no due date. */
function DueDateEditor({ value, onChange, style }: { value: string; onChange: (v: string) => void; style?: React.CSSProperties }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", ...style }}>
      <span style={{ fontSize: 11, color: TEXT_MUTED, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>Due</span>
      <input
        type="date"
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ background: "var(--input-bg)", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "6px 10px", color: TEXT, fontSize: 13, fontFamily: "'Montserrat', sans-serif", outline: "none" }}
        onFocus={e => (e.target.style.borderColor = JADE_DIM)}
        onBlur={e => (e.target.style.borderColor = BORDER)}
      />
      {value && (
        <button onClick={() => onChange("")} style={{ ...btnStyle("transparent"), color: TEXT_DIM, border: `1px solid ${BORDER}`, fontSize: 11, padding: "5px 10px" }}>Clear</button>
      )}
    </div>
  );
}

function btnStyle(bg: string): React.CSSProperties {
  return { background: bg, border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "'Montserrat', sans-serif", fontWeight: 700, color: bg === "transparent" ? TEXT : "#06091a" };
}

const MD_COMPONENTS = {
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
  ),
};

function MarkdownToolbar({ textareaRef, onValue }: { textareaRef: React.RefObject<HTMLTextAreaElement | null>; onValue: (v: string) => void }) {
  function wrap(before: string, after: string, placeholder: string) {
    const ta = textareaRef.current;
    if (!ta) return;
    const s = ta.selectionStart, e = ta.selectionEnd;
    const sel = ta.value.slice(s, e) || placeholder;
    const next = ta.value.slice(0, s) + before + sel + after + ta.value.slice(e);
    onValue(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(s + before.length, s + before.length + sel.length);
    });
  }

  function insertLink() {
    const ta = textareaRef.current;
    if (!ta) return;
    const s = ta.selectionStart, e = ta.selectionEnd;
    const sel = ta.value.slice(s, e) || "text";
    const next = ta.value.slice(0, s) + `[${sel}](url)` + ta.value.slice(e);
    onValue(next);
    requestAnimationFrame(() => {
      ta.focus();
      const urlStart = s + 1 + sel.length + 2;
      ta.setSelectionRange(urlStart, urlStart + 3);
    });
  }

  const tbBtn: React.CSSProperties = {
    background: "var(--surface)", border: `1px solid ${BORDER}`, borderRadius: 6,
    color: TEXT_DIM, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700,
    padding: "3px 9px", lineHeight: 1.5, transition: "border-color 0.15s, color 0.15s",
  };

  return (
    <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
      <button type="button" style={{ ...tbBtn, fontWeight: 900 }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = TEXT; (e.currentTarget as HTMLButtonElement).style.borderColor = JADE_DIM; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = TEXT_DIM; (e.currentTarget as HTMLButtonElement).style.borderColor = BORDER; }}
        onClick={() => wrap("**", "**", "bold")}>B</button>
      <button type="button" style={{ ...tbBtn, fontStyle: "italic" }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = TEXT; (e.currentTarget as HTMLButtonElement).style.borderColor = JADE_DIM; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = TEXT_DIM; (e.currentTarget as HTMLButtonElement).style.borderColor = BORDER; }}
        onClick={() => wrap("*", "*", "italic")}>I</button>
      <button type="button" style={tbBtn}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = TEXT; (e.currentTarget as HTMLButtonElement).style.borderColor = JADE_DIM; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = TEXT_DIM; (e.currentTarget as HTMLButtonElement).style.borderColor = BORDER; }}
        onClick={() => wrap("# ", "", "Heading")}>H</button>
      <button type="button" style={tbBtn}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = TEXT; (e.currentTarget as HTMLButtonElement).style.borderColor = JADE_DIM; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = TEXT_DIM; (e.currentTarget as HTMLButtonElement).style.borderColor = BORDER; }}
        onClick={() => wrap("- ", "", "item")}>• List</button>
      <button type="button" style={tbBtn}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = TEXT; (e.currentTarget as HTMLButtonElement).style.borderColor = JADE_DIM; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = TEXT_DIM; (e.currentTarget as HTMLButtonElement).style.borderColor = BORDER; }}
        onClick={insertLink}>Link</button>
    </div>
  );
}
