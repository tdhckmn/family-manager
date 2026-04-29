import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../../firebase";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const BEHAVIOR_COLORS = [
  { id: "red",    label: "🔴 Red",    earn: -0.25, penalty: true,  note: "−$0.25 today" },
  { id: "orange", label: "🟠 Orange", earn: -0.25, penalty: true,  note: "−$0.25 today" },
  { id: "yellow", label: "🟡 Yellow", earn:  0.10, penalty: false, note: "+$0.10" },
  { id: "green",  label: "🟢 Green",  earn:  0.25, penalty: false, note: "+$0.25 ✨" },
  { id: "blue",   label: "🔵 Blue",   earn:  0.40, penalty: false, note: "+$0.40 🌟" },
  { id: "purple", label: "🟣 Purple", earn:  0.55, penalty: false, note: "+$0.55 💜" },
  { id: "pink",   label: "🩷 Pink",   earn:  0.65, penalty: false, note: "+$0.65 🩷" },
  { id: "otc",    label: "⭐ OTC",    earn:  0.80, penalty: false, note: "+$0.80 👑 AMAZING!" },
];

const TASKS = [
  { id: "teeth",   name: "Brush Teeth (Morning)",       note: "Nice and thorough — 2 min!",                                  earn: 0.15 },
  { id: "teeth2",  name: "Brush Teeth (Night)",          note: "Nice and thorough — 2 min!",                                  earn: 0.15 },
  { id: "ready",   name: "Ready for School",             note: "Breakfast, backpack, snack, water, dressed for weather",      earn: 0.20 },
  { id: "room",    name: "Room Tidy",                    note: "Floor clear, toys away, bed made",                            earn: 0.20 },
  { id: "brother", name: "Kind to Pete + Bedtime Hug",  note: "Kind words during the day and a hug at bedtime",              earn: 0.20 },
  { id: "putaway", name: "Put Things Away Neatly",       note: "Shoes, coat, backpack, toys, books — all where they belong",  earn: 0.20 },
];

interface DayData { tasks: Record<string, boolean>; behavior: string | null; }
interface ArborState {
  currentWeek: number;
  weeks: Record<number, Record<number, DayData>>;
  goalName: string;
  goalAmt: number;
}

const DEFAULT_STATE: ArborState = {
  currentWeek: 1,
  weeks: {},
  goalName: "",
  goalAmt: 0,
};

function fmt(n: number) { return "$" + Math.max(0, n).toFixed(2); }

function getDayData(state: ArborState, w: number, d: number): DayData {
  return state.weeks[w]?.[d] || { tasks: {}, behavior: null };
}

function calcDay(state: ArborState, w: number, d: number): number {
  const dd = getDayData(state, w, d);
  let total = 0;
  if (dd.behavior) {
    const b = BEHAVIOR_COLORS.find(x => x.id === dd.behavior);
    if (b) total += b.earn;
  }
  TASKS.forEach(t => { if (dd.tasks[t.id]) total += t.earn; });
  return Math.max(0, total);
}

function calcWeek(state: ArborState, w: number): number {
  let t = 0;
  for (let d = 0; d < 7; d++) t += calcDay(state, w, d);
  return t;
}

function calcAllTime(state: ArborState): number {
  let t = 0;
  Object.keys(state.weeks).forEach(w => { t += calcWeek(state, Number(w)); });
  return t;
}

function withDayUpdate(state: ArborState, w: number, d: number, updates: Partial<DayData>): ArborState {
  const existing = getDayData(state, w, d);
  return {
    ...state,
    weeks: {
      ...state.weeks,
      [w]: { ...state.weeks[w], [d]: { ...existing, ...updates } },
    },
  };
}

