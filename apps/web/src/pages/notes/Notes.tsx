import { useState, useEffect, useRef, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import ToolNav from "../../components/ToolNav";
import { Icon } from "../../components/Icon";
import { useHouseholdUid } from "../../household";
import ReactMarkdown from "react-markdown";
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, query, orderBy, setDoc,
} from "firebase/firestore";
import { db } from "../../firebase";
import StarField from "../../components/StarField";
import { WisdomCard, useDailyQuote } from "../../components/Wisdom";
import { usePrefs } from "../../prefs";
import GlobalHeader from "../../components/GlobalHeader";

// ── Types ─────────────────────────────────────────────────────────────────

interface Note {
  id: string;
  title: string;
  notes: string;
  completed: boolean;
  createdAt: number;
  completedAt?: number | null;
  dueDate?: string | null;
  isTodo?: boolean;
}

interface JournalEntry {
  date: string;
  morning: string;
  evening: string;
  updatedAt: number;
}

// ── Date helpers ─────────────────────────────────────────────────────────────

function dateToISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function isoToDate(iso: string): Date { return new Date(iso + "T12:00:00"); }
function addDays(iso: string, n: number): string {
  const d = isoToDate(iso); d.setDate(d.getDate() + n); return dateToISO(d);
}
function weekDaysFor(iso: string): string[] {
  const d = isoToDate(iso);
  const sun = new Date(d); sun.setDate(d.getDate() - d.getDay());
  return Array.from({length: 7}, (_, i) => { const nd = new Date(sun); nd.setDate(sun.getDate() + i); return dateToISO(nd); });
}
function navMonthISO(iso: string, n: number): string {
  const d = isoToDate(iso);
  const target = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const maxDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  return dateToISO(new Date(target.getFullYear(), target.getMonth(), Math.min(d.getDate(), maxDay)));
}

const J_MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const J_DAYS = ["Su","Mo","Tu","We","Th","Fr","Sa"];
const J_DAY_FULL = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const J_MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ── Due-date helpers ────────────────────────────────────────────────────────

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

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

