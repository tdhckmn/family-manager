import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../../firebase";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const GOAL = 80;

const BEHAVIOR_COLORS = [
  { id: "red",    label: "🔴 Red",    cls: "beh-red",    earn: -0.25, penalty: true,  note: "−$0.25 today" },
  { id: "orange", label: "🟠 Orange", cls: "beh-orange", earn: -0.25, penalty: true,  note: "−$0.25 today" },
  { id: "yellow", label: "🟡 Yellow", cls: "beh-yellow", earn:  0.10, penalty: false, note: "+$0.10" },
  { id: "green",  label: "🟢 Green",  cls: "beh-green",  earn:  0.25, penalty: false, note: "+$0.25 ✨" },
  { id: "blue",   label: "🔵 Blue",   cls: "beh-blue",   earn:  0.40, penalty: false, note: "+$0.40 🌟" },
  { id: "purple", label: "🟣 Purple", cls: "beh-purple", earn:  0.55, penalty: false, note: "+$0.55 💜" },
  { id: "pink",   label: "🩷 Pink",   cls: "beh-pink",   earn:  0.65, penalty: false, note: "+$0.65 🩷" },
  { id: "otc",    label: "⭐ OTC",    cls: "beh-otc",    earn:  0.80, penalty: false, note: "+$0.80 🏆 WOW!" },
];

const TASKS = [
  { id: "teeth",   name: "Brush Teeth (Morning)",       note: "Thorough & timed — 2 min minimum",                          earn: 0.15 },
  { id: "teeth2",  name: "Brush Teeth (Night)",          note: "Thorough & timed — 2 min minimum",                          earn: 0.15 },
  { id: "ready",   name: "Ready for School",             note: "Breakfast, backpack, snack, water, dressed for weather",    earn: 0.20 },
  { id: "room",    name: "Room Clean",                   note: "Floor clear, bed made, things put away",                    earn: 0.20 },
  { id: "sister",  name: "Kind to Sister + Bedtime Hug", note: "Kind words during the day AND a hug at bedtime",           earn: 0.20 },
  { id: "putaway", name: "Put Things Away Neatly",       note: "Shoes, coat, backpack, toys, books, papers — all of it",   earn: 0.20 },
];

interface DayData { tasks: Record<string, boolean>; behavior: string | null; }
interface PeteState {
  currentWeek: number;
  weeks: Record<number, Record<number, DayData>>;
  startDate: string;
}

const DEFAULT_STATE: PeteState = {
  currentWeek: 1,
  weeks: {},
  startDate: new Date().toISOString().split("T")[0],
};

function fmt(n: number) { return "$" + Math.max(0, n).toFixed(2); }

function getDayData(state: PeteState, w: number, d: number): DayData {
  return state.weeks[w]?.[d] || { tasks: {}, behavior: null };
}

function calcDay(state: PeteState, w: number, d: number): number {
  const dd = getDayData(state, w, d);
  let total = 0;
  if (dd.behavior) {
    const b = BEHAVIOR_COLORS.find(x => x.id === dd.behavior);
    if (b) total += b.earn;
  }
  TASKS.forEach(t => { if (dd.tasks[t.id]) total += t.earn; });
  return Math.max(0, total);
}

function calcWeek(state: PeteState, w: number): number {
  let t = 0;
  for (let d = 0; d < 7; d++) t += calcDay(state, w, d);
  return t;
}

function calcAllTime(state: PeteState): number {
  let t = 0;
  Object.keys(state.weeks).forEach(w => { t += calcWeek(state, Number(w)); });
  return t;
}

function withDayUpdate(state: PeteState, w: number, d: number, updates: Partial<DayData>): PeteState {
  const existing = getDayData(state, w, d);
  return {
    ...state,
    weeks: {
      ...state.weeks,
      [w]: {
        ...state.weeks[w],
        [d]: { ...existing, ...updates },
      },
    },
  };
}