const BEH_STYLES: Record<string, { bg: string; color: string; border: string; selBg: string; selColor: string }> = {
  red:    { bg: "rgba(232,84,112,0.2)",  color: "#f99",     border: "rgba(232,84,112,0.4)",  selBg: "#e85470", selColor: "white" },
  orange: { bg: "rgba(240,133,90,0.2)",  color: "#fbb",     border: "rgba(240,133,90,0.4)",  selBg: "#f0855a", selColor: "white" },
  yellow: { bg: "rgba(240,201,74,0.2)",  color: "#f0c94a",  border: "rgba(240,201,74,0.4)",  selBg: "#f0c94a", selColor: "#1a0d1e" },
  green:  { bg: "rgba(93,196,138,0.2)",  color: "#9fe",     border: "rgba(93,196,138,0.4)",  selBg: "#5dc48a", selColor: "white" },
  blue:   { bg: "rgba(106,174,232,0.2)", color: "#adf",     border: "rgba(106,174,232,0.4)", selBg: "#6aaee8", selColor: "white" },
  purple: { bg: "rgba(176,122,216,0.2)", color: "#daf",     border: "rgba(176,122,216,0.4)", selBg: "#b07ad8", selColor: "white" },
  pink:   { bg: "rgba(232,122,184,0.2)", color: "#fce",     border: "rgba(232,122,184,0.4)", selBg: "#e87ab8", selColor: "white" },
  otc:    { bg: "rgba(244,208,248,0.15)", color: "#f4d0f8", border: "rgba(244,208,248,0.3)", selBg: "#f4d0f8", selColor: "#2d1a2e" },
};

function spawnPetals(el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  const emojis = ["🌸", "💖", "✨", "🌺", "💕"];
  for (let i = 0; i < 6; i++) {
    const c = document.createElement("div");
    c.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    const drift = (Math.random() - 0.5) * 80;
    c.style.cssText = `position:fixed;font-size:18px;left:${rect.left + rect.width / 2}px;top:${rect.top}px;animation:petal-fall 1s ${i * 0.08}s ease-in forwards;z-index:999;pointer-events:none;--drift:${drift}px;--d:1s;--delay:0s;`;
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 1300);
  }
}

