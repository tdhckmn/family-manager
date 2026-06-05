import { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, query, orderBy,
} from "firebase/firestore";
import { db } from "../../firebase";

// ── Wisdom ────────────────────────────────────────────────────────────────

const WISDOM = [
  { text: "You have power over your mind, not outside events. Realize this, and you will find strength.", author: "Marcus Aurelius", tradition: "Stoic" },
  { text: "Nature does not hurry, yet everything is accomplished.", author: "Lao Tzu", tradition: "Taoist" },
  { text: "Waste no more time arguing about what a good man should be. Be one.", author: "Marcus Aurelius", tradition: "Stoic" },
  { text: "Knowing others is wisdom. Knowing yourself is enlightenment.", author: "Lao Tzu", tradition: "Taoist" },
  { text: "The happiness of your life depends upon the quality of your thoughts.", author: "Marcus Aurelius", tradition: "Stoic" },
  { text: "When you realize there is nothing lacking, the whole world belongs to you.", author: "Lao Tzu", tradition: "Taoist" },
  { text: "Be tolerant with others and strict with yourself.", author: "Marcus Aurelius", tradition: "Stoic" },
  { text: "Life is a series of natural and spontaneous changes. Don't resist them.", author: "Lao Tzu", tradition: "Taoist" },
  { text: "You become what you give your attention to.", author: "Epictetus", tradition: "Stoic" },
  { text: "To the mind that is still, the whole universe surrenders.", author: "Lao Tzu", tradition: "Taoist" },
  { text: "Wealth consists not in having great possessions, but in having few wants.", author: "Epictetus", tradition: "Stoic" },
  { text: "Do you have the patience to wait until your mud settles and the water is clear?", author: "Lao Tzu", tradition: "Taoist" },
  { text: "Receive without pride, relinquish without struggle.", author: "Marcus Aurelius", tradition: "Stoic" },
  { text: "Simplicity, patience, compassion. These three are your greatest treasures.", author: "Lao Tzu", tradition: "Taoist" },
  { text: "No man is free who is not master of himself.", author: "Epictetus", tradition: "Stoic" },
  { text: "Act without expectation.", author: "Lao Tzu", tradition: "Taoist" },
  { text: "First say to yourself what you would be; and then do what you have to do.", author: "Epictetus", tradition: "Stoic" },
  { text: "At the center of your being you have the answer; you know who you are and you know what you want.", author: "Lao Tzu", tradition: "Taoist" },
  { text: "Very little is needed to make a happy life; it is all within yourself, in your way of thinking.", author: "Marcus Aurelius", tradition: "Stoic" },
  { text: "Those who know do not speak. Those who speak do not know.", author: "Lao Tzu", tradition: "Taoist" },
  { text: "The impediment to action advances action. What stands in the way becomes the way.", author: "Marcus Aurelius", tradition: "Stoic" },
  { text: "The journey of a thousand miles begins with a single step.", author: "Lao Tzu", tradition: "Taoist" },
  { text: "Never let the future disturb you. You will meet it, if you have to, with the same weapons of reason that arm you today.", author: "Marcus Aurelius", tradition: "Stoic" },
  { text: "A man with outward courage dares to die; a man with inner courage dares to live.", author: "Lao Tzu", tradition: "Taoist" },
  { text: "Dwell on the beauty of life. Watch the stars, and see yourself running with them.", author: "Marcus Aurelius", tradition: "Stoic" },
  { text: "The key to growth is the introduction of higher dimensions of consciousness into our awareness.", author: "Lao Tzu", tradition: "Taoist" },
  { text: "If you want to improve, be content to be thought foolish and stupid.", author: "Epictetus", tradition: "Stoic" },
  { text: "Doing nothing is better than being busy doing nothing.", author: "Lao Tzu", tradition: "Taoist" },
  { text: "It never ceases to amaze me: we all love ourselves more than other people, but care more about their opinion than our own.", author: "Marcus Aurelius", tradition: "Stoic" },
  { text: "When I let go of what I am, I become what I might be.", author: "Lao Tzu", tradition: "Taoist" },
  { text: "How long are you going to wait before you demand the best for yourself?", author: "Epictetus", tradition: "Stoic" },
  { text: "Be careful what you water your dreams with. Water them with worry and fear and you will produce weeds that choke the life from your dream.", author: "Lao Tzu", tradition: "Taoist" },
  { text: "Confine yourself to the present.", author: "Marcus Aurelius", tradition: "Stoic" },
  { text: "The flame that burns twice as bright burns half as long.", author: "Lao Tzu", tradition: "Taoist" },
  { text: "Make the best use of what is in your power, and take the rest as it happens.", author: "Epictetus", tradition: "Stoic" },
];

function getDayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now.getTime() - start.getTime()) / 86_400_000);
}

// ── Types ─────────────────────────────────────────────────────────────────

interface Todo {
  id: string;
  title: string;
  notes: string;
  completed: boolean;
  createdAt: number;
}

// ── Styles ────────────────────────────────────────────────────────────────

const BG = "#06091a";
const SURFACE = "rgba(255,255,255,0.04)";
const SURFACE_HOVER = "rgba(255,255,255,0.07)";
const SURFACE_SELECTED = "rgba(93,184,138,0.10)";
const BORDER = "rgba(255,255,255,0.08)";
const BORDER_ACCENT = "rgba(93,184,138,0.35)";
const JADE = "#5db88a";
const JADE_DIM = "#3d8a62";
const TEXT = "#dedad0";
const TEXT_DIM = "#7a7890";
const TEXT_MUTED = "#4a4860";
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

export default function Todos() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftNotes, setDraftNotes] = useState("");
  const [addingTitle, setAddingTitle] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Mobile: whether we're showing the detail view (true) or the list (false)
  const [mobileShowDetail, setMobileShowDetail] = useState(false);

  const isMobile = useIsMobile();

  const addInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const quote = useMemo(() => WISDOM[getDayOfYear() % WISDOM.length], []);
  const selected = todos.find(t => t.id === selectedId) ?? null;
  const open = todos.filter(t => !t.completed);
  const done = todos.filter(t => t.completed);

  useEffect(() => {
    const q = query(collection(db, "todos"), orderBy("createdAt", "desc"));
    return onSnapshot(q, snap => {
      setTodos(snap.docs.map(d => ({ id: d.id, ...d.data() } as Todo)));
    });
  }, []);

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

  function selectTodo(id: string) {
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
    setEditing(true);
    setConfirmDelete(false);
  }

  async function saveEdit() {
    if (!selected) return;
    await updateDoc(doc(db, "todos", selected.id), {
      title: draftTitle.trim() || selected.title,
      notes: draftNotes,
    });
    setEditing(false);
  }

  function cancelEdit() {
    setEditing(false);
  }

  async function toggleComplete(todo: Todo) {
    await updateDoc(doc(db, "todos", todo.id), { completed: !todo.completed });
  }

  async function addTodo() {
    const title = addingTitle.trim();
    if (!title) return;
    const ref = await addDoc(collection(db, "todos"), {
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

  async function deleteTodo() {
    if (!selected) return;
    await deleteDoc(doc(db, "todos", selected.id));
    setSelectedId(null);
    setEditing(false);
    setConfirmDelete(false);
    if (isMobile) setMobileShowDetail(false);
  }

  function handleAddKey(e: React.KeyboardEvent) {
    if (e.key === "Enter") addTodo();
    if (e.key === "Escape") { setShowAdd(false); setAddingTitle(""); }
  }

  function handleEditKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Escape") cancelEdit();
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") saveEdit();
  }

  // ── Mobile layout ────────────────────────────────────────────────────────

  if (isMobile) {
    return (
      <div style={{ background: BG, minHeight: "100vh", fontFamily: "'Nunito', sans-serif", color: TEXT, position: "relative" }}>
        <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
          background: "radial-gradient(ellipse 55% 35% at 10% 0%, rgba(40,90,70,0.22) 0%, transparent 60%), radial-gradient(ellipse 40% 30% at 90% 100%, rgba(20,40,80,0.25) 0%, transparent 60%)" }} />

        <div style={{ position: "relative", zIndex: 1 }}>

          {/* ── LIST VIEW ── */}
          {!mobileShowDetail && (
            <div style={{ padding: "16px 16px 100px" }}>
              {/* Top bar */}
              <div style={{ display: "flex", alignItems: "center", marginBottom: 18 }}>
                <Link to="/" style={{ textDecoration: "none", color: TEXT_DIM, fontSize: 13, fontWeight: 600, opacity: 0.8, marginRight: 16 }}>← Home</Link>
                <span style={{ fontSize: 14, color: TEXT_DIM, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", opacity: 0.5 }}>My Todos</span>
              </div>

              {/* Wisdom — compact on mobile */}
              <WisdomCard quote={quote} compact />

              {/* Inline add input */}
              {showAdd && (
                <div style={{ background: SURFACE, border: `1px solid ${BORDER_ACCENT}`, borderRadius: 14, padding: "12px 14px", marginTop: 16, display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    ref={addInputRef}
                    value={addingTitle}
                    onChange={e => setAddingTitle(e.target.value)}
                    onKeyDown={handleAddKey}
                    placeholder="New todo…"
                    style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: TEXT, fontSize: 15, fontFamily: "'Nunito', sans-serif" }}
                  />
                  <button onClick={addTodo} style={{ ...btnStyle(JADE), padding: "7px 16px", fontSize: 13 }}>Add</button>
                  <button onClick={() => { setShowAdd(false); setAddingTitle(""); }}
                    style={{ ...btnStyle("transparent"), color: TEXT_DIM, padding: "7px 8px", fontSize: 16, lineHeight: 1 }}>✕</button>
                </div>
              )}

              {/* Todo list */}
              <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 6 }}>
                {open.map(todo => (
                  <MobileTodoItem key={todo.id} todo={todo} onSelect={() => selectTodo(todo.id)} onToggle={() => toggleComplete(todo)} />
                ))}
                {open.length === 0 && !showAdd && (
                  <div style={{ color: TEXT_MUTED, fontSize: 13, padding: "12px 4px", fontStyle: "italic" }}>All clear ✓</div>
                )}
              </div>

              {done.length > 0 && (
                <div style={{ marginTop: 24 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: TEXT_MUTED, paddingLeft: 4, marginBottom: 8 }}>Done</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {done.map(todo => (
                      <MobileTodoItem key={todo.id} todo={todo} onSelect={() => selectTodo(todo.id)} onToggle={() => toggleComplete(todo)} />
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
                          <button onClick={deleteTodo} style={{ ...btnStyle(DANGER), fontSize: 13, padding: "8px 14px" }}>Delete</button>
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
                <input
                  ref={titleInputRef}
                  value={draftTitle}
                  onChange={e => setDraftTitle(e.target.value)}
                  style={{ width: "100%", boxSizing: "border-box", background: "transparent", border: "none", borderBottom: `1.5px solid ${JADE_DIM}`, outline: "none", color: TEXT, fontSize: 22, fontWeight: 700, fontFamily: "'Nunito', sans-serif", padding: "4px 0", marginBottom: 20 }}
                />
              ) : (
                <h2 style={{ fontSize: 22, fontWeight: 700, color: selected.completed ? TEXT_MUTED : TEXT, textDecoration: selected.completed ? "line-through" : "none", margin: "0 0 20px 0", lineHeight: 1.3 }}>
                  {selected.title}
                </h2>
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
                fontFamily: "'Nunito', sans-serif",
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
    <div style={{ background: BG, minHeight: "100vh", display: "flex", flexDirection: "column", fontFamily: "'Nunito', sans-serif" }}>

      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        background: "radial-gradient(ellipse 55% 35% at 10% 0%, rgba(40,90,70,0.22) 0%, transparent 60%), radial-gradient(ellipse 40% 30% at 90% 100%, rgba(20,40,80,0.25) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 50% 50%, rgba(6,9,26,0) 0%, rgba(6,9,26,0.6) 100%)" }} />

      <Particles />

      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", minHeight: "100vh", maxWidth: 1200, margin: "0 auto", width: "100%", padding: "24px 20px" }}>

        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 28 }}>
          <Link to="/" style={{ textDecoration: "none", color: TEXT_DIM, fontSize: 13, fontWeight: 600, letterSpacing: 0.5, display: "flex", alignItems: "center", gap: 6, opacity: 0.7, transition: "opacity 0.15s" }}
            onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.opacity = "1"}
            onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.opacity = "0.7"}>
            ← Home
          </Link>
          <div style={{ marginLeft: 20, fontSize: 14, color: TEXT_DIM, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", opacity: 0.5 }}>
            My Todos
          </div>
        </div>

        <WisdomCard quote={quote} />

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
                  placeholder="Todo title…"
                  style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: TEXT, fontSize: 14, fontFamily: "'Nunito', sans-serif" }}
                />
                <button onClick={addTodo} style={{ ...btnStyle(JADE), padding: "4px 12px", fontSize: 12 }}>Add</button>
                <button onClick={() => { setShowAdd(false); setAddingTitle(""); }} style={{ ...btnStyle("transparent"), color: TEXT_DIM, padding: "4px 8px", fontSize: 12 }}>✕</button>
              </div>
            ) : (
              <button
                onClick={() => setShowAdd(true)}
                style={{ ...btnStyle("transparent"), border: `1px dashed ${BORDER}`, borderRadius: 12, padding: "10px 14px", marginBottom: 8, textAlign: "left", color: TEXT_DIM, fontSize: 13, display: "flex", alignItems: "center", gap: 8, transition: "all 0.15s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = JADE_DIM; (e.currentTarget as HTMLButtonElement).style.color = JADE; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = BORDER; (e.currentTarget as HTMLButtonElement).style.color = TEXT_DIM; }}>
                <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> New todo
              </button>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {open.map(todo => (
                <TodoItem key={todo.id} todo={todo} selected={selectedId === todo.id} onSelect={() => selectTodo(todo.id)} onToggle={() => toggleComplete(todo)} />
              ))}
              {open.length === 0 && !showAdd && (
                <div style={{ color: TEXT_MUTED, fontSize: 12, padding: "8px 4px", fontStyle: "italic" }}>All clear.</div>
              )}
            </div>

            {done.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: TEXT_MUTED, paddingLeft: 4, marginBottom: 6 }}>Done</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {done.map(todo => (
                    <TodoItem key={todo.id} todo={todo} selected={selectedId === todo.id} onSelect={() => selectTodo(todo.id)} onToggle={() => toggleComplete(todo)} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Detail panel */}
          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "28px 32px", minHeight: 400, display: "flex", flexDirection: "column" }}>
            {selected ? (
              <DetailPanel
                todo={selected}
                editing={editing}
                draftTitle={draftTitle}
                draftNotes={draftNotes}
                confirmDelete={confirmDelete}
                titleInputRef={titleInputRef}
                onDraftTitle={setDraftTitle}
                onDraftNotes={setDraftNotes}
                onEdit={startEdit}
                onSave={saveEdit}
                onCancel={cancelEdit}
                onEditKey={handleEditKey}
                onDeleteRequest={() => setConfirmDelete(true)}
                onDeleteCancel={() => setConfirmDelete(false)}
                onDeleteConfirm={deleteTodo}
              />
            ) : (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: TEXT_MUTED, fontSize: 14, fontStyle: "italic" }}>
                Select a todo to view details
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────

function WisdomCard({ quote, compact = false }: { quote: typeof WISDOM[0]; compact?: boolean }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.025)", border: `1px solid ${BORDER}`, borderRadius: 16, padding: compact ? "14px 18px" : "22px 28px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(93,184,138,0.04) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: compact ? 8 : 12 }}>
          <div style={{ width: 3, height: 12, background: `linear-gradient(180deg, ${JADE}, ${JADE_DIM})`, borderRadius: 2 }} />
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: JADE, opacity: 0.8 }}>
            {quote.tradition} · Daily Wisdom
          </span>
        </div>
        <p style={{ fontSize: compact ? 13 : 15, lineHeight: 1.65, color: "#c8c4b8", fontStyle: "italic", margin: 0, maxWidth: 760 }}>
          "{quote.text}"
        </p>
        <p style={{ fontSize: 12, color: TEXT_DIM, marginTop: 8, marginBottom: 0, fontWeight: 600 }}>
          — {quote.author}
        </p>
      </div>
    </div>
  );
}