function CompletedBadge({ completedAt }: { completedAt?: number | null }) {
  const label = completedAt
    ? (() => { const d = new Date(completedAt); return `completed ${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}-${String(d.getFullYear()).slice(2)}`; })()
    : "completed";
  return (
    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.4, color: "#5a8a6a", background: "#5a8a6a1a", border: "1px solid #5a8a6a33", borderRadius: 12, padding: "1px 7px", whiteSpace: "nowrap" }}>
      {label}
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
  const [searchParams] = useSearchParams();
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(() => searchParams.get("id"));
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftNotes, setDraftNotes] = useState("");
  const [draftDue, setDraftDue] = useState("");
  const [draftIsTodo, setDraftIsTodo] = useState(false);
  const [addingTitle, setAddingTitle] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showQuickTodo, setShowQuickTodo] = useState(false);
  const [quickTodoTitle, setQuickTodoTitle] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showAllDone, setShowAllDone] = useState(false);
  // Mobile: whether we're showing the detail view (true) or the list (false)
  const [mobileShowDetail, setMobileShowDetail] = useState(() => !!searchParams.get("id"));

  // ── Journal ──────────────────────────────────────────────────────────────
  const [mode, setMode] = useState<"notes" | "journal">("notes");
  const [journalDate, setJournalDate] = useState(() => todayISO());
  const [journalEntries, setJournalEntries] = useState<Map<string, JournalEntry>>(new Map());
  const [morningDraft, setMorningDraft] = useState("");
  const [eveningDraft, setEveningDraft] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const journalDateRef = useRef(journalDate);

  const isMobile = useIsMobile();
  const { prefs } = usePrefs();
  const showWisdom = prefs.wisdomPages.includes("notes");
  const todayQuote = useDailyQuote();

  const addInputRef = useRef<HTMLInputElement>(null);
  const quickTodoRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const selected = notes.find(t => t.id === selectedId) ?? null;
  const todos = notes
    .filter(t => !t.completed && (!!t.dueDate || !!t.isTodo))
    .sort((a, b) => {
      if (a.dueDate && b.dueDate) return a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0;
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return 0;
    });
  const plainNotes = notes
    .filter(t => !t.completed && !t.dueDate && !t.isTodo)
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
    if (showQuickTodo) quickTodoRef.current?.focus();
  }, [showQuickTodo]);

  useEffect(() => {
    if (editing) titleInputRef.current?.focus();
  }, [editing]);

  // On mobile, switching to detail view should close any open add inputs
  useEffect(() => {
    if (isMobile && mobileShowDetail) {
      setShowAdd(false);
      setAddingTitle("");
      setShowQuickTodo(false);
      setQuickTodoTitle("");
    }
  }, [isMobile, mobileShowDetail]);

  // Keep ref in sync so auto-save closure always uses current date
  useEffect(() => { journalDateRef.current = journalDate; }, [journalDate]);

  // Subscribe to all journal docs while in journal mode
  useEffect(() => {
    if (mode !== "journal") return;
    return onSnapshot(collection(db, "users", uid, "journal"), snap => {
      const map = new Map<string, JournalEntry>();
      snap.docs.forEach(d => map.set(d.id, d.data() as JournalEntry));
      setJournalEntries(map);
    }, err => console.error("journal", err));
  }, [uid, mode]);

  // Load drafts when navigating to a new date
  useEffect(() => {
    if (mode !== "journal") return;
    setSaveStatus("idle");
    const entry = journalEntries.get(journalDate);
    setMorningDraft(entry?.morning ?? "");
    setEveningDraft(entry?.evening ?? "");
  }, [journalDate, mode]); // eslint-disable-line

  // Once entries arrive from Firestore for the currently-viewed date, populate if drafts are still empty
  useEffect(() => {
    if (mode !== "journal") return;
    const entry = journalEntries.get(journalDate);
    if (!entry) return;
    setMorningDraft(prev => prev || entry.morning || "");
    setEveningDraft(prev => prev || entry.evening || "");
  }, [journalEntries]); // eslint-disable-line

  // Auto-save 1.5 s after the last keystroke
  useEffect(() => {
    if (mode !== "journal") return;
    if (!morningDraft.trim() && !eveningDraft.trim()) return;
    setSaveStatus("saving");
    const timer = setTimeout(() => {
      const date = journalDateRef.current;
      setDoc(doc(db, "users", uid, "journal", date), {
        date, morning: morningDraft, evening: eveningDraft, updatedAt: Date.now(),
      }).then(() => setSaveStatus("saved")).catch(console.error);
    }, 1500);
    return () => clearTimeout(timer);
  }, [morningDraft, eveningDraft, uid, mode]); // eslint-disable-line

  function openJournal() {
    setMode("journal");
    setSelectedId(null);
    setEditing(false);
    if (isMobile) setMobileShowDetail(false);
  }
  function navJournalDay(n: number) { setJournalDate(d => addDays(d, n)); }
  function navJournalWeek(n: number) { setJournalDate(d => addDays(d, n * 7)); }
  function navJournalMonth(n: number) { setJournalDate(d => navMonthISO(d, n)); }

  function selectNote(id: string) {
    if (editing) return;
    setMode("notes");
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
    setDraftIsTodo(!!selected.isTodo || !!selected.dueDate);
    setEditing(true);
    setConfirmDelete(false);
  }

  async function saveEdit() {
    if (!selected) return;
    const dueDate = draftDue.trim() || null;
    await updateDoc(doc(db, "users", uid, "notes", selected.id), {
      title: draftTitle.trim() || selected.title,
      notes: draftNotes,
      dueDate,
      isTodo: draftIsTodo || !!dueDate,
    });
    setEditing(false);
  }

  function cancelEdit() {
    setEditing(false);
  }

  async function toggleComplete(note: Note) {
    const completing = !note.completed;
    await updateDoc(doc(db, "users", uid, "notes", note.id), {
      completed: completing,
      completedAt: completing ? Date.now() : null,
    });
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

  async function addQuickTodo() {
    const title = quickTodoTitle.trim();
    if (!title) return;
    await addDoc(collection(db, "users", uid, "notes"), {
      title, notes: "", completed: false, createdAt: Date.now(), dueDate: todayISO(),
    });
    setQuickTodoTitle("");
    setShowQuickTodo(false);
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

  function handleQuickTodoKey(e: React.KeyboardEvent) {
    if (e.key === "Enter") addQuickTodo();
    if (e.key === "Escape") { setShowQuickTodo(false); setQuickTodoTitle(""); }
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
          <div style={{ position: "sticky", top: 0, zIndex: 100, background: "var(--panel)", backdropFilter: "blur(14px)", padding: "14px 20px", minHeight: 60, borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: 12, boxSizing: "border-box" }}>
            <Link to="/app" style={{ textDecoration: "none", color: TEXT_DIM, fontSize: 13, fontWeight: 600, opacity: 0.7, flexShrink: 0, transition: "opacity 0.15s", display: "flex", alignItems: "center", gap: 4 }}
              onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.opacity = "1"}
              onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.opacity = "0.7"}>
              <Icon name="chevronLeft" size={13} /> Home
            </Link>
            <div style={{ width: 1, height: 14, background: "var(--border)", flexShrink: 0 }} />
            <div style={{ minWidth: 0, flex: "1 1 auto" }}><ToolNav current="notes" /></div>
            <button onClick={() => { setShowAdd(true); setShowQuickTodo(false); setQuickTodoTitle(""); }}
              style={{ ...btnStyle(JADE), fontSize: 13, padding: "8px 16px", display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              + New Note
            </button>
            <GlobalHeader inline />
          </div>

          {/* ── LIST VIEW ── */}
          {!mobileShowDetail && mode === "notes" && (
            <div style={{ padding: "16px 16px 32px" }}>

              {showWisdom && (
                <div style={{ marginBottom: 20 }}>
                  <WisdomCard quote={todayQuote} compact />
                </div>
              )}

              {/* Journal entry */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: TEXT_MUTED, paddingLeft: 4, marginBottom: 8 }}>Journal</div>
                <div onClick={openJournal}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 14px", borderRadius: 14, background: SURFACE, border: `1px solid ${BORDER}`, cursor: "pointer" }}>
                  <Icon name="book" size={16} color={JADE} />
                  <span style={{ fontSize: 15, fontWeight: 600, color: TEXT }}>Daily Journal</span>
                  <span style={{ marginLeft: "auto", fontSize: 16, color: TEXT_MUTED }}>›</span>
                </div>
              </div>

              {/* TODO section */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: TEXT_MUTED, paddingLeft: 4, marginBottom: 8 }}>TODO</div>
                {showQuickTodo ? (
                  <div style={{ background: SURFACE, border: `1px solid ${JADE}55`, borderRadius: 14, padding: "12px 14px", marginBottom: 8, display: "flex", gap: 8, alignItems: "center" }}>
                    <Icon name="check" size={16} color={JADE} />
                    <input
                      ref={quickTodoRef}
                      value={quickTodoTitle}
                      onChange={e => setQuickTodoTitle(e.target.value)}
                      onKeyDown={handleQuickTodoKey}
                      placeholder="New todo…"
                      style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: TEXT, fontSize: 15, fontFamily: "'Montserrat', sans-serif" }}
                    />
                    <button onClick={addQuickTodo} disabled={!quickTodoTitle.trim()}
                      style={{ ...btnStyle(JADE), padding: "7px 16px", fontSize: 13, opacity: quickTodoTitle.trim() ? 1 : 0.5 }}>Add</button>
                    <button onClick={() => { setShowQuickTodo(false); setQuickTodoTitle(""); }}
                      style={{ ...btnStyle("transparent"), color: TEXT_DIM, padding: "7px 8px", display: "flex", alignItems: "center" }}><Icon name="x" size={14} /></button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setShowQuickTodo(true); setShowAdd(false); setAddingTitle(""); }}
                    style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", padding: "12px 14px", borderRadius: 14, cursor: "pointer", fontFamily: "'Montserrat', sans-serif", fontSize: 14, fontWeight: 600, color: TEXT_DIM, background: "transparent", border: `1px dashed ${BORDER}`, marginBottom: 8, transition: "all 0.15s" }}
                    onTouchStart={e => { e.currentTarget.style.borderColor = JADE; e.currentTarget.style.color = JADE; }}
                    onTouchEnd={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = TEXT_DIM; }}>
                    <Icon name="plus" size={15} color="currentColor" /> Add a todo
                  </button>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {todos.map(note => (
                    <MobileNoteItem key={note.id} note={note} onSelect={() => selectNote(note.id)} onToggle={() => toggleComplete(note)} />
                  ))}
                </div>
              </div>

              {/* Notes section */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: TEXT_MUTED, paddingLeft: 4, marginBottom: 8 }}>Notes</div>
                {showAdd ? (
                  <div style={{ background: SURFACE, border: `1px solid ${BORDER_ACCENT}`, borderRadius: 14, padding: "12px 14px", marginBottom: 8, display: "flex", gap: 8, alignItems: "center" }}>
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
                      style={{ ...btnStyle("transparent"), color: TEXT_DIM, padding: "7px 8px", display: "flex", alignItems: "center" }}><Icon name="x" size={14} /></button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setShowAdd(true); setShowQuickTodo(false); setQuickTodoTitle(""); }}
                    style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", padding: "12px 14px", borderRadius: 14, cursor: "pointer", fontFamily: "'Montserrat', sans-serif", fontSize: 14, fontWeight: 600, color: TEXT_DIM, background: "transparent", border: `1px dashed ${BORDER}`, marginBottom: 8, transition: "all 0.15s" }}
                    onTouchStart={e => { e.currentTarget.style.borderColor = JADE; e.currentTarget.style.color = JADE; }}
                    onTouchEnd={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = TEXT_DIM; }}>
                    <Icon name="plus" size={15} color="currentColor" /> Add a note
                  </button>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {plainNotes.map(note => (
                    <MobileNoteItem key={note.id} note={note} onSelect={() => selectNote(note.id)} />
                  ))}
                  {plainNotes.length === 0 && !showAdd && (
                    <div style={{ color: TEXT_MUTED, fontSize: 13, padding: "4px 4px 12px", fontStyle: "italic" }}>No notes yet.</div>
                  )}
                </div>
              </div>

              {done.length > 0 && (
                <div style={{ marginTop: 24 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: TEXT_MUTED, paddingLeft: 4, marginBottom: 8 }}>Done</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {(showAllDone ? done : done.slice(0, 10)).map(note => (
                      <MobileNoteItem key={note.id} note={note} onSelect={() => selectNote(note.id)} />
                    ))}
                  </div>
                  {done.length > 10 && (
                    <button onClick={() => setShowAllDone(v => !v)}
                      style={{ marginTop: 8, fontSize: 12, color: TEXT_DIM, background: "transparent", border: "none", cursor: "pointer", padding: "4px 4px", fontFamily: "'Montserrat', sans-serif" }}>
                      {showAllDone ? "Show less" : `Show ${done.length - 10} more…`}
                    </button>
                  )}
                </div>
              )}

            </div>
          )}

          {/* ── JOURNAL VIEW (mobile) ── */}
          {mode === "journal" && !mobileShowDetail && (
            <div style={{ padding: "16px 16px 40px" }}>
              <div style={{ display: "flex", alignItems: "center", marginBottom: 20 }}>
                <button onClick={() => setMode("notes")}
                  style={{ ...btnStyle("transparent"), color: TEXT_DIM, fontSize: 13, fontWeight: 600, padding: "8px 0", display: "flex", alignItems: "center", gap: 6 }}>
                  <Icon name="chevronLeft" size={13} /> Back
                </button>
              </div>
              <JournalPanel
                date={journalDate} entries={journalEntries}
                morningDraft={morningDraft} eveningDraft={eveningDraft} saveStatus={saveStatus}
                onMorning={v => setMorningDraft(v)} onEvening={v => setEveningDraft(v)}
                onNavDay={navJournalDay} onNavWeek={navJournalWeek} onNavMonth={navJournalMonth}
                onToday={() => setJournalDate(todayISO())} onSelectDate={setJournalDate}
              />
            </div>
          )}

          {/* ── DETAIL VIEW ── */}
          {mode === "notes" && mobileShowDetail && selected && (
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
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <button
                      onClick={() => { setDraftIsTodo(v => !v); if (draftIsTodo) setDraftDue(""); }}
                      style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: `1.5px solid ${draftIsTodo ? JADE : BORDER}`, borderRadius: 8, padding: "6px 12px", cursor: "pointer", color: draftIsTodo ? JADE : TEXT_DIM, fontSize: 13, fontWeight: 700, fontFamily: "'Montserrat', sans-serif" }}
                    >
                      <Icon name="check" size={14} />
                      {draftIsTodo ? "Is a todo" : "Make todo"}
                    </button>
                    {draftIsTodo && <DueDateEditor value={draftDue} onChange={setDraftDue} style={{}} />}
                  </div>
                </>
              ) : (
                <div style={{ marginBottom: 20 }}>
                  <h2 style={{ fontSize: 22, fontWeight: 700, color: selected.completed ? TEXT_MUTED : TEXT, textDecoration: selected.completed ? "line-through" : "none", margin: 0, lineHeight: 1.3 }}>
                    {selected.title}
                  </h2>
                  <div style={{ marginTop: 8 }}>
                    {selected.completed
                      ? <CompletedBadge completedAt={selected.completedAt} />
                      : selected.dueDate && <DueBadge iso={selected.dueDate} />}
                  </div>
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

        {/* Header bar */}
        <div style={{ position: "sticky", top: 0, zIndex: 100, background: "var(--panel)", backdropFilter: "blur(14px)", padding: "14px 20px", minHeight: 60, borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: 12, boxSizing: "border-box" }}>
          <Link to="/app" style={{ textDecoration: "none", color: TEXT_DIM, fontSize: 13, fontWeight: 600, opacity: 0.7, flexShrink: 0, transition: "opacity 0.15s", display: "flex", alignItems: "center", gap: 4 }}
            onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.opacity = "1"}
            onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.opacity = "0.7"}>
            <Icon name="chevronLeft" size={13} /> Home
          </Link>
          <div style={{ width: 1, height: 14, background: "var(--border)", flexShrink: 0 }} />
          <div style={{ minWidth: 0, flex: "1 1 auto" }}><ToolNav current="notes" /></div>
          <button onClick={() => { setShowAdd(true); setShowQuickTodo(false); setQuickTodoTitle(""); }}
            style={{ ...btnStyle(JADE), fontSize: 13, padding: "8px 16px", display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            + New Note
          </button>
          <GlobalHeader inline />
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

            {/* Journal nav */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: TEXT_MUTED, paddingLeft: 4, marginBottom: 6 }}>Journal</div>
              <div onClick={openJournal}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 10, background: mode === "journal" ? SURFACE_SELECTED : SURFACE, border: `1px solid ${mode === "journal" ? BORDER_ACCENT : "transparent"}`, cursor: "pointer", transition: "all 0.15s" }}
                onMouseEnter={e => { if (mode !== "journal") (e.currentTarget as HTMLDivElement).style.background = SURFACE_HOVER; }}
                onMouseLeave={e => { if (mode !== "journal") (e.currentTarget as HTMLDivElement).style.background = SURFACE; }}>
                <Icon name="book" size={16} color={mode === "journal" ? JADE : TEXT_DIM} />
                <span style={{ fontSize: 13, fontWeight: 600, color: mode === "journal" ? JADE : TEXT }}>Daily Journal</span>
              </div>
            </div>

            {/* TODO section */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: TEXT_MUTED, paddingLeft: 4, marginBottom: 6 }}>TODO</div>
              {showQuickTodo ? (
                <div style={{ background: SURFACE, border: `1px solid ${JADE}55`, borderRadius: 12, padding: "10px 14px", marginBottom: 6, display: "flex", gap: 8, alignItems: "center" }}>
                  <Icon name="check" size={14} color={JADE} />
                  <input
                    ref={quickTodoRef}
                    value={quickTodoTitle}
                    onChange={e => setQuickTodoTitle(e.target.value)}
                    onKeyDown={handleQuickTodoKey}
                    placeholder="New todo…"
                    style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: TEXT, fontSize: 14, fontFamily: "'Montserrat', sans-serif" }}
                  />
                  <button onClick={addQuickTodo} disabled={!quickTodoTitle.trim()}
                    style={{ ...btnStyle(JADE), padding: "4px 12px", fontSize: 12, opacity: quickTodoTitle.trim() ? 1 : 0.5 }}>Add</button>
                  <button onClick={() => { setShowQuickTodo(false); setQuickTodoTitle(""); }}
                    style={{ ...btnStyle("transparent"), color: TEXT_DIM, padding: "4px 8px", fontSize: 12, display: "flex", alignItems: "center" }}><Icon name="x" size={14} /></button>
                </div>
              ) : (
                <button
                  onClick={() => { setShowQuickTodo(true); setShowAdd(false); setAddingTitle(""); }}
                  style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", padding: "9px 12px", borderRadius: 10, cursor: "pointer", fontFamily: "'Montserrat', sans-serif", fontSize: 12, fontWeight: 600, color: TEXT_DIM, background: "transparent", border: `1px dashed ${BORDER}`, marginBottom: 6, transition: "all 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = JADE; e.currentTarget.style.color = JADE; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = TEXT_DIM; }}>
                  <Icon name="plus" size={13} color="currentColor" /> Add a todo
                </button>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {todos.map(note => (
                  <NoteItem key={note.id} note={note} selected={selectedId === note.id} onSelect={() => selectNote(note.id)} onToggle={() => toggleComplete(note)} />
                ))}
              </div>
            </div>

            {/* Notes section */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: TEXT_MUTED, paddingLeft: 4, marginBottom: 6 }}>Notes</div>
              {showAdd ? (
                <div style={{ background: SURFACE, border: `1px solid ${BORDER_ACCENT}`, borderRadius: 12, padding: "10px 14px", marginBottom: 6, display: "flex", gap: 8, alignItems: "center" }}>
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
              ) : (
                <button
                  onClick={() => { setShowAdd(true); setShowQuickTodo(false); setQuickTodoTitle(""); }}
                  style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", padding: "9px 12px", borderRadius: 10, cursor: "pointer", fontFamily: "'Montserrat', sans-serif", fontSize: 12, fontWeight: 600, color: TEXT_DIM, background: "transparent", border: `1px dashed ${BORDER}`, marginBottom: 6, transition: "all 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = JADE; e.currentTarget.style.color = JADE; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = TEXT_DIM; }}>
                  <Icon name="plus" size={13} color="currentColor" /> Add a note
                </button>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {plainNotes.map(note => (
                  <NoteItem key={note.id} note={note} selected={selectedId === note.id} onSelect={() => selectNote(note.id)} />
                ))}
                {plainNotes.length === 0 && !showAdd && (
                  <div style={{ color: TEXT_MUTED, fontSize: 12, padding: "4px 4px 8px", fontStyle: "italic" }}>No notes yet.</div>
                )}
              </div>
            </div>

            {done.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: TEXT_MUTED, paddingLeft: 4, marginBottom: 6 }}>Done</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {(showAllDone ? done : done.slice(0, 10)).map(note => (
                    <NoteItem key={note.id} note={note} selected={selectedId === note.id} onSelect={() => selectNote(note.id)} />
                  ))}
                </div>
                {done.length > 10 && (
                  <button onClick={() => setShowAllDone(v => !v)}
                    style={{ marginTop: 6, fontSize: 11, color: TEXT_DIM, background: "transparent", border: "none", cursor: "pointer", padding: "4px 4px", fontFamily: "'Montserrat', sans-serif" }}>
                    {showAllDone ? "Show less" : `Show ${done.length - 10} more…`}
                  </button>
                )}
              </div>
            )}

          </div>

          {/* Detail / Journal panel */}
          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: mode === "journal" ? "24px 28px" : "28px 32px", minHeight: 400, display: "flex", flexDirection: "column" }}>
            {mode === "journal" ? (
              <JournalPanel
                date={journalDate} entries={journalEntries}
                morningDraft={morningDraft} eveningDraft={eveningDraft} saveStatus={saveStatus}
                onMorning={v => setMorningDraft(v)} onEvening={v => setEveningDraft(v)}
                onNavDay={navJournalDay} onNavWeek={navJournalWeek} onNavMonth={navJournalMonth}
                onToday={() => setJournalDate(todayISO())} onSelectDate={setJournalDate}
              />
            ) : selected ? (
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
  const showCheckbox = !!note.dueDate || !!note.isTodo || note.completed;

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
  const showCheckbox = !!note.dueDate || !!note.isTodo || note.completed;

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
            <div style={{ marginTop: 8 }}>
              {note.completed
                ? <CompletedBadge completedAt={note.completedAt} />
                : note.dueDate && <DueBadge iso={note.dueDate} />}
            </div>
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

// ── JournalMonthPicker ────────────────────────────────────────────────────────

function JournalMonthPicker({ year, month, onPick }: { year: number; month: number; onPick: (y: number, m: number) => void }) {
  const [navYear, setNavYear] = useState(year);
  const today = useMemo(() => new Date(), []);
  return (
    <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 300, width: 224, background: "var(--panel)", border: `1px solid ${BORDER}`, borderRadius: 14, padding: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.55)", backdropFilter: "blur(16px)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <button onClick={() => setNavYear(y => y - 1)} style={{ background: "transparent", border: `1px solid ${BORDER}`, borderRadius: 7, color: TEXT_DIM, fontSize: 13, width: 26, height: 26, cursor: "pointer", fontFamily: "'Montserrat',sans-serif" }}>‹</button>
        <span style={{ fontSize: 14, fontWeight: 800, color: TEXT }}>{navYear}</span>
        <button onClick={() => setNavYear(y => y + 1)} style={{ background: "transparent", border: `1px solid ${BORDER}`, borderRadius: 7, color: TEXT_DIM, fontSize: 13, width: 26, height: 26, cursor: "pointer", fontFamily: "'Montserrat',sans-serif" }}>›</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
        {J_MONTH_SHORT.map((m, i) => {
          const selected = navYear === year && i === month;
          const isNow = navYear === today.getFullYear() && i === today.getMonth();
          return (
            <button key={m} onClick={() => onPick(navYear, i)}
              style={{ padding: "8px 0", borderRadius: 8, cursor: "pointer", fontFamily: "'Montserrat',sans-serif", fontSize: 12, fontWeight: 700, background: selected ? JADE : "transparent", color: selected ? "#06091a" : isNow ? JADE : TEXT_DIM, border: `1px solid ${selected ? JADE : isNow ? JADE + "55" : BORDER}`, transition: "all 0.12s" }}
              onMouseEnter={e => { if (!selected) (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-hi)"; }}
              onMouseLeave={e => { if (!selected) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}>
              {m}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── JournalPanel ──────────────────────────────────────────────────────────────

function JournalPanel({ date, entries, morningDraft, eveningDraft, saveStatus, onMorning, onEvening, onNavDay, onNavWeek, onNavMonth, onToday, onSelectDate }: {
  date: string;
  entries: Map<string, JournalEntry>;
  morningDraft: string;
  eveningDraft: string;
  saveStatus: "idle" | "saving" | "saved";
  onMorning: (v: string) => void;
  onEvening: (v: string) => void;
  onNavDay: (n: number) => void;
  onNavWeek: (n: number) => void;
  onNavMonth: (n: number) => void;
  onToday: () => void;
  onSelectDate: (iso: string) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const today = todayISO();
  const week = weekDaysFor(date);
  const d = isoToDate(date);
  const dayLabel = `${J_DAY_FULL[d.getDay()]}, ${J_MONTH_SHORT[d.getMonth()]} ${d.getDate()}`;

  useEffect(() => {
    if (!pickerOpen) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [pickerOpen]);

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 0 }}>

      {/* Month picker row */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <div ref={pickerRef} style={{ position: "relative" }}>
          <button onClick={() => setPickerOpen(o => !o)}
            style={{ display: "flex", alignItems: "center", gap: 4, background: pickerOpen ? "var(--surface-hi)" : "transparent", border: `1px solid ${pickerOpen ? "var(--border-hi)" : "transparent"}`, borderRadius: 8, padding: "3px 7px", cursor: "pointer", fontFamily: "'Montserrat',sans-serif", transition: "all 0.15s" }}
            onMouseEnter={e => { if (!pickerOpen) (e.currentTarget as HTMLButtonElement).style.background = "var(--surface)"; }}
            onMouseLeave={e => { if (!pickerOpen) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: TEXT }}>{J_MONTH_SHORT[d.getMonth()]} {d.getFullYear()}</span>
            <span style={{ fontSize: 9, color: TEXT_DIM, lineHeight: 1 }}>▾</span>
          </button>
          {pickerOpen && (
            <JournalMonthPicker year={d.getFullYear()} month={d.getMonth()} onPick={(y, m) => { onNavMonth(0); onSelectDate(`${y}-${String(m + 1).padStart(2, "0")}-${String(Math.min(d.getDate(), new Date(y, m + 1, 0).getDate())).padStart(2, "0")}`); setPickerOpen(false); }} />
          )}
        </div>
        <div style={{ flex: 1 }} />
        {date !== today && (
          <button onClick={onToday} style={{ ...btnStyle("transparent"), fontSize: 11, padding: "4px 10px", border: `1px solid ${BORDER}`, color: TEXT_DIM, transition: "all 0.15s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = JADE; (e.currentTarget as HTMLButtonElement).style.borderColor = JADE_DIM; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = TEXT_DIM; (e.currentTarget as HTMLButtonElement).style.borderColor = BORDER; }}>
            Today
          </button>
        )}
      </div>

      {/* Week strip */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 18 }}>
        <button onClick={() => onNavWeek(-1)} style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 7, cursor: "pointer", color: TEXT_DIM, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "border-color 0.15s, color 0.15s" }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = TEXT; (e.currentTarget as HTMLButtonElement).style.borderColor = JADE_DIM; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = TEXT_DIM; (e.currentTarget as HTMLButtonElement).style.borderColor = BORDER; }}>
          <Icon name="chevronLeft" size={12} color="currentColor" />
        </button>
        <div style={{ flex: 1, display: "flex", justifyContent: "space-between" }}>
          {week.map((wd, i) => {
            const isSelected = wd === date;
            const isToday = wd === today;
            const hasEntry = entries.has(wd);
            const dayNum = isoToDate(wd).getDate();
            return (
              <div key={wd} onClick={() => onSelectDate(wd)}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "6px 0", minWidth: 32, cursor: "pointer", borderRadius: 8, background: isSelected ? JADE : "transparent", transition: "background 0.12s" }}>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: isSelected ? "#fff" : isToday ? JADE : TEXT_MUTED }}>{J_DAYS[i]}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: isSelected ? "#fff" : isToday ? JADE : TEXT }}>{dayNum}</span>
                <span style={{ width: 4, height: 4, borderRadius: "50%", background: hasEntry ? (isSelected ? "rgba(255,255,255,0.7)" : JADE) : "transparent" }} />
              </div>
            );
          })}
        </div>
        <button onClick={() => onNavWeek(1)} style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 7, cursor: "pointer", color: TEXT_DIM, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "border-color 0.15s, color 0.15s" }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = TEXT; (e.currentTarget as HTMLButtonElement).style.borderColor = JADE_DIM; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = TEXT_DIM; (e.currentTarget as HTMLButtonElement).style.borderColor = BORDER; }}>
          <Icon name="chevronRight" size={12} color="currentColor" />
        </button>
      </div>

      {/* Day label */}
      <div style={{ fontSize: 12, fontWeight: 700, color: TEXT_DIM, marginBottom: 16, paddingBottom: 14, borderBottom: `1px solid ${BORDER}` }}>
        {dayLabel}
      </div>

      {/* Morning */}
      <div style={{ marginBottom: 20, flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: TEXT_MUTED, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="sun" size={13} color={TEXT_MUTED} /> Morning
        </div>
        <textarea
          value={morningDraft}
          onChange={e => onMorning(e.target.value)}
          placeholder={"What are you grateful for?\nWhat's your intention for today?\nWhat would make today great?"}
          style={{ flex: 1, background: "var(--input-bg)", border: `1px solid ${BORDER}`, borderRadius: 10, padding: "12px 14px", color: TEXT, fontSize: 13, fontFamily: "ui-monospace, 'SF Mono', 'Fira Mono', monospace", lineHeight: 1.7, resize: "none", outline: "none", minHeight: 120, transition: "border-color 0.15s", width: "100%", boxSizing: "border-box" }}
          onFocus={e => (e.target.style.borderColor = JADE_DIM)}
          onBlur={e => (e.target.style.borderColor = BORDER)}
        />
      </div>

      {/* Evening */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: TEXT_MUTED, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="moon" size={13} color={TEXT_MUTED} /> Evening
        </div>
        <textarea
          value={eveningDraft}
          onChange={e => onEvening(e.target.value)}
          placeholder={"What went well today?\nWhat did you learn?\nWhat would you do differently?"}
          style={{ flex: 1, background: "var(--input-bg)", border: `1px solid ${BORDER}`, borderRadius: 10, padding: "12px 14px", color: TEXT, fontSize: 13, fontFamily: "ui-monospace, 'SF Mono', 'Fira Mono', monospace", lineHeight: 1.7, resize: "none", outline: "none", minHeight: 120, transition: "border-color 0.15s", width: "100%", boxSizing: "border-box" }}
          onFocus={e => (e.target.style.borderColor = JADE_DIM)}
          onBlur={e => (e.target.style.borderColor = BORDER)}
        />
      </div>

      {/* Save status */}
      <div style={{ marginTop: 10, fontSize: 11, color: TEXT_MUTED, textAlign: "right", minHeight: 16, transition: "opacity 0.3s", opacity: saveStatus === "idle" ? 0 : 1 }}>
        {saveStatus === "saving" ? "Saving…" : "Saved"}
      </div>
    </div>
  );
}