export default function ArborTracker() {
  const [state, setState] = useState<ArborState>(DEFAULT_STATE);
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());
  const [toast, setToast] = useState("");
  const [goalInput, setGoalInput] = useState("");
  const [goalAmtInput, setGoalAmtInput] = useState("");

  const petals = useMemo(() =>
    Array.from({ length: 18 }, (_, i) => {
      const emojis = ["🌸", "🌺", "✨", "💖", "🌷"];
      return { id: i, left: Math.random() * 100, emoji: emojis[Math.floor(Math.random() * emojis.length)], fs: 10 + Math.random() * 14, d: 6 + Math.random() * 8, delay: Math.random() * 10, drift: (Math.random() - 0.5) * 120 };
    }), []);

  useEffect(() => {
    try {
      const ref = doc(db, "kids", "arbor");
      const unsub = onSnapshot(ref, snap => {
        if (snap.exists()) {
          setState(snap.data() as ArborState);
        } else {
          setDoc(ref, DEFAULT_STATE).catch(() => {});
        }
      }, () => {});
      return unsub;
    } catch { /* Firebase not configured */ }
  }, []);

  const save = useCallback((next: ArborState) => {
    setState(next);
    setDoc(doc(db, "kids", "arbor"), next).catch(err => console.error("Arbor save failed:", err));
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2800);
  }

  function setGoal() {
    if (!state) return;
    const name = goalInput.trim();
    const amt = parseFloat(goalAmtInput);
    const next = { ...state, goalName: name || state.goalName, goalAmt: !isNaN(amt) && amt > 0 ? amt : state.goalAmt };
    save(next);
    showToast("Goal set! 👑 You've got this, Arbor!");
    setGoalInput("");
    setGoalAmtInput("");
  }


  const w = state.currentWeek;
  const totalEarned = calcAllTime(state);
  const weekEarned = calcWeek(state, w);
  const dayData = getDayData(state, w, selectedDay);
  const dayEarned = calcDay(state, w, selectedDay);
  const pct = state.goalAmt > 0 ? Math.min(100, (totalEarned / state.goalAmt) * 100) : 0;

  function toggleBehavior(behaviorId: string) {
    const next = withDayUpdate(state!, w, selectedDay, {
      behavior: dayData.behavior === behaviorId ? null : behaviorId,
    });
    save(next);
    const b = BEHAVIOR_COLORS.find(x => x.id === behaviorId);
    if (b && !b.penalty) showToast(`${b.label}: ${b.note}`);
  }

  function toggleTask(taskId: string, el: HTMLElement) {
    const wasChecked = !!dayData.tasks[taskId];
    const next = withDayUpdate(state!, w, selectedDay, {
      tasks: { ...dayData.tasks, [taskId]: !wasChecked },
    });
    save(next);
    if (!wasChecked) spawnPetals(el);
  }

  const card: React.CSSProperties = { background: "#2a1530", border: "1px solid #5a3060", borderRadius: 22, overflow: "hidden", marginBottom: 14 };
  const cardHeader: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", background: "#351a3d", borderBottom: "1px solid #5a3060" };

  return (
    <div style={{ background: "#1a0d1e", minHeight: "100vh", overflowX: "hidden", color: "#fce8f5", fontFamily: "'Nunito', sans-serif" }}>
      {/* Floating petals */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
        {petals.map(p => (
          <div key={p.id} style={{ position: "absolute", top: -40, left: `${p.left}%`, fontSize: p.fs, opacity: 0, animation: `petal-fall ${p.d}s ${p.delay}s infinite ease-in`, ["--drift" as string]: `${p.drift}px`, ["--d" as string]: `${p.d}s`, ["--delay" as string]: `${p.delay}s` }}>
            {p.emoji}
          </div>
        ))}
      </div>
      <div style={{ position: "fixed", inset: 0, background: "radial-gradient(ellipse 70% 50% at 10% 0%, rgba(232,84,122,0.2) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 90% 90%, rgba(201,168,224,0.18) 0%, transparent 60%)", pointerEvents: "none", zIndex: 0 }} />

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "#351a3d", border: "2px solid #e8547a", color: "#fce8f5", padding: "12px 24px", borderRadius: 14, fontFamily: "'Playfair Display', serif", fontSize: 16, zIndex: 200, whiteSpace: "nowrap" }}>
          {toast}
        </div>
      )}

      <div style={{ position: "relative", zIndex: 1, maxWidth: 720, margin: "0 auto", padding: 16 }}>
        {/* Header */}
        <header style={{ textAlign: "center", padding: "28px 16px 20px" }}>
          <Link to="/kids" style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", color: "#c4a0c8", fontSize: 13, fontWeight: 700, marginBottom: 12, opacity: 0.7 }}>← Back</Link>
          <div style={{ fontSize: 48, display: "block", marginBottom: 4, animation: "crown-bob 3s ease-in-out infinite" }}>👑</div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(26px, 7vw, 46px)", background: "linear-gradient(135deg, #e8c14a 0%, #f4a7b9 40%, #c9a8e0 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", lineHeight: 1.15, letterSpacing: 1 }}>
            Arbor's Royal Savings
          </div>
          <div style={{ fontSize: 12, color: "#c4a0c8", marginTop: 6, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>Princess Peach's Treasure Jar</div>
        </header>

        {/* Jar goal banner */}
        <div style={{ background: "linear-gradient(135deg, #2e1535, #1e1030)", border: "2px solid rgba(232,84,122,0.4)", borderRadius: 22, padding: "18px 20px", marginBottom: 14, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", right: 16, top: -4, fontSize: 52, opacity: 0.12, transform: "rotate(15deg)", pointerEvents: "none" }}>👑</div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
            <div style={{ fontSize: 44, flexShrink: 0 }}>🫙</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5, color: "#c4a0c8", fontWeight: 700 }}>Saving For</div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: "#e8c14a", margin: "2px 0" }}>{state.goalName || "Something Special ✨"}</div>
              <div style={{ fontSize: 13, color: "#c4a0c8", fontWeight: 600 }}>Total saved: <strong style={{ color: "#e8c14a" }}>{fmt(totalEarned)}</strong></div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#c4a0c8", whiteSpace: "nowrap" }}>🎯 Set a goal:</label>
            <input value={goalInput} onChange={e => setGoalInput(e.target.value)} placeholder="e.g. Barbie Dreamhouse" maxLength={40} style={{ background: "rgba(255,255,255,0.07)", border: "1.5px solid #5a3060", borderRadius: 10, color: "#fce8f5", fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 14, padding: "6px 10px", width: 160 }} />
            <input value={goalAmtInput} onChange={e => setGoalAmtInput(e.target.value)} type="number" placeholder="$ amount" min={1} max={500} style={{ background: "rgba(255,255,255,0.07)", border: "1.5px solid #5a3060", borderRadius: 10, color: "#fce8f5", fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 14, padding: "6px 10px", width: 110 }} />
            <button onClick={setGoal} style={{ background: "linear-gradient(135deg, #e8547a, #c9a8e0)", border: "none", borderRadius: 10, color: "white", fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: 13, padding: "7px 14px", cursor: "pointer" }}>Set Goal 💖</button>
          </div>
          <div style={{ height: 20, background: "rgba(255,255,255,0.07)", borderRadius: 10, overflow: "hidden", border: "1.5px solid rgba(232,84,122,0.3)" }}>
            <div style={{ height: "100%", background: "linear-gradient(90deg, #e8547a, #e8c14a)", borderRadius: 10, width: `${pct}%`, transition: "width 0.7s cubic-bezier(0.34,1.56,0.64,1)", minWidth: 4 }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, marginTop: 5 }}>
            <span style={{ color: "#f4a7b9" }}>{state.goalAmt > 0 ? `${Math.round(pct)}% full` : "Set a goal to track!"}</span>
            <span style={{ color: "#c4a0c8" }}>{state.goalAmt > 0 ? `Goal: ${fmt(state.goalAmt)}` : ""}</span>
          </div>
        </div>

        {/* Week nav */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#2a1530", border: "1px solid #5a3060", borderRadius: 14, padding: "12px 16px", marginBottom: 14 }}>
          <button onClick={() => save({ ...state, currentWeek: Math.max(1, w - 1) })} style={{ background: "#351a3d", border: "1px solid #5a3060", color: "#fce8f5", borderRadius: 8, padding: "6px 12px", fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>◀</button>
          <div style={{ flex: 1, textAlign: "center", fontFamily: "'Playfair Display', serif", fontSize: 18, color: "#f4a7b9" }}>Week {w}</div>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#e8c14a", whiteSpace: "nowrap" }}>💰 {fmt(weekEarned)}</div>
          <button onClick={() => save({ ...state, currentWeek: w + 1 })} style={{ background: "#351a3d", border: "1px solid #5a3060", color: "#fce8f5", borderRadius: 8, padding: "6px 12px", fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>▶</button>
        </div>

        {/* Day grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6, marginBottom: 14 }}>
          {DAYS.map((day, d) => {
            const earned = calcDay(state, w, d);
            const dd = getDayData(state, w, d);
            const hasData = dd.behavior || Object.values(dd.tasks).some(v => v);
            const dotColor = !hasData ? "rgba(255,255,255,0.04)" : earned >= 1.0 ? "#5dc48a" : earned > 0 ? "#f0c94a" : "rgba(255,255,255,0.12)";
            const isActive = d === selectedDay;
            return (
              <div key={d} onClick={() => setSelectedDay(d)} style={{ background: isActive ? "#351a3d" : "#2a1530", border: `2px solid ${isActive ? "#e8c14a" : "#5a3060"}`, borderRadius: 12, padding: "8px 4px", textAlign: "center", cursor: "pointer", boxShadow: isActive ? "0 0 0 1px #e8c14a" : "none" }}>
                <div style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, color: "#c4a0c8", marginBottom: 4 }}>{day}</div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 13, color: "#e8c14a" }}>{earned > 0 ? fmt(earned) : "—"}</div>
                <div style={{ width: 8, height: 8, borderRadius: "50%", margin: "4px auto 0", background: dotColor }} />
              </div>
            );
          })}
        </div>

        {/* Daily checklist */}
        <div style={card}>
          <div style={cardHeader}>
            <div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, color: "#f4a7b9" }}>🌸 Today's Quests</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#c4a0c8", marginTop: 2 }}>{DAY_FULL[selectedDay]} — Week {w}</div>
            </div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: "#e8c14a" }}>💰 {fmt(dayEarned)}</div>
          </div>

          {/* Behavior */}
          <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(90,48,96,0.5)" }}>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: "#c4a0c8", marginBottom: 10 }}>🏫 School Behavior Color</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {BEHAVIOR_COLORS.map(b => {
                const sel = dayData.behavior === b.id;
                const bs = BEH_STYLES[b.id];
                return (
                  <button key={b.id} onClick={() => toggleBehavior(b.id)} style={{ padding: "6px 10px", borderRadius: 8, border: `2px solid ${sel ? bs.selBg : bs.border}`, background: sel ? bs.selBg : bs.bg, color: sel ? bs.selColor : bs.color, fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: 12, cursor: "pointer", opacity: sel ? 1 : 0.55, transform: sel ? "scale(1.07)" : "scale(1)", transition: "all 0.15s" }}>
                    {b.label}
                  </button>
                );
              })}
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, marginTop: 8, minHeight: 18, color: dayData.behavior ? (BEHAVIOR_COLORS.find(x => x.id === dayData.behavior)?.penalty ? "#e85470" : "#5dc48a") : "#c4a0c8" }}>
              {dayData.behavior
                ? (() => { const b = BEHAVIOR_COLORS.find(x => x.id === dayData.behavior); return b ? `${b.label}: ${b.note}` : ""; })()
                : "Tap a color to log school behavior"}
            </div>
          </div>

          {/* Tasks */}
          {TASKS.map((t, i) => {
            const done = !!dayData.tasks[t.id];
            return (
              <div key={t.id} onClick={e => toggleTask(t.id, e.currentTarget as HTMLElement)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 18px", borderBottom: i < TASKS.length - 1 ? "1px solid rgba(90,48,96,0.4)" : "none", cursor: "pointer", userSelect: "none" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", border: `2px solid ${done ? "#e8547a" : "#5a3060"}`, background: done ? "#e8547a" : "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 14, transition: "all 0.2s" }}>
                  {done ? "♥" : ""}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, textDecoration: done ? "line-through" : "none", color: done ? "#c4a0c8" : "#fce8f5" }}>{t.name}</div>
                  <div style={{ fontSize: 11, color: "#c4a0c8", marginTop: 2 }}>{t.note}</div>
                </div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, color: "#e8c14a", whiteSpace: "nowrap" }}>🌸 {fmt(t.earn)}</div>
              </div>
            );
          })}
        </div>

        {/* Payout summary */}
        <div style={{ background: "linear-gradient(135deg, #2a1830, #1e1428)", border: "2px solid rgba(232,84,122,0.3)", borderRadius: 22, padding: 18, marginBottom: 14 }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, color: "#f4a7b9", marginBottom: 12 }}>💵 Weekly Payout Summary</div>
          {DAYS.map((_, d) => {
            const earned = calcDay(state, w, d);
            const dd = getDayData(state, w, d);
            const hasData = dd.behavior || Object.values(dd.tasks).some(v => v);
            return (
              <div key={d} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid rgba(232,84,122,0.1)", fontSize: 13 }}>
                <span style={{ color: "#c4a0c8", fontWeight: 600 }}>{DAY_FULL[d]}</span>
                <span style={{ fontWeight: 800, color: earned > 0 ? "#e8c14a" : "#c4a0c8" }}>{hasData ? fmt(earned) : "—"}</span>
              </div>
            );
          })}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid rgba(232,84,122,0.1)", fontSize: 13 }}>
            <span style={{ color: "#fce8f5", fontWeight: 800, fontSize: 14 }}>📦 Week {w} Total</span>
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: "#e8c14a" }}>{fmt(weekEarned)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", fontSize: 13 }}>
            <span style={{ color: "#fce8f5", fontWeight: 800, fontSize: 14 }}>🫙 Total in the Jar</span>
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: "#e8c14a" }}>{fmt(totalEarned)}</span>
          </div>
        </div>

        {/* Rules */}
        <div style={{ background: "#2a1530", border: "1px solid #5a3060", borderRadius: 22, padding: 18, marginBottom: 14 }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, color: "#c9a8e0", marginBottom: 12 }}>📜 Arbor's Royal Rules</div>
          {[
            ["🟢", <><strong>Green = $0.25</strong> · Yellow = $0.10 · Red/Orange = <span style={{ color: "#e85470" }}>−$0.25</span></>],
            ["👑", <><strong>Blue through OTC</strong> earn bigger bonuses — keep being amazing!</>],
            ["🦷", <><strong>Brush both times</strong> — morning and night, nice and thorough</>],
            ["🛏️", <>Room tidy = coins. Not tidy = no coins that day (no penalty, just no earn)</>],
            ["💛", <>Kind words to Pete <strong>and</strong> a bedtime hug = both needed for that coin</>],
            ["🎒", <>Ready for school means: breakfast, backpack, snack, water, dressed for the weather</>],
            ["🧹", <>Put-away means shoes, coat, backpack, toys, books — <em>all neatly where they go</em></>],
            ["🫙", <>Coins go straight in the jar. When the jar hits your goal — you earn it!</>],
          ].map(([icon, text], i) => (
            <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8, fontSize: 13, lineHeight: 1.4 }}>
              <span style={{ flexShrink: 0, fontSize: 16 }}>{icon}</span>
              <span style={{ color: "#c4a0c8" }}>{text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