/** Desktop sidebar todo row */
function TodoItem({ todo, selected, onSelect, onToggle }: {
  todo: Todo;
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
        style={{ flexShrink: 0, width: 18, height: 18, marginTop: 1, borderRadius: 5, border: `1.5px solid ${todo.completed ? JADE : "rgba(255,255,255,0.2)"}`, background: todo.completed ? JADE : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s", padding: 0 }}>
        {todo.completed && <span style={{ color: "#06091a", fontSize: 11, lineHeight: 1, fontWeight: 700 }}>✓</span>}
      </button>
      <span style={{ fontSize: 13, color: todo.completed ? TEXT_MUTED : TEXT, textDecoration: todo.completed ? "line-through" : "none", lineHeight: 1.45, wordBreak: "break-word" }}>
        {todo.title}
      </span>
    </div>
  );
}

/** Mobile todo row — larger touch target, swipe-friendly feel */
function MobileTodoItem({ todo, onSelect, onToggle }: {
  todo: Todo;
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
        style={{ flexShrink: 0, width: 24, height: 24, borderRadius: 7, border: `2px solid ${todo.completed ? JADE : "rgba(255,255,255,0.22)"}`, background: todo.completed ? JADE : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
        {todo.completed && <span style={{ color: "#06091a", fontSize: 14, lineHeight: 1, fontWeight: 700 }}>✓</span>}
      </button>

      {/* Title — tapping opens detail */}
      <span onClick={onSelect} style={{ flex: 1, fontSize: 15, color: todo.completed ? TEXT_MUTED : TEXT, textDecoration: todo.completed ? "line-through" : "none", lineHeight: 1.4, wordBreak: "break-word" }}>
        {todo.title}
      </span>

      {/* Chevron */}
      <span onClick={onSelect} style={{ fontSize: 16, color: TEXT_MUTED, flexShrink: 0 }}>›</span>
    </div>
  );
}

function DetailPanel({
  todo, editing, draftTitle, draftNotes, confirmDelete, titleInputRef,
  onDraftTitle, onDraftNotes, onEdit, onSave, onCancel, onEditKey,
  onDeleteRequest, onDeleteCancel, onDeleteConfirm,
}: {
  todo: Todo;
  editing: boolean;
  draftTitle: string;
  draftNotes: string;
  confirmDelete: boolean;
  titleInputRef: React.RefObject<HTMLInputElement>;
  onDraftTitle: (v: string) => void;
  onDraftNotes: (v: string) => void;
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
          <input
            ref={titleInputRef}
            value={draftTitle}
            onChange={e => onDraftTitle(e.target.value)}
            style={{ flex: 1, background: "transparent", border: "none", borderBottom: `1.5px solid ${JADE_DIM}`, outline: "none", color: TEXT, fontSize: 20, fontWeight: 700, fontFamily: "'Nunito', sans-serif", padding: "2px 0" }}
          />
        ) : (
          <h2 style={{ flex: 1, fontSize: 20, fontWeight: 700, color: todo.completed ? TEXT_MUTED : TEXT, textDecoration: todo.completed ? "line-through" : "none", margin: 0, lineHeight: 1.3 }}>
            {todo.title}
          </h2>
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
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = TEXT; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.2)"; }}
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
          {todo.notes.trim() ? (
            <div className="md-view">
              <ReactMarkdown>{todo.notes}</ReactMarkdown>
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

function Particles() {
  const particles = useMemo(() =>
    Array.from({ length: 40 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: 1 + Math.random() * 2,
      delay: Math.random() * 8,
      duration: 4 + Math.random() * 6,
      op: 0.15 + Math.random() * 0.35,
    })), []);

  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
      {particles.map(p => (
        <div key={p.id} style={{ position: "absolute", borderRadius: "50%", background: "rgba(93,184,138,0.6)", width: p.size, height: p.size, left: `${p.left}%`, top: `${p.top}%`, animation: `twinkle ${p.duration}s ${p.delay}s infinite`, ["--op" as string]: p.op }} />
      ))}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────

function btnStyle(bg: string): React.CSSProperties {
  return { background: bg, border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "'Nunito', sans-serif", fontWeight: 700, color: bg === "transparent" ? TEXT : "#06091a" };
}
