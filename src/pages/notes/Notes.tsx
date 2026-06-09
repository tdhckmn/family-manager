import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import ToolNav from "../../components/ToolNav";
import { useAuth } from "../../auth";
import ReactMarkdown from "react-markdown";
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, query, orderBy,
} from "firebase/firestore";
import { db } from "../../firebase";
import StarField from "../../components/StarField";

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
const SURFACE_SELECTED = "rgba(93,184,138,0.10)";
const BORDER = "var(--border)";
const BORDER_ACCENT = "rgba(93,184,138,0.35)";
const JADE = "#5db88a";
const JADE_DIM = "#3d8a62";
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
  const uid = useAuth().uid;
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

  const addInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const selected = notes.find(t => t.id === selectedId) ?? null;
  // Open notes: dated ones first (soonest/overdue at top), then undated in created order.
  const open = notes.filter(t => !t.completed).sort((a, b) => {
    if (a.dueDate && b.dueDate) return a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0;
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return 0;
  });
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

          {/* Header bar */}
          <div style={{ padding: "14px 16px", minHeight: 60, borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: 12, boxSizing: "border-box" }}>
            <Link to="/" style={{ textDecoration: "none", color: TEXT_DIM, fontSize: 13, fontWeight: 600, opacity: 0.7, flexShrink: 0, transition: "opacity 0.15s" }}
              onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.opacity = "1"}
              onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.opacity = "0.7"}>
              ← Home
            </Link>
            <div style={{ width: 1, height: 14, background: "var(--border)", flexShrink: 0 }} />
            <ToolNav current="notes" />
          </div>

          {/* ── LIST VIEW ── */}
          {!mobileShowDetail && (
            <div style={{ padding: "16px 16px 100px" }}>

              {/* Inline add input */}
              {showAdd && (
                <div style={{ background: SURFACE, border: `1px solid ${BORDER_ACCENT}`, borderRadius: 14, padding: "12px 14px", marginTop: 16, display: "flex", gap: 8, alignItems: "center" }}>
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
                    style={{ ...btnStyle("transparent"), color: TEXT_DIM, padding: "7px 8px", fontSize: 16, lineHeight: 1 }}>✕</button>
                </div>
              )}

              {/* Note list */}
              <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 6 }}>
                {open.map(note => (
                  <MobileNoteItem key={note.id} note={note} onSelect={() => selectNote(note.id)} onToggle={() => toggleComplete(note)} />
                ))}
                {open.length === 0 && !showAdd && (
                  <div style={{ color: TEXT_MUTED, fontSize: 13, padding: "12px 4px", fontStyle: "italic" }}>All clear ✓</div>
                )}
              </div>

              {done.length > 0 && (
                <div style={{ marginTop: 24 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: TEXT_MUTED, paddingLeft: 4, marginBottom: 8 }}>Done</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {done.map(note => (
                      <MobileNoteItem key={note.id} note={note} onSelect={() => selectNote(note.id)} onToggle={() => toggleComplete(note)} />
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
                  ← Back
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
                          <button onClick={() => setConfirmDelete(false)} style={{ ...btnStyle("transparent"), color: TEXT_DIM, border: `1px solid ${BORDER}`, fontSize: 13, padding: "8px 12px" }}>✕</button>
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
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ fontSize: 11, color: TEXT_MUTED, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>
                    Notes · Markdown
                  </div>
                  <textarea
                    value={draftNotes}
                    onChange={e => setDraftNotes(e.target.value)}
                    onKeyDown={handleEditKey}
                    placeholder={"# Heading\n\nWrite **markdown** here…\n\n- List item\n- Another item"}
                    style={{ background: "rgba(0,0,0,0.25)", border: `1px solid ${BORDER}`, borderRadius: 10, padding: "14px 16px", color: TEXT, fontSize: 14, fontFamily: "ui-monospace, 'SF Mono', 'Fira Mono', monospace", lineHeight: 1.7, resize: "none", outline: "none", minHeight: 280, width: "100%", boxSizing: "border-box" }}
                    onFocus={e => (e.target.style.borderColor = JADE_DIM)}
                    onBlur={e => (e.target.style.borderColor = BORDER)}
                  />
                  <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 2 }}>⌘↩ to save · Esc to cancel</div>
                </div>
              ) : (
                <div style={{ flex: 1, overflow: "auto" }}>
                  {selected.notes.trim() ? (
                    <div className="md-view">
                      <ReactMarkdown>{selected.notes}</ReactMarkdown>
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

          {/* Floating Add button (list view only) */}
          {!mobileShowDetail && !showAdd && (
            <button
              onClick={() => setShowAdd(true)}
              style={{
                position: "fixed", bottom: 28, right: 20, zIndex: 10,
                width: 56, height: 56, borderRadius: "50%",
                background: JADE, border: "none",
                color: "#06091a", fontSize: 28, fontWeight: 700,
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 4px 20px rgba(93,184,138,0.4)",
                fontFamily: "'Montserrat', sans-serif",
              }}
            >
              +
            </button>
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

        {/* Header bar */}
        <div style={{ padding: "14px 24px", minHeight: 60, borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: 12, boxSizing: "border-box" }}>
          <Link to="/" style={{ textDecoration: "none", color: TEXT_DIM, fontSize: 13, fontWeight: 600, opacity: 0.7, flexShrink: 0, transition: "opacity 0.15s" }}
            onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.opacity = "1"}
            onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.opacity = "0.7"}>
            ← Home
          </Link>
          <div style={{ width: 1, height: 14, background: "var(--border)", flexShrink: 0 }} />
          <ToolNav current="notes" />
        </div>

        <div style={{ maxWidth: 1200, margin: "0 auto", width: "100%", padding: "24px 20px", display: "flex", flexDirection: "column", flex: 1 }}>

        <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20, flex: 1, marginTop: 24 }}>

          {/* Sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {showAdd ? (
              <div style={{ background: SURFACE, border: `1px solid ${BORDER_ACCENT}`, borderRadius: 12, padding: "10px 14px", marginBottom: 8, display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  ref={addInputRef}
                  value={addingTitle}
                  onChange={e => setAddingTitle(e.target.value)}
                  onKeyDown={handleAddKey}
                  placeholder="Note title…"
                  style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: TEXT, fontSize: 14, fontFamily: "'Montserrat', sans-serif" }}
                />
                <button onClick={addNote} style={{ ...btnStyle(JADE), padding: "4px 12px", fontSize: 12 }}>Add</button>
                <button onClick={() => { setShowAdd(false); setAddingTitle(""); }} style={{ ...btnStyle("transparent"), color: TEXT_DIM, padding: "4px 8px", fontSize: 12 }}>✕</button>
              </div>
            ) : (
              <button
                onClick={() => setShowAdd(true)}
                style={{ ...btnStyle("transparent"), border: `1px dashed ${BORDER}`, borderRadius: 12, padding: "10px 14px", marginBottom: 8, textAlign: "left", color: TEXT_DIM, fontSize: 13, display: "flex", alignItems: "center", gap: 8, transition: "all 0.15s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = JADE_DIM; (e.currentTarget as HTMLButtonElement).style.color = JADE; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = BORDER; (e.currentTarget as HTMLButtonElement).style.color = TEXT_DIM; }}>
                <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> New note
              </button>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {open.map(note => (
                <NoteItem key={note.id} note={note} selected={selectedId === note.id} onSelect={() => selectNote(note.id)} onToggle={() => toggleComplete(note)} />
              ))}
              {open.length === 0 && !showAdd && (
                <div style={{ color: TEXT_MUTED, fontSize: 12, padding: "8px 4px", fontStyle: "italic" }}>All clear.</div>
              )}
            </div>

            {done.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: TEXT_MUTED, paddingLeft: 4, marginBottom: 6 }}>Done</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {done.map(note => (
                    <NoteItem key={note.id} note={note} selected={selectedId === note.id} onSelect={() => selectNote(note.id)} onToggle={() => toggleComplete(note)} />
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
  onToggle: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const bg = selected ? SURFACE_SELECTED : hovered ? SURFACE_HOVER : SURFACE;
  const border = selected ? BORDER_ACCENT : "transparent";

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", borderRadius: 10, background: bg, border: `1px solid ${border}`, cursor: "pointer", transition: "all 0.15s" }}>
      <button
        onClick={e => { e.stopPropagation(); onToggle(); }}
        style={{ flexShrink: 0, width: 18, height: 18, marginTop: 1, borderRadius: 5, border: `1.5px solid ${note.completed ? JADE : "var(--border-hi)"}`, background: note.completed ? JADE : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s", padding: 0 }}>
        {note.completed && <span style={{ color: "#06091a", fontSize: 11, lineHeight: 1, fontWeight: 700 }}>✓</span>}
      </button>
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
  onToggle: () => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 14px", borderRadius: 14, background: SURFACE, border: `1px solid ${BORDER}`, cursor: "pointer", transition: "background 0.15s" }}
      onTouchStart={e => (e.currentTarget as HTMLDivElement).style.background = SURFACE_HOVER}
      onTouchEnd={e => (e.currentTarget as HTMLDivElement).style.background = SURFACE}
    >
      {/* Checkbox — large touch target via padding */}
      <button
        onClick={e => { e.stopPropagation(); onToggle(); }}
        style={{ flexShrink: 0, width: 24, height: 24, borderRadius: 7, border: `2px solid ${note.completed ? JADE : "var(--border-hi)"}`, background: note.completed ? JADE : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
        {note.completed && <span style={{ color: "#06091a", fontSize: 14, lineHeight: 1, fontWeight: 700 }}>✓</span>}
      </button>

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
                  <button onClick={onDeleteCancel} style={{ ...btnStyle("transparent"), color: TEXT_DIM, border: `1px solid ${BORDER}`, fontSize: 12, padding: "5px 10px" }}>✕</button>
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
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 11, color: TEXT_MUTED, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>
            Notes · Markdown <span style={{ marginLeft: 8, opacity: 0.6, fontWeight: 400, letterSpacing: 0, textTransform: "none" }}>⌘↩ to save · Esc to cancel</span>
          </div>
          <textarea
            value={draftNotes}
            onChange={e => onDraftNotes(e.target.value)}
            onKeyDown={onEditKey}
            placeholder={"# Heading\n\nWrite **markdown** here…\n\n- List item\n- Another item"}
            style={{ flex: 1, background: "rgba(0,0,0,0.25)", border: `1px solid ${BORDER}`, borderRadius: 10, padding: "14px 16px", color: TEXT, fontSize: 13, fontFamily: "ui-monospace, 'SF Mono', 'Fira Mono', monospace", lineHeight: 1.7, resize: "none", outline: "none", minHeight: 320, transition: "border-color 0.15s" }}
            onFocus={e => (e.target.style.borderColor = JADE_DIM)}
            onBlur={e => (e.target.style.borderColor = BORDER)}
          />
        </div>
      ) : (
        <div style={{ flex: 1, overflow: "auto" }}>
          {note.notes.trim() ? (
            <div className="md-view">
              <ReactMarkdown>{note.notes}</ReactMarkdown>
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
        style={{ background: "rgba(0,0,0,0.25)", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "6px 10px", color: TEXT, fontSize: 13, fontFamily: "'Montserrat', sans-serif", outline: "none", colorScheme: "dark" }}
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