// Behavior button colors
const BEH_STYLES: Record<string, { bg: string; color: string; border: string; selBg: string; selColor: string }> = {
  red:    { bg: "rgba(232,41,58,0.2)",   color: "#f77",        border: "rgba(232,41,58,0.4)",   selBg: "#e8293a", selColor: "white" },
  orange: { bg: "rgba(245,124,32,0.2)",  color: "#faa",        border: "rgba(245,124,32,0.4)",  selBg: "#f57c20", selColor: "white" },
  yellow: { bg: "rgba(245,196,0,0.2)",   color: "#f5c400",     border: "rgba(245,196,0,0.4)",   selBg: "#f5c400", selColor: "#1a1033" },
  green:  { bg: "rgba(44,184,78,0.2)",   color: "#6f8",        border: "rgba(44,184,78,0.4)",   selBg: "#2cb84e", selColor: "white" },
  blue:   { bg: "rgba(26,111,207,0.2)",  color: "#8cf",        border: "rgba(26,111,207,0.4)",  selBg: "#1a6fcf", selColor: "white" },
  purple: { bg: "rgba(139,52,196,0.2)",  color: "#d9a",        border: "rgba(139,52,196,0.4)",  selBg: "#8b34c4", selColor: "white" },
  pink:   { bg: "rgba(233,82,158,0.2)",  color: "#f9c",        border: "rgba(233,82,158,0.4)",  selBg: "#e9529e", selColor: "white" },
  otc:    { bg: "rgba(91,211,245,0.2)",  color: "#5bd3f5",     border: "rgba(91,211,245,0.4)",  selBg: "#5bd3f5", selColor: "#0d0a1f" },
};

function spawnCoins(el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  for (let i = 0; i < 6; i++) {
    const c = document.createElement("div");
    c.textContent = "🪙";
    c.style.cssText = `position:fixed;font-size:18px;left:${rect.left + rect.width / 2}px;top:${rect.top}px;animation:confetti-fall 0.9s ${i * 0.08}s ease-in forwards;z-index:999;pointer-events:none;`;
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 1200);
  }
}

export default function PeteTracker() {
  const [state, setState] = useState<PeteState>(DEFAULT_STATE);
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());
  const [toast, setToast] = useState("");

  const stars = useMemo(() =>
    Array.from({ length: 70 }, (_, i) => ({
      id: i, left: Math.random() * 100, top: Math.random() * 100,
      d: 2 + Math.random() * 4, delay: Math.random() * 5, op: 0.3 + Math.random() * 0.7,
    })), []);

  useEffect(() => {
    try {
      const ref = doc(db, "kids", "pete");
      const unsub = onSnapshot(ref, snap => {
        if (snap.exists()) {
          setState(snap.data() as PeteState);
        } else {
          setDoc(ref, DEFAULT_STATE).catch(() => {});
        }
      }, () => {});
      return unsub;
    } catch { /* Firebase not configured */ }
  }, []);

  const save = useCallback((next: PeteState) => {
    setState(next);
    setDoc(doc(db, "kids", "pete"), next).catch(err => console.error("Pete save failed:", err));
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2800);
  }


  const w = state.currentWeek;
  const totalEarned = calcAllTime(state);
  const weekEarned = calcWeek(state, w);
  const pct = Math.min(100, (totalEarned / GOAL) * 100);
  const remaining = Math.max(0, GOAL - totalEarned);
  const weeksNeeded = Math.ceil(remaining / 9.45);
  const dayData = getDayData(state, w, selectedDay);
  const dayEarned = calcDay(state, w, selectedDay);

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
    if (!wasChecked) spawnCoins(el);
  }

  // Outer container style
  const outer: React.CSSProperties = { background: "#0d0a1f", minHeight: "100vh", overflowX: "hidden", color: "#f0eaff", fontFamily: "'Nunito', sans-serif" };
  const card: React.CSSProperties = { background: "#1e1640", border: "1px solid #3a2f6b", borderRadius: 18, overflow: "hidden", marginBottom: 14 };
  const cardHeader: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", background: "#261d52", borderBottom: "1px solid #3a2f6b" };

  return (
    <div style={outer}>
      {/* Fixed stars */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
        {stars.map(s => (
          <div key={s.id} style={{ position: "absolute", width: 3, height: 3, borderRadius: "50%", background: "white", left: `${s.left}%`, top: `${s.top}%`, animation: `twinkle ${s.d}s ${s.delay}s infinite`, ["--op" as string]: s.op }} />
        ))}
      </div>
      <div style={{ position: "fixed", inset: 0, background: "radial-gradient(ellipse 60% 40% at 20% 10%, rgba(139,52,196,0.18) 0%, transparent 60%), radial-gradient(ellipse 50% 30% at 80% 80%, rgba(26,111,207,0.18) 0%, transparent 60%)", pointerEvents: "none", zIndex: 0 }} />

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "#261d52", border: "2px solid #2cb84e", color: "#f0eaff", padding: "12px 24px", borderRadius: 14, fontFamily: "'Fredoka One', cursive", fontSize: 16, zIndex: 200, whiteSpace: "nowrap" }}>
          {toast}
        </div>
      )}

      <div style={{ position: "relative", zIndex: 1, maxWidth: 720, margin: "0 auto", padding: 16 }}>
        {/* Header */}
        <header style={{ textAlign: "center", padding: "28px 16px 20px" }}>
          <Link to="/kids" style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", color: "#9b90c2", fontSize: 13, fontWeight: 700, marginBottom: 12, opacity: 0.7 }}>← Back</Link>
          <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: "clamp(28px, 7vw, 48px)", background: "linear-gradient(135deg, #f5c400 0%, #f57c20 40%, #e9529e 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", lineHeight: 1.1 }}>
            ⭐ Quest for Wonder ⭐
          </div>
          <div style={{ fontSize: 13, color: "#9b90c2", marginTop: 4, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>Earn your way to Super Mario Wonder</div>
        </header>

        {/* Goal banner */}
        <div style={{ background: "linear-gradient(135deg, #2a1d50, #1a2f5e)", border: "2px solid #3a2f6b", borderRadius: 18, padding: "16px 20px", marginBottom: 14, display: "flex", alignItems: "center", gap: 16, position: "relative", overflow: "hidden" }}>
          <div style={{ fontSize: 40, flexShrink: 0 }}>🍄</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: "#9b90c2", fontWeight: 700 }}>The Goal</div>
            <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: 20, color: "#f5c400", margin: "2px 0" }}>Super Mario Wonder</div>
            <div style={{ fontSize: 13, color: "#9b90c2" }}>Switch 2 Edition · $80.00</div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
              <span style={{ color: "#5bd3f5" }}>💰 {fmt(totalEarned)}</span>
              <span style={{ color: "#f5c400" }}>$80.00</span>
            </div>
            <div style={{ height: 16, background: "rgba(255,255,255,0.08)", borderRadius: 8, overflow: "hidden", border: "1px solid #3a2f6b" }}>
              <div style={{ height: "100%", background: "linear-gradient(90deg, #2cb84e, #f5c400)", borderRadius: 8, width: `${pct}%`, transition: "width 0.6s cubic-bezier(0.34,1.56,0.64,1)", minWidth: 4 }} />
            </div>
            <div style={{ fontSize: 11, color: "#9b90c2", marginTop: 4, textAlign: "right", fontWeight: 600 }}>
              {remaining <= 0 ? "🏆 YOU DID IT!" : `~${weeksNeeded} week${weeksNeeded === 1 ? "" : "s"} at perfect pace`}
            </div>
          </div>
        </div>

        {/* Week nav */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#1e1640", border: "1px solid #3a2f6b", borderRadius: 14, padding: "12px 16px", marginBottom: 14 }}>
          <button onClick={() => save({ ...state, currentWeek: Math.max(1, w - 1) })} style={{ background: "#261d52", border: "1px solid #3a2f6b", color: "#f0eaff", borderRadius: 8, padding: "6px 12px", fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>◀</button>
          <div style={{ flex: 1, textAlign: "center", fontFamily: "'Fredoka One', cursive", fontSize: 18, color: "#5bd3f5" }}>Week {w}</div>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#f5c400", whiteSpace: "nowrap" }}>💰 {fmt(weekEarned)}</div>
          <button onClick={() => save({ ...state, currentWeek: w + 1 })} style={{ background: "#261d52", border: "1px solid #3a2f6b", color: "#f0eaff", borderRadius: 8, padding: "6px 12px", fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>▶</button>
        </div>

        {/* Day grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6, marginBottom: 14 }}>
          {DAYS.map((day, d) => {
            const earned = calcDay(state, w, d);
            const dd = getDayData(state, w, d);
            const hasData = dd.behavior || Object.values(dd.tasks).some(v => v);
            const dotColor = !hasData ? "rgba(255,255,255,0.04)" : earned >= 1.0 ? "#2cb84e" : earned > 0 ? "#f5c400" : "rgba(255,255,255,0.12)";
            const isActive = d === selectedDay;
            return (
              <div key={d} onClick={() => setSelectedDay(d)} style={{ background: isActive ? "#261d40" : "#1e1640", border: `2px solid ${isActive ? "#f5c400" : "#3a2f6b"}`, borderRadius: 12, padding: "8px 4px", textAlign: "center", cursor: "pointer", boxShadow: isActive ? "0 0 0 1px #f5c400" : "none" }}>
                <div style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, color: "#9b90c2", marginBottom: 4 }}>{day}</div>
                <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: 14, color: "#f5c400" }}>{earned > 0 ? fmt(earned) : "—"}</div>
                <div style={{ width: 8, height: 8, borderRadius: "50%", margin: "4px auto 0", background: dotColor }} />
              </div>
            );
          })}
        </div>

        {/* Daily checklist */}
        <div style={card}>
          <div style={cardHeader}>
            <div>
              <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: 16, color: "#5bd3f5" }}>📋 Today's Missions</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#9b90c2" }}>{DAY_FULL[selectedDay]} — Week {w}</div>
            </div>
            <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: 18, color: "#f5c400" }}>💰 {fmt(dayEarned)}</div>
          </div>

          {/* Behavior */}
          <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(58,47,107,0.5)" }}>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: "#9b90c2", marginBottom: 10 }}>🏫 School Behavior Color</div>
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
            <div style={{ fontSize: 12, fontWeight: 700, marginTop: 8, minHeight: 18, color: dayData.behavior ? (BEHAVIOR_COLORS.find(x => x.id === dayData.behavior)?.penalty ? "#e8293a" : "#2cb84e") : "#9b90c2" }}>
              {dayData.behavior
                ? (() => { const b = BEHAVIOR_COLORS.find(x => x.id === dayData.behavior); return b ? `${b.label}: ${b.note}` : ""; })()
                : "Tap a color to log today's school behavior"}
            </div>
          </div>

          {/* Tasks */}
          {TASKS.map((t, i) => {
            const done = !!dayData.tasks[t.id];
            return (
              <div key={t.id} onClick={e => toggleTask(t.id, e.currentTarget as HTMLElement)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 18px", borderBottom: i < TASKS.length - 1 ? "1px solid rgba(58,47,107,0.5)" : "none", cursor: "pointer", userSelect: "none" }}>
                <div style={{ width: 26, height: 26, borderRadius: 7, border: `2px solid ${done ? "#2cb84e" : "#3a2f6b"}`, background: done ? "#2cb84e" : "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 14, transition: "all 0.15s" }}>
                  {done ? "✓" : ""}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, textDecoration: done ? "line-through" : "none", color: done ? "#9b90c2" : "#f0eaff" }}>{t.name}</div>
                  <div style={{ fontSize: 11, color: "#9b90c2", marginTop: 2 }}>{t.note}</div>
                </div>
                <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: 14, color: "#f5c400", whiteSpace: "nowrap" }}>🪙 {fmt(t.earn)}</div>
              </div>
            );
          })}
        </div>

        {/* Payout summary */}
        <div style={{ background: "linear-gradient(135deg, #1d2a1a, #1a2630)", border: "2px solid rgba(44,184,78,0.4)", borderRadius: 18, padding: 18, marginBottom: 14 }}>
          <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: 16, color: "#2cb84e", marginBottom: 12 }}>💵 Weekly Payout Summary</div>
          {DAYS.map((_, d) => {
            const earned = calcDay(state, w, d);
            const dd = getDayData(state, w, d);
            const hasData = dd.behavior || Object.values(dd.tasks).some(v => v);
            return (
              <div key={d} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid rgba(44,184,78,0.12)", fontSize: 13 }}>
                <span style={{ color: "#9b90c2", fontWeight: 600 }}>{DAY_FULL[d]}</span>
                <span style={{ fontWeight: 800, color: earned > 0 ? "#f5c400" : "#9b90c2" }}>{hasData ? fmt(earned) : "—"}</span>
              </div>
            );
          })}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid rgba(44,184,78,0.12)", fontSize: 13 }}>
            <span style={{ color: "#f0eaff", fontWeight: 800, fontSize: 14 }}>📦 Week {w} Total</span>
            <span style={{ fontFamily: "'Fredoka One', cursive", fontSize: 20, color: "#2cb84e" }}>{fmt(weekEarned)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", fontSize: 13 }}>
            <span style={{ color: "#f0eaff", fontWeight: 800, fontSize: 14 }}>🏦 Total Saved</span>
            <span style={{ fontFamily: "'Fredoka One', cursive", fontSize: 20, color: "#2cb84e" }}>{fmt(totalEarned)} / $80.00</span>
          </div>
        </div>

        {/* Rules */}
        <div style={{ background: "#1e1640", border: "1px solid #3a2f6b", borderRadius: 18, padding: 18, marginBottom: 14 }}>
          <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: 16, color: "#e9529e", marginBottom: 12 }}>📜 The Rules</div>
          {[
            ["🟢", <><strong>Green = $0.25</strong> · Yellow = $0.10 · Red/Orange = <span style={{ color: "#e8293a" }}>−$0.25</span></>],
            ["⭐", <><strong>Blue/Purple/Pink/OTC bonuses</strong> add extra coins on top of your Green reward!</>],
            ["🦷", <><strong>Teeth brushing</strong> must be thorough &amp; timed both times — just checking the box doesn't count</>],
            ["🚪", <>Room not clean = <strong>no room coin that day</strong> (no penalty — just no earn)</>],
            ["❤️", <>Kind words to sister + bedtime hug both needed for that coin</>],
            ["🎒", <>School ready means: breakfast eaten, backpack packed, snack &amp; water packed, dressed for weather</>],
            ["🧹", <>Put-away means: shoes, coat, backpack, toys, books, papers — <em>all of it</em>, neatly where they belong</>],
            ["💸", <><strong>Perfect day = $1.35.</strong> Payout happens every Saturday. Max $9.45/week if perfect all 7 days.</>],
            ["🍄", <>At <strong>$80 saved</strong>, the game is yours. Average: about 8–9 weeks with good behavior!</>],
          ].map(([icon, text], i) => (
            <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8, fontSize: 13, lineHeight: 1.4 }}>
              <span style={{ flexShrink: 0, fontSize: 16 }}>{icon}</span>
              <span style={{ color: "#9b90c2" }}>{text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
