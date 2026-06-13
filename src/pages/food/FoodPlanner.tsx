import { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../../firebase";
import StarField from "../../components/StarField";
import ToolNav from "../../components/ToolNav";
import { Icon, type IconName } from "../../components/Icon";
import { useHouseholdUid } from "../../household";
import { useOverlay } from "../../overlay";
import { WisdomCard, quoteOfDay } from "../../components/Wisdom";
import { usePrefs } from "../../prefs";

const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const FOOD_TYPES = ["American","Italian","Mexican","Asian","Mediterranean","Indian","Greek","Breakfast","Soup/Salad","Other"];
const PROTEINS = ["None/Vegetarian","Chicken","Fish/Seafood","Beef","Pork","Turkey","Eggs","Beans/Legumes","Tofu","Other"];
const LABEL_SUGGESTIONS = ["Breakfast","Lunch","Dinner","Snack","Dessert","Baked goods","Side dish","Drinks"];

// Meal-time ordering for sorting entries within a day (breakfast → lunch → dinner → …).
const MEAL_ORDER = ["Breakfast","Lunch","Dinner","Snack","Dessert"];
function labelRank(label?: string): number {
  const i = MEAL_ORDER.indexOf(label ?? "");
  return i === -1 ? MEAL_ORDER.length : i;
}
function byLabel(a: PlanEntry, b: PlanEntry): number {
  return labelRank(a.label) - labelRank(b.label);
}

function useIsMobile(breakpoint = 760): boolean {
  const [m, setM] = useState(() => typeof window !== "undefined" && window.innerWidth < breakpoint);
  useEffect(() => {
    const h = () => setM(window.innerWidth < breakpoint);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, [breakpoint]);
  return m;
}

// ── Theme ─────────────────────────────────────────────────────────────────────
const BG = "var(--bg)";
const SURFACE = "var(--surface)";
const SURFACE_HOVER = "var(--surface-hi)";
const SURFACE_ACCENT = "rgba(167,139,250,0.10)";
const BORDER = "var(--border)";
const BORDER_ACCENT = "rgba(167,139,250,0.35)";
const LAV = "#a78bfa";
const LAV_DIM = "#7c5cbf";
const TEXT = "var(--text)";
const TEXT_DIM = "var(--text-dim)";
const TEXT_MUTED = "var(--text-muted)";
const DANGER = "#c0566a";
const INK = "#08101f"; // fixed dark ink for text/icons on accent fills (both themes)

const TYPE_COLOR: Record<string,string> = {
  "American":"#fb923c","Italian":"#4ade80","Mexican":"#fbbf24","Asian":"#a78bfa",
  "Mediterranean":"#22d3ee","Indian":"#f59e0b","Greek":"#60a5fa",
  "Breakfast":"#f97316","Soup/Salad":"#86efac","Other":"#9ca3af",
};
const PROTEIN_COLOR: Record<string,string> = {
  "None/Vegetarian":"#4ade80","Chicken":"#fb923c","Fish/Seafood":"#22d3ee",
  "Beef":"#f87171","Pork":"#fca5a5","Turkey":"#c4b5fd","Eggs":"#fbbf24",
  "Beans/Legumes":"#86efac","Tofu":"#a7f3d0","Other":"#9ca3af",
};

// ── Types ──────────────────────────────────────────────────────────────────────
interface Meal {
  id: string; name: string; type: string; protein: string; prepTime: string;
  servings: number; ingredients: string; notes: string;
  rating: number; ratingNote: string; mealService: boolean;
}
interface PlanEntry {
  id: string;
  mealId: string;
  day?: string;
  label?: string;
}
interface AppData {
  meals: Meal[];
  planEntries: PlanEntry[];
  groceryExtras: string[];
}

const SEED_DATA: AppData = {
  meals: [],
  planEntries: [],
  groceryExtras: [],
};

// ── Style helpers ─────────────────────────────────────────────────────────────
const pill = (color: string): React.CSSProperties => ({
  fontSize: 10, padding: "2px 8px", borderRadius: 20,
  background: `${color}1a`, color, border: `1px solid ${color}44`,
  fontWeight: 700, whiteSpace: "nowrap", textTransform: "uppercase",
  letterSpacing: 0.4, display: "inline-block",
});

function btn(bg: string, color?: string, border?: string): React.CSSProperties {
  const fg = color ?? (bg === "transparent" ? TEXT : INK);
  return {
    background: bg, color: fg, border: border ? `1px solid ${border}` : "none",
    borderRadius: 8, cursor: "pointer", fontFamily: "'Montserrat', sans-serif",
    fontWeight: 700, padding: "7px 16px", fontSize: 13,
    display: "inline-flex", alignItems: "center", gap: 6,
  };
}

const inputStyle: React.CSSProperties = {
  background: "var(--input-bg)", border: `1px solid ${BORDER}`,
  borderRadius: 8, padding: "9px 12px", fontSize: 14, color: TEXT,
  fontFamily: "'Montserrat', sans-serif", width: "100%",
  boxSizing: "border-box", outline: "none",
};
const selectStyle: React.CSSProperties = {
  ...inputStyle, appearance: "none",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%237a7890' fill='none' stroke-width='1.5'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", paddingRight: 32,
};
const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase",
  color: TEXT_DIM, display: "block", marginBottom: 5, fontFamily: "'Montserrat', sans-serif",
};

// ── Small components ───────────────────────────────────────────────────────────
function StarRating({ value, onChange, size = 18 }: { value: number; onChange?: (n: number) => void; size?: number }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {[1,2,3,4,5].map(n => (
        <span key={n}
          onClick={() => onChange && onChange(n === value ? 0 : n)}
          onMouseEnter={() => onChange && setHover(n)}
          onMouseLeave={() => onChange && setHover(0)}
          style={{ cursor: onChange ? "pointer" : "default", lineHeight: 1, display: "flex" }}>
          <Icon name="star" size={size} color={n <= (hover || value) ? LAV : TEXT_MUTED} />
        </span>
      ))}
    </div>
  );
}


function SectionDivider({ label, accent }: { label: string; accent: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: accent, flexShrink: 0 }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${accent}55, transparent)` }} />
    </div>
  );
}

function PlanEntryRow({ meal, label, onView, onEdit, onRemove }: { meal: Meal; label?: string; onView: () => void; onEdit: () => void; onRemove: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} onClick={onView}
      style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 16px", background: hov ? SURFACE_HOVER : SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, transition: "all 0.15s", cursor: "pointer" }}>
      <div style={{ flexShrink: 0 }}>
        <Icon name="utensils" size={18} color={TYPE_COLOR[meal.type] || TEXT_DIM} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: TEXT, lineHeight: 1.3 }}>{meal.name}</span>
          {label && (
            <span style={{ fontSize: 10, color: LAV_DIM, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", flexShrink: 0 }}>{label}</span>
          )}
        </div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
          <span style={pill(TYPE_COLOR[meal.type] || "#9ca3af")}>{meal.type}</span>
          <span style={pill(PROTEIN_COLOR[meal.protein] || "#9ca3af")}>{meal.protein}</span>
          {meal.prepTime && (
            <span style={{ ...pill(TEXT_DIM), display: "inline-flex", alignItems: "center", gap: 3 }}>
              <Icon name="clock" size={9} color={TEXT_DIM} />{meal.prepTime}
            </span>
          )}
          {meal.rating > 0 && (
            <span style={{ ...pill(LAV), display: "inline-flex", alignItems: "center", gap: 2 }}>
              {Array.from({ length: meal.rating }).map((_, i) => <Icon key={i} name="star" size={9} color={LAV} />)}
            </span>
          )}
        </div>
      </div>
      <button onClick={e => { e.stopPropagation(); onEdit(); }}
        style={{ background: "none", border: "none", cursor: "pointer", color: TEXT_MUTED, padding: "4px 8px", borderRadius: 6, display: "flex", alignItems: "center" }}
        onMouseEnter={e => (e.currentTarget.style.color = LAV)}
        onMouseLeave={e => (e.currentTarget.style.color = TEXT_MUTED)}>
        <Icon name="pencil" size={14} color="currentColor" />
      </button>
      <button onClick={e => { e.stopPropagation(); onRemove(); }}
        style={{ background: "none", border: "none", cursor: "pointer", color: TEXT_MUTED, padding: "4px 8px", borderRadius: 6, display: "flex", alignItems: "center" }}
        onMouseEnter={e => (e.currentTarget.style.color = DANGER)}
        onMouseLeave={e => (e.currentTarget.style.color = TEXT_MUTED)}>
        <Icon name="x" size={16} color="currentColor" />
      </button>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function FoodPlanner() {
  const { prefs } = usePrefs();
  const [data, setData] = useState<AppData>(SEED_DATA);
  const [view, setView] = useState("planner");
  const [plannerView, setPlannerView] = useState<"list" | "calendar">("calendar");
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const [mealForm, setMealForm] = useState<Meal | null>(null);
  const [filterType, setFilterType] = useState("all");
  const [filterProtein, setFilterProtein] = useState("all");
  const [filterRating, setFilterRating] = useState(0);
const [groceryChecked, setGroceryChecked] = useState<Record<string,boolean>>({});
  const [groceryInput, setGroceryInput] = useState("");
  const [ratingModal, setRatingModal] = useState<Meal | null>(null);
  const [searchQ, setSearchQ] = useState("");
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [addEntryDay, setAddEntryDay] = useState("");
  const [addEntryLabel, setAddEntryLabel] = useState("");
  const [addEntryMealId, setAddEntryMealId] = useState("");
  const [addEntrySearch, setAddEntrySearch] = useState("");
  const [editEntry, setEditEntry] = useState<PlanEntry | null>(null);
  const [editEntryDay, setEditEntryDay] = useState("");
  const [editEntryLabel, setEditEntryLabel] = useState("");
  const [viewMealId, setViewMealId] = useState<string | null>(null);
  const [viewMealEditing, setViewMealEditing] = useState(false);
  const viewMeal = viewMealId ? (data.meals.find(m => m.id === viewMealId) ?? null) : null;
  const [loaded, setLoaded] = useState(false);
  const uid = useHouseholdUid();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    try {
      const ref = doc(db, "users", uid, "food", "planner");
      const unsub = onSnapshot(ref, snap => {
        if (snap.exists()) {
          const d = snap.data() as Partial<AppData> & { weekPlan?: unknown };
          setData({
            ...SEED_DATA,
            ...d,
            meals: d.meals?.length ? d.meals : SEED_DATA.meals,
            planEntries: d.planEntries ?? [],
            groceryExtras: d.groceryExtras ?? [],
          });
        } else {
          setDoc(ref, SEED_DATA).catch(() => {});
        }
        setLoaded(true);
      }, () => { setLoaded(true); });
      return unsub;
    } catch { /* Firebase not configured */ }
  }, [uid]);

  useEffect(() => {
    const mealParam = searchParams.get("meal");
    if (mealParam && loaded) setViewMealId(mealParam);
  }, [loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = useCallback((d: AppData) => {
    setData(d);
    setDoc(doc(db, "users", uid, "food", "planner"), d).catch(err => console.error("Food save failed:", err));
  }, [uid]);

  const filteredMeals = data.meals.filter(m => {
    if (filterType !== "all" && m.type !== filterType) return false;
    if (filterProtein !== "all" && m.protein !== filterProtein) return false;
    if (filterRating > 0 && (m.rating || 0) < filterRating) return false;
    if (searchQ && !m.name.toLowerCase().includes(searchQ.toLowerCase())) return false;
    return true;
  });

  function openMealForm(meal: Meal | null = null) {
    setMealForm(meal ? { ...meal } : {
      id: Date.now().toString(), name: "", type: "Other", protein: "None/Vegetarian",
      ingredients: "", servings: 4, prepTime: "", notes: "", rating: 0, ratingNote: "", mealService: false,
    });
  }
  function saveMeal(m: Meal) {
    const meals = data.meals.find(x => x.id === m.id)
      ? data.meals.map(x => x.id === m.id ? m : x)
      : [...data.meals, m];
    save({ ...data, meals });
    setMealForm(null);
  }
  function deleteMeal(id: string) {
    save({
      ...data,
      meals: data.meals.filter(m => m.id !== id),
      planEntries: data.planEntries.filter(e => e.mealId !== id),
    });
  }
  function openAddEntry() {
    setAddEntryMealId(""); setAddEntryDay(""); setAddEntryLabel(""); setAddEntrySearch(""); setShowAddEntry(true);
  }
  function addPlanEntry() {
    if (!addEntryMealId) return;
    const entry: PlanEntry = {
      id: Date.now().toString(),
      mealId: addEntryMealId,
      day: addEntryDay || undefined,
      label: addEntryLabel.trim() || undefined,
    };
    save({ ...data, planEntries: [...data.planEntries, entry] });
    setShowAddEntry(false);
  }
  function removePlanEntry(id: string) {
    save({ ...data, planEntries: data.planEntries.filter(e => e.id !== id) });
  }
  function updatePlanEntryDay(entryId: string, day: string | undefined) {
    save({ ...data, planEntries: data.planEntries.map(e => e.id === entryId ? { ...e, day } : e) });
  }
  function openEditEntry(entry: PlanEntry) {
    setEditEntry(entry);
    setEditEntryDay(entry.day ?? "");
    setEditEntryLabel(entry.label ?? "");
  }
  function saveEditEntry() {
    if (!editEntry) return;
    save({
      ...data,
      planEntries: data.planEntries.map(e =>
        e.id === editEntry.id
          ? { ...e, day: editEntryDay || undefined, label: editEntryLabel.trim() || undefined }
          : e
      ),
    });
    setEditEntry(null);
  }
  function buildGroceryList() {
    const items: Record<string, { count: number; meals: string[]; manual: boolean }> = {};
    data.planEntries.forEach(entry => {
      const meal = data.meals.find(m => m.id === entry.mealId);
      if (!meal?.ingredients || meal.mealService) return;
      meal.ingredients.split("\n").forEach(line => {
        const t = line.trim(); if (!t) return;
        if (!items[t]) items[t] = { count: 0, meals: [], manual: false };
        items[t].count++;
        if (!items[t].meals.includes(meal.name)) items[t].meals.push(meal.name);
      });
    });
    (data.groceryExtras ?? []).forEach(t => {
      if (!items[t]) items[t] = { count: 0, meals: [], manual: true };
      else items[t].manual = true;
    });
    return items;
  }
  function addGroceryExtra() {
    const t = groceryInput.trim();
    if (!t) return;
    setGroceryInput("");
    if ((data.groceryExtras ?? []).includes(t)) return;
    save({ ...data, groceryExtras: [...(data.groceryExtras ?? []), t] });
  }
  function removeGroceryExtra(name: string) {
    save({ ...data, groceryExtras: (data.groceryExtras ?? []).filter(x => x !== name) });
  }

  const groceryItems = buildGroceryList();
  const plannedCount = data.planEntries.length;

  // Group entries
  const entriesByDay: Record<string, PlanEntry[]> = {};
  const noDay: PlanEntry[] = [];
  data.planEntries.forEach(entry => {
    if (entry.day) {
      if (!entriesByDay[entry.day]) entriesByDay[entry.day] = [];
      entriesByDay[entry.day].push(entry);
    } else {
      noDay.push(entry);
    }
  });
  // Sort each day's meals breakfast → lunch → dinner → … (used by both views).
  Object.values(entriesByDay).forEach(list => list.sort(byLabel));
  noDay.sort(byLabel);
  const daysWithEntries = DAYS.filter(d => entriesByDay[d]?.length > 0);

  // Group no-day entries by label
  const noDayByLabel: Record<string, PlanEntry[]> = {};
  const noDayNoLabel: PlanEntry[] = [];
  noDay.forEach(entry => {
    if (entry.label) {
      if (!noDayByLabel[entry.label]) noDayByLabel[entry.label] = [];
      noDayByLabel[entry.label].push(entry);
    } else {
      noDayNoLabel.push(entry);
    }
  });
  const labelsWithEntries = Object.keys(noDayByLabel).sort();

  const navItems: { id: string; label: string; icon: IconName }[] = [
    { id: "planner", label: "This Week", icon: "calendar" },
    { id: "library", label: `Recipes (${data.meals.length})`, icon: "book" },
    { id: "grocery", label: `Grocery${plannedCount ? ` (${plannedCount})` : ""}`, icon: "bag" },
  ];

  // Compact draggable meal card used in the calendar grid + unscheduled tray.
  const planCard = (entry: PlanEntry) => {
    const meal = data.meals.find(m => m.id === entry.mealId);
    if (!meal) return null;
    return (
      <div key={entry.id}
        draggable={!isMobile}
        onDragStart={e => { setDragId(entry.id); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", entry.id); }}
        onDragEnd={() => { setDragId(null); setDragOverDay(null); }}
        onClick={() => setViewMealId(meal.id)}
        style={{
          display: "flex", alignItems: "center", gap: 6, padding: "7px 8px", borderRadius: 9,
          background: SURFACE_HOVER, border: `1px solid ${BORDER}`,
          borderLeft: `3px solid ${TYPE_COLOR[meal.type] || LAV}`,
          cursor: isMobile ? "pointer" : "grab", opacity: dragId === entry.id ? 0.4 : 1,
        }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {entry.label && <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: LAV_DIM }}>{entry.label}</div>}
          <div style={{ fontSize: 12, fontWeight: 600, color: TEXT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{meal.name}</div>
        </div>
        <button onClick={e => { e.stopPropagation(); removePlanEntry(entry.id); }}
          style={{ background: "none", border: "none", cursor: "pointer", color: TEXT_MUTED, padding: 2, display: "flex", flexShrink: 0 }}
          onMouseEnter={e => (e.currentTarget.style.color = DANGER)}
          onMouseLeave={e => (e.currentTarget.style.color = TEXT_MUTED)}>
          <Icon name="x" size={12} color="currentColor" />
        </button>
      </div>
    );
  };

  return (
    <div style={{ background: BG, minHeight: "100vh", fontFamily: "'Montserrat', sans-serif", color: TEXT, position: "relative" }}>
      <StarField />

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* ── HEADER ── */}
        <div style={{ padding: "14px 24px", minHeight: 60, borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: 12, boxSizing: "border-box" }}>
          <Link to="/app" style={{ textDecoration: "none", color: TEXT_DIM, fontSize: 13, fontWeight: 600, opacity: 0.7, flexShrink: 0, transition: "opacity 0.15s" }}
            onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.opacity = "1"}
            onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.opacity = "0.7"}>
            ← Home
          </Link>
          <div style={{ width: 1, height: 14, background: "var(--border)", flexShrink: 0 }} />
          <ToolNav current="food" />
        </div>

        {/* ── SUB-NAV ── */}
        <div style={{ display: "flex", borderBottom: `1px solid ${BORDER}`, background: "var(--surface)", overflowX: "auto" }}>
          {navItems.map(n => (
            <button key={n.id} onClick={() => setView(n.id)} style={{
              padding: "11px 18px", border: "none", cursor: "pointer",
              fontFamily: "'Montserrat', sans-serif", fontSize: 13, fontWeight: 700,
              background: "transparent", whiteSpace: "nowrap",
              color: view === n.id ? LAV : TEXT_DIM,
              borderBottom: view === n.id ? `2px solid ${LAV}` : "2px solid transparent",
              transition: "all 0.15s",
              display: "flex", alignItems: "center", gap: 7,
            }}>
              <Icon name={n.icon} size={14} color={view === n.id ? LAV : TEXT_DIM} />
              {n.label}
            </button>
          ))}
        </div>

        {/* ── BODY ── */}
        <div style={{ padding: "28px 24px 60px", maxWidth: 1100, margin: "0 auto" }}>
          {prefs.wisdomPages.includes("food") && (
            <div style={{ marginBottom: 20 }}>
              <WisdomCard quote={quoteOfDay(prefs.wisdomTraditions)} compact />
            </div>
          )}

          {/* ── PLANNER ── */}
          {view === "planner" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28, gap: 12, flexWrap: "wrap" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: TEXT }}>This Week</div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {/* List / Week toggle */}
                  <div style={{ display: "flex", gap: 4, background: SURFACE, borderRadius: 9, padding: 3 }}>
                    {([["calendar", "Week"], ["list", "List"]] as const).map(([v, lbl]) => (
                      <button key={v} onClick={() => setPlannerView(v)}
                        style={{ padding: "5px 14px", borderRadius: 7, border: "none", cursor: "pointer", fontFamily: "'Montserrat', sans-serif", fontSize: 12, fontWeight: 700,
                          background: plannerView === v ? LAV : "transparent", color: plannerView === v ? INK : TEXT_DIM }}>
                        {lbl}
                      </button>
                    ))}
                  </div>
                  <button style={btn(LAV)} onClick={openAddEntry}>+ Add meal</button>
                  {plannedCount > 0 && (
                    <button style={btn("transparent", DANGER, BORDER)} onClick={() => save({ ...data, planEntries: [] })}>Clear</button>
                  )}
                </div>
              </div>

              {!loaded ? (
                <div style={{ textAlign: "center", padding: "60px 20px", color: TEXT_MUTED }}>
                  <div style={{ fontSize: 14, color: TEXT_DIM }}>Loading…</div>
                </div>
              ) : plannerView === "calendar" ? (
                <div>
                  {!isMobile && (
                    <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 10 }}>Drag meals between days to reschedule.</div>
                  )}
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(7, 1fr)", gap: 8 }}>
                    {DAYS.map(day => {
                      const dayEntries = entriesByDay[day] ?? [];
                      const over = dragOverDay === day;
                      return (
                        <div key={day}
                          onDragOver={e => { if (dragId) { e.preventDefault(); if (dragOverDay !== day) setDragOverDay(day); } }}
                          onDragLeave={() => setDragOverDay(d => (d === day ? null : d))}
                          onDrop={e => { e.preventDefault(); if (dragId) { updatePlanEntryDay(dragId, day); setDragId(null); setDragOverDay(null); } }}
                          style={{ background: over ? SURFACE_ACCENT : SURFACE, border: `1px solid ${over ? BORDER_ACCENT : BORDER}`, borderRadius: 12, minHeight: isMobile ? "auto" : 160, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                          <div style={{ padding: "8px 10px", borderBottom: `1px solid ${BORDER}`, fontSize: 11, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", color: LAV }}>
                            {isMobile ? day : day.slice(0, 3)}
                          </div>
                          <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                            {dayEntries.map(e => planCard(e))}
                            {dayEntries.length === 0 && (
                              <div style={{ fontSize: 11, color: TEXT_MUTED, fontStyle: "italic", textAlign: "center", padding: "10px 0" }}>
                                {!isMobile && dragId ? "Drop here" : "—"}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Unscheduled tray — drop a meal here to clear its day */}
                  {(noDay.length > 0 || dragId) && (
                    <div style={{ marginTop: 20 }}
                      onDragOver={e => { if (dragId) { e.preventDefault(); setDragOverDay("__unscheduled__"); } }}
                      onDrop={e => { e.preventDefault(); if (dragId) { updatePlanEntryDay(dragId, undefined); setDragId(null); setDragOverDay(null); } }}>
                      <SectionDivider label="Unscheduled" accent={TEXT_MUTED} />
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, minHeight: 44, background: dragOverDay === "__unscheduled__" ? SURFACE_ACCENT : "transparent", border: `1px dashed ${dragOverDay === "__unscheduled__" ? BORDER_ACCENT : BORDER}`, borderRadius: 10, padding: 8 }}>
                        {noDay.length === 0
                          ? <div style={{ fontSize: 11, color: TEXT_MUTED, fontStyle: "italic" }}>Drop a meal here to unschedule it.</div>
                          : noDay.map(e => <div key={e.id} style={{ minWidth: 170 }}>{planCard(e)}</div>)}
                      </div>
                    </div>
                  )}
                </div>
              ) : plannedCount === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 20px", color: TEXT_MUTED }}>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}><Icon name="utensils" size={48} color={TEXT_MUTED} /></div>
                  <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: TEXT_DIM }}>Nothing planned yet</div>
                  <div style={{ fontSize: 14, lineHeight: 1.6 }}>Add meals from your recipe library to build the week.</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
                  {/* Day sections */}
                  {daysWithEntries.map(day => (
                    <div key={day}>
                      <SectionDivider label={day} accent={LAV} />
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {entriesByDay[day].map(entry => {
                          const meal = data.meals.find(m => m.id === entry.mealId);
                          if (!meal) return null;
                          return <PlanEntryRow key={entry.id} meal={meal} label={entry.label} onView={() => setViewMealId(meal.id)} onEdit={() => openEditEntry(entry)} onRemove={() => removePlanEntry(entry.id)} />;
                        })}
                      </div>
                    </div>
                  ))}
                  {/* Label sections (no day assigned) */}
                  {labelsWithEntries.map(lbl => (
                    <div key={lbl}>
                      <SectionDivider label={lbl} accent={LAV_DIM} />
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {noDayByLabel[lbl].map(entry => {
                          const meal = data.meals.find(m => m.id === entry.mealId);
                          if (!meal) return null;
                          return <PlanEntryRow key={entry.id} meal={meal} label={entry.label} onView={() => setViewMealId(meal.id)} onEdit={() => openEditEntry(entry)} onRemove={() => removePlanEntry(entry.id)} />;
                        })}
                      </div>
                    </div>
                  ))}
                  {/* Unlabeled, no day */}
                  {noDayNoLabel.length > 0 && (
                    <div>
                      <SectionDivider label="Anytime" accent={TEXT_MUTED} />
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {noDayNoLabel.map(entry => {
                          const meal = data.meals.find(m => m.id === entry.mealId);
                          if (!meal) return null;
                          return <PlanEntryRow key={entry.id} meal={meal} onView={() => setViewMealId(meal.id)} onEdit={() => openEditEntry(entry)} onRemove={() => removePlanEntry(entry.id)} />;
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── LIBRARY ── */}
          {view === "library" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: TEXT }}>Recipe Book</div>
                <button style={btn(LAV)} onClick={() => openMealForm()}>+ Add Recipe</button>
              </div>

              <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
                <div style={{ marginBottom: 10 }}>
                  <label style={labelStyle}>Search</label>
                  <input style={inputStyle} value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search recipes…"
                    onFocus={e => (e.target.style.borderColor = LAV_DIM)} onBlur={e => (e.target.style.borderColor = BORDER)} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={labelStyle}>Cuisine</label>
                    <select style={selectStyle} value={filterType} onChange={e => setFilterType(e.target.value)}>
                      <option value="all">All Types</option>
                      {FOOD_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Protein</label>
                    <select style={selectStyle} value={filterProtein} onChange={e => setFilterProtein(e.target.value)}>
                      <option value="all">All Proteins</option>
                      {PROTEINS.map(p => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Min Rating</label>
                    <select style={selectStyle} value={filterRating} onChange={e => setFilterRating(Number(e.target.value))}>
                      <option value={0}>Any</option>
                      {[5,4,3,2,1].map(r => <option key={r} value={r}>{r}+ ★</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div style={{ fontSize: 12, color: TEXT_MUTED, marginBottom: 14, fontWeight: 700 }}>
                Showing {filteredMeals.length} of {data.meals.length} recipes
              </div>

              {filteredMeals.length === 0 && (
                <div style={{ textAlign: "center", padding: 48, color: TEXT_MUTED }}>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}><Icon name="list" size={40} color={TEXT_MUTED} /></div>
                  <div style={{ fontSize: 16, color: TEXT_DIM }}>Nothing matches your filters</div>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 12 }}>
                {filteredMeals.map(m => (
                  <div key={m.id} onClick={() => setViewMealId(m.id)}
                    style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderTop: `2px solid ${TYPE_COLOR[m.type] || BORDER}`, borderRadius: 12, padding: "14px 16px", transition: "transform 0.15s, box-shadow 0.15s", cursor: "pointer" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 6px 20px rgba(0,0,0,0.3)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ""; (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
                      <div style={{ fontWeight: 800, fontSize: 15, color: TEXT, lineHeight: 1.3, flex: 1, marginRight: 8 }}>{m.name}</div>
                      <Icon name="utensils" size={18} color={TYPE_COLOR[m.type] || TEXT_DIM} />
                    </div>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8, alignItems: "center" }}>
                      <span style={pill(TYPE_COLOR[m.type] || "#9ca3af")}>{m.type}</span>
                      <span style={pill(PROTEIN_COLOR[m.protein] || "#9ca3af")}>{m.protein}</span>
                      {m.prepTime && (
                        <span style={{ ...pill(TEXT_DIM), display: "inline-flex", alignItems: "center", gap: 3 }}>
                          <Icon name="clock" size={9} color={TEXT_DIM} />{m.prepTime}
                        </span>
                      )}
                      {m.mealService && <span style={pill("#22d3ee")}>Meal service</span>}
                    </div>
                    {m.rating > 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                        <StarRating value={m.rating} size={13} />
                        {m.ratingNote && <span style={{ fontSize: 11, color: TEXT_DIM, fontStyle: "italic" }}>{m.ratingNote}</span>}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 6, marginTop: 10 }} onClick={e => e.stopPropagation()}>
                      <button style={{ ...btn("transparent", TEXT_DIM, BORDER), fontSize: 11, padding: "5px 12px", display: "flex", alignItems: "center", gap: 5 }} onClick={() => { setViewMealEditing(true); setViewMealId(m.id); }}><Icon name="pencil" size={11} color={TEXT_DIM} /> Edit</button>
                      <button style={{ ...btn(SURFACE_ACCENT, LAV), fontSize: 11, padding: "5px 12px", border: `1px solid ${BORDER_ACCENT}`, display: "flex", alignItems: "center", gap: 5 }} onClick={() => setRatingModal({ ...m })}><Icon name="star" size={11} color={LAV} /> Rate</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── GROCERY ── */}
          {view === "grocery" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: TEXT }}>Grocery List</div>
                <button style={{ ...btn("transparent", TEXT_DIM, BORDER), fontSize: 12, padding: "6px 14px" }} onClick={() => setGroceryChecked({})}>Uncheck All</button>
              </div>

              {/* Add an item that isn't part of a meal */}
              <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                <input style={{ ...inputStyle, flex: 1 }} value={groceryInput}
                  onChange={e => setGroceryInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") addGroceryExtra(); }}
                  placeholder="Add an item (e.g. paper towels, milk)…"
                  onFocus={e => (e.target.style.borderColor = LAV_DIM)} onBlur={e => (e.target.style.borderColor = BORDER)} />
                <button style={{ ...btn(LAV), opacity: groceryInput.trim() ? 1 : 0.5 }} onClick={addGroceryExtra} disabled={!groceryInput.trim()}>+ Add</button>
              </div>

              {Object.keys(groceryItems).length === 0 ? (
                <div style={{ textAlign: "center", padding: 56, color: TEXT_MUTED }}>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}><Icon name="bag" size={48} color={TEXT_MUTED} /></div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: TEXT_DIM, marginBottom: 6 }}>Nothing on the list yet</div>
                  <div style={{ fontSize: 14 }}>Add meals to your week or add individual items above.</div>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(270px,1fr))", gap: 8 }}>
                  {Object.entries(groceryItems).sort((a,b) => a[0].localeCompare(b[0])).map(([item, info]) => (
                    <div key={item} onClick={() => setGroceryChecked(c => ({ ...c, [item]: !c[item] }))}
                      style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: groceryChecked[item] ? "transparent" : SURFACE, border: `1px solid ${groceryChecked[item] ? BORDER : BORDER_ACCENT}`, borderLeft: `3px solid ${groceryChecked[item] ? TEXT_MUTED : LAV}`, borderRadius: 10, cursor: "pointer", opacity: groceryChecked[item] ? 0.4 : 1, transition: "all 0.15s" }}>
                      <div style={{ width: 20, height: 20, borderRadius: 5, border: `1.5px solid ${groceryChecked[item] ? LAV : BORDER_ACCENT}`, background: groceryChecked[item] ? LAV : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {groceryChecked[item] && <Icon name="check" size={12} color={INK} />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, textDecoration: groceryChecked[item] ? "line-through" : "none", color: TEXT }}>{item}</div>
                        <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 1 }}>{info.meals.length ? info.meals.join(", ") : "Added manually"}</div>
                      </div>
                      {info.count > 1 && <span style={{ ...pill(LAV_DIM), fontSize: 9 }}>×{info.count}</span>}
                      {info.manual && (
                        <button onClick={e => { e.stopPropagation(); removeGroceryExtra(item); }}
                          style={{ background: "none", border: "none", cursor: "pointer", color: TEXT_MUTED, padding: 4, display: "flex", alignItems: "center", flexShrink: 0 }}
                          onMouseEnter={e => (e.currentTarget.style.color = DANGER)}
                          onMouseLeave={e => (e.currentTarget.style.color = TEXT_MUTED)}>
                          <Icon name="x" size={14} color="currentColor" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}


        </div>
      </div>

      {/* ── RECIPE DETAIL ── */}
      {viewMeal && (
        <RecipeDetail
          meal={viewMeal}
          planEntries={data.planEntries}
          initialEditing={viewMealEditing}
          onClose={() => { setViewMealId(null); setViewMealEditing(false); }}
          onSave={(m) => saveMeal(m)}
          onDelete={() => { deleteMeal(viewMeal.id); setViewMealId(null); setViewMealEditing(false); }}
          onAddToPlan={() => {
            const entry: PlanEntry = { id: Date.now().toString(), mealId: viewMeal.id };
            save({ ...data, planEntries: [...data.planEntries, entry] });
          }}
          onRemoveFromPlan={(entryId) => removePlanEntry(entryId)}
          onUpdatePlanDay={(entryId, day) => updatePlanEntryDay(entryId, day)}
        />
      )}

      {/* ── MEAL FORM MODAL ── */}
      {mealForm && (
        <Modal onClose={() => setMealForm(null)} title={data.meals.find(m => m.id === mealForm.id) ? "Edit Recipe" : "New Recipe"} accentColor={LAV}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={labelStyle}>Recipe Name</label>
              <input style={inputStyle} value={mealForm.name} onChange={e => setMealForm({ ...mealForm, name: e.target.value })} placeholder="What's cooking?"
                onFocus={e => (e.target.style.borderColor = LAV_DIM)} onBlur={e => (e.target.style.borderColor = BORDER)} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div><label style={labelStyle}>Cuisine Type</label><select style={selectStyle} value={mealForm.type} onChange={e => setMealForm({ ...mealForm, type: e.target.value })}>{FOOD_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
              <div><label style={labelStyle}>Protein</label><select style={selectStyle} value={mealForm.protein} onChange={e => setMealForm({ ...mealForm, protein: e.target.value })}>{PROTEINS.map(p => <option key={p}>{p}</option>)}</select></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div><label style={labelStyle}>Prep Time</label><input style={inputStyle} value={mealForm.prepTime} onChange={e => setMealForm({ ...mealForm, prepTime: e.target.value })} placeholder="e.g. 30 min" /></div>
              <div><label style={labelStyle}>Servings</label><input type="number" style={inputStyle} value={mealForm.servings} onChange={e => setMealForm({ ...mealForm, servings: Number(e.target.value) })} min={1} /></div>
            </div>
            <div><label style={labelStyle}>Ingredients (one per line)</label><textarea style={{ ...inputStyle, resize: "vertical" }} rows={5} value={mealForm.ingredients} onChange={e => setMealForm({ ...mealForm, ingredients: e.target.value })} /></div>
            <div><label style={labelStyle}>Notes / Instructions</label><textarea style={{ ...inputStyle, resize: "vertical" }} rows={3} value={mealForm.notes} onChange={e => setMealForm({ ...mealForm, notes: e.target.value })} /></div>
            <div onClick={() => setMealForm({ ...mealForm, mealService: !mealForm.mealService })}
              style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <div style={{ width: 20, height: 20, borderRadius: 5, border: `1.5px solid ${mealForm.mealService ? LAV : BORDER_ACCENT}`, background: mealForm.mealService ? LAV : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {mealForm.mealService && <Icon name="check" size={12} color={INK} />}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>Meal service</div>
                <div style={{ fontSize: 11, color: TEXT_MUTED }}>Ingredients are provided — exclude from grocery list</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "space-between", marginTop: 4 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={btn(LAV)} onClick={() => saveMeal(mealForm)} disabled={!mealForm.name.trim()}>Save</button>
                <button style={btn("transparent", TEXT_DIM, BORDER)} onClick={() => setMealForm(null)}>Cancel</button>
              </div>
              {data.meals.find(m => m.id === mealForm.id) && (
                <button onClick={() => { deleteMeal(mealForm.id); setMealForm(null); }}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: DANGER, fontWeight: 700, fontFamily: "'Montserrat', sans-serif" }}>
                  Delete
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* ── ADD ENTRY MODAL ── */}
      {showAddEntry && (
        <Modal onClose={() => setShowAddEntry(false)} title="Add to this week" accentColor={LAV} maxWidth={480}>
          {/* Day */}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Day (optional)</label>
            <select style={selectStyle} value={addEntryDay} onChange={e => setAddEntryDay(e.target.value)}>
              <option value="">No specific day</option>
              {DAYS.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>

          {/* Label */}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Label (optional)</label>
            <input style={inputStyle} placeholder="e.g. Breakfast, Snack, Dessert…" value={addEntryLabel} onChange={e => setAddEntryLabel(e.target.value)}
              onFocus={e => (e.target.style.borderColor = LAV_DIM)} onBlur={e => (e.target.style.borderColor = BORDER)} />
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 7 }}>
              {LABEL_SUGGESTIONS.map(s => (
                <button key={s} onClick={() => setAddEntryLabel(s)}
                  style={{ ...btn(addEntryLabel === s ? SURFACE_ACCENT : "transparent", addEntryLabel === s ? LAV : TEXT_MUTED, addEntryLabel === s ? BORDER_ACCENT : BORDER), fontSize: 11, padding: "4px 10px" }}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Recipe picker */}
          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>Choose a recipe</label>
            <input style={inputStyle} placeholder="Search recipes…" value={addEntrySearch} onChange={e => setAddEntrySearch(e.target.value)}
              onFocus={e => (e.target.style.borderColor = LAV_DIM)} onBlur={e => (e.target.style.borderColor = BORDER)} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 260, overflowY: "auto", marginBottom: 14 }}>
            {data.meals
              .filter(m => !addEntrySearch || m.name.toLowerCase().includes(addEntrySearch.toLowerCase()))
              .map(m => {
                const sel = addEntryMealId === m.id;
                return (
                  <div key={m.id} onClick={() => setAddEntryMealId(m.id)}
                    style={{ padding: "10px 14px", borderRadius: 10, cursor: "pointer", background: sel ? SURFACE_ACCENT : SURFACE, border: `1px solid ${sel ? BORDER_ACCENT : BORDER}`, transition: "all 0.12s" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <Icon name="utensils" size={15} color={TYPE_COLOR[m.type] || TEXT_DIM} />
                      <span style={{ fontWeight: 700, fontSize: 14, color: sel ? LAV : TEXT }}>{m.name}</span>
                    </div>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      <span style={pill(TYPE_COLOR[m.type] || "#9ca3af")}>{m.type}</span>
                      <span style={pill(PROTEIN_COLOR[m.protein] || "#9ca3af")}>{m.protein}</span>
                    </div>
                  </div>
                );
              })}
          </div>
          <button style={{ ...btn(LAV), width: "100%", justifyContent: "center", opacity: addEntryMealId ? 1 : 0.5 }}
            onClick={addPlanEntry} disabled={!addEntryMealId}>
            Add to plan
          </button>
        </Modal>
      )}

      {/* ── EDIT ENTRY MODAL ── */}
      {editEntry && (() => {
        const meal = data.meals.find(m => m.id === editEntry.mealId);
        return (
          <Modal onClose={() => setEditEntry(null)} title={meal?.name ?? "Edit entry"} accentColor={LAV} maxWidth={420}>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Day (optional)</label>
              <select style={selectStyle} value={editEntryDay} onChange={e => setEditEntryDay(e.target.value)}>
                <option value="">No specific day</option>
                {DAYS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Label (optional)</label>
              <input style={inputStyle} placeholder="e.g. Breakfast, Snack, Dessert…" value={editEntryLabel} onChange={e => setEditEntryLabel(e.target.value)}
                onFocus={e => (e.target.style.borderColor = LAV_DIM)} onBlur={e => (e.target.style.borderColor = BORDER)} />
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 7 }}>
                {LABEL_SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => setEditEntryLabel(s)}
                    style={{ ...btn(editEntryLabel === s ? SURFACE_ACCENT : "transparent", editEntryLabel === s ? LAV : TEXT_MUTED, editEntryLabel === s ? BORDER_ACCENT : BORDER), fontSize: 11, padding: "4px 10px" }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={btn(LAV)} onClick={saveEditEntry}>Save</button>
              <button style={btn("transparent", TEXT_DIM, BORDER)} onClick={() => setEditEntry(null)}>Cancel</button>
            </div>
          </Modal>
        );
      })()}

      {/* ── RATING MODAL ── */}
      {ratingModal && (
        <Modal onClose={() => setRatingModal(null)} title={`Rate: ${ratingModal.name}`} accentColor={LAV} maxWidth={380}>
          <div style={{ marginBottom: 16 }}>
            <StarRating value={ratingModal.rating || 0} onChange={r => setRatingModal({ ...ratingModal, rating: r })} size={32} />
          </div>
          <label style={labelStyle}>Notes</label>
          <textarea style={{ ...inputStyle, resize: "vertical", marginBottom: 16 }} value={ratingModal.ratingNote || ""} onChange={e => setRatingModal({ ...ratingModal, ratingNote: e.target.value })} rows={3} placeholder="e.g. kids loved it, a bit spicy next time…" />
          <div style={{ display: "flex", gap: 8 }}>
            <button style={btn(LAV)} onClick={() => {
              save({ ...data, meals: data.meals.map(m => m.id === ratingModal!.id ? { ...m, rating: ratingModal!.rating, ratingNote: ratingModal!.ratingNote } : m) });
              setRatingModal(null);
            }}>Save Rating</button>
            <button style={btn("transparent", TEXT_DIM, BORDER)} onClick={() => setRatingModal(null)}>Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Recipe Detail (full-screen overlay) ───────────────────────────────────────
function RecipeDetail({ meal, planEntries, initialEditing = false, onClose, onSave, onDelete, onAddToPlan, onRemoveFromPlan, onUpdatePlanDay }: {
  meal: Meal;
  planEntries: PlanEntry[];
  initialEditing?: boolean;
  onClose: () => void;
  onSave: (m: Meal) => void;
  onDelete: () => void;
  onAddToPlan: () => void;
  onRemoveFromPlan: (entryId: string) => void;
  onUpdatePlanDay: (entryId: string, day: string | undefined) => void;
}) {
  useOverlay();
  const [editing, setEditing] = useState(initialEditing);
  const [draft, setDraft] = useState<Meal>(meal);
  const ingredients = meal.ingredients.split("\n").filter(l => l.trim());
  const existingEntry = planEntries.find(e => e.mealId === meal.id);
  const isInPlan = !!existingEntry;
  const [planDay, setPlanDay] = useState(existingEntry?.day ?? "");

  useEffect(() => {
    setPlanDay(existingEntry?.day ?? "");
  }, [existingEntry?.id]);

  function handleDayChange(newDay: string) {
    setPlanDay(newDay);
    if (existingEntry) onUpdatePlanDay(existingEntry.id, newDay || undefined);
  }
  function startEdit() { setDraft({ ...meal }); setEditing(true); }
  function save() { if (!draft.name.trim()) return; onSave(draft); setEditing(false); }

  const iconBtn = (onClick: () => void, icon: "x" | "pencil", hoverColor: string) => (
    <button onClick={onClick}
      style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 8, cursor: "pointer", color: TEXT_DIM, padding: "6px 10px", display: "flex", alignItems: "center", lineHeight: 1, flexShrink: 0 }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = hoverColor; (e.currentTarget as HTMLButtonElement).style.borderColor = hoverColor + "60"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = TEXT_DIM; (e.currentTarget as HTMLButtonElement).style.borderColor = BORDER; }}>
      <Icon name={icon} size={16} color="currentColor" />
    </button>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: BG, zIndex: 50, overflowY: "auto", fontFamily: "'Montserrat', sans-serif", color: TEXT }}>
      <StarField />
      <div style={{ position: "relative", zIndex: 1 }}>

        {/* Header */}
        <div style={{ position: "sticky", top: 0, zIndex: 10, background: "rgba(6,9,26,0.92)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", padding: "0 20px", minHeight: 60, gap: 12, boxSizing: "border-box" }}>
          {iconBtn(editing ? () => setEditing(false) : onClose, "x", TEXT)}
          <div style={{ flex: 1, textAlign: "center", fontWeight: 800, fontSize: 16, color: TEXT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", letterSpacing: -0.2 }}>
            {editing ? "Edit Recipe" : meal.name}
          </div>
          {editing
            ? <button onClick={save} disabled={!draft.name.trim()} style={{ ...btn(LAV), opacity: draft.name.trim() ? 1 : 0.5 }}>Save</button>
            : iconBtn(startEdit, "pencil", LAV)}
        </div>

        {editing ? (
          /* ── Inline editor ── */
          <div style={{ padding: "28px 24px 80px", maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={labelStyle}>Recipe Name</label>
              <input style={inputStyle} value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="What's cooking?"
                onFocus={e => (e.target.style.borderColor = LAV_DIM)} onBlur={e => (e.target.style.borderColor = BORDER)} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div><label style={labelStyle}>Cuisine Type</label><select style={selectStyle} value={draft.type} onChange={e => setDraft({ ...draft, type: e.target.value })}>{FOOD_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
              <div><label style={labelStyle}>Protein</label><select style={selectStyle} value={draft.protein} onChange={e => setDraft({ ...draft, protein: e.target.value })}>{PROTEINS.map(p => <option key={p}>{p}</option>)}</select></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div><label style={labelStyle}>Prep Time</label><input style={inputStyle} value={draft.prepTime} onChange={e => setDraft({ ...draft, prepTime: e.target.value })} placeholder="e.g. 30 min" /></div>
              <div><label style={labelStyle}>Servings</label><input type="number" style={inputStyle} value={draft.servings} onChange={e => setDraft({ ...draft, servings: Number(e.target.value) })} min={1} /></div>
            </div>
            <div><label style={labelStyle}>Ingredients (one per line)</label><textarea style={{ ...inputStyle, resize: "vertical" }} rows={6} value={draft.ingredients} onChange={e => setDraft({ ...draft, ingredients: e.target.value })} /></div>
            <div><label style={labelStyle}>Notes / Instructions</label><textarea style={{ ...inputStyle, resize: "vertical" }} rows={4} value={draft.notes} onChange={e => setDraft({ ...draft, notes: e.target.value })} /></div>
            <div onClick={() => setDraft({ ...draft, mealService: !draft.mealService })}
              style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <div style={{ width: 20, height: 20, borderRadius: 5, border: `1.5px solid ${draft.mealService ? LAV : BORDER_ACCENT}`, background: draft.mealService ? LAV : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {draft.mealService && <Icon name="check" size={12} color={INK} />}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>Meal service</div>
                <div style={{ fontSize: 11, color: TEXT_MUTED }}>Ingredients are provided — exclude from grocery list</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
              <button style={btn(LAV)} onClick={save} disabled={!draft.name.trim()}>Save</button>
              <button style={btn("transparent", TEXT_DIM, BORDER)} onClick={() => setEditing(false)}>Cancel</button>
              <button onClick={onDelete}
                style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", fontSize: 12, color: DANGER, fontWeight: 700, fontFamily: "'Montserrat', sans-serif", display: "flex", alignItems: "center", gap: 5 }}>
                <Icon name="trash" size={14} color={DANGER} /> Delete
              </button>
            </div>
          </div>
        ) : (

        /* ── Body (view) ── */
        <div style={{ padding: "28px 24px 80px", maxWidth: 720, margin: "0 auto" }}>

          {/* Meta pills */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginBottom: 16 }}>
            <span style={pill(TYPE_COLOR[meal.type] || "#9ca3af")}>{meal.type}</span>
            <span style={pill(PROTEIN_COLOR[meal.protein] || "#9ca3af")}>{meal.protein}</span>
            {meal.prepTime && (
              <span style={{ ...pill(TEXT_DIM), display: "inline-flex", alignItems: "center", gap: 3 }}>
                <Icon name="clock" size={9} color={TEXT_DIM} />{meal.prepTime}
              </span>
            )}
            {meal.servings > 0 && <span style={pill(TEXT_DIM)}>{meal.servings} servings</span>}
          </div>

          {/* Plan toggle: Add / In-plan + day picker */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 24 }}>
            {isInPlan ? (
              <>
                <select value={planDay} onChange={e => handleDayChange(e.target.value)}
                  style={{ ...selectStyle, width: "auto", minWidth: 132, colorScheme: "dark" }}>
                  <option value="">Any day</option>
                  {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <button onClick={() => onRemoveFromPlan(existingEntry!.id)}
                  style={{ ...btn("transparent", DANGER, DANGER + "55"), padding: "9px 18px" }}>
                  Remove from this week
                </button>
              </>
            ) : (
              <button onClick={onAddToPlan}
                style={{ ...btn(LAV), padding: "9px 18px" }}>
                <Icon name="plus" size={15} color={INK} />
                Add to this week
              </button>
            )}
          </div>

          {/* Rating */}
          {meal.rating > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
              <StarRating value={meal.rating} size={15} />
              {meal.ratingNote && <span style={{ fontSize: 12, color: TEXT_DIM, fontStyle: "italic" }}>{meal.ratingNote}</span>}
            </div>
          )}

          {/* Ingredients */}
          {ingredients.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: LAV, marginBottom: 12 }}>Ingredients</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {ingredients.map((ing, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "9px 14px", background: SURFACE, borderRadius: 8, border: `1px solid ${BORDER}` }}>
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: LAV_DIM, marginTop: 7, flexShrink: 0 }} />
                    <span style={{ fontSize: 14, color: TEXT, lineHeight: 1.5 }}>{ing}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Instructions */}
          {meal.notes && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: LAV, marginBottom: 12 }}>Instructions</div>
              <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "16px 18px", fontSize: 14, color: TEXT, lineHeight: 1.75 }}>
                {meal.notes}
              </div>
            </div>
          )}


        </div>
        )}
      </div>
    </div>
  );
}

// ── Modal ──────────────────────────────────────────────────────────────────────
function Modal({ children, onClose, title, accentColor, maxWidth = 520 }: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
  accentColor: string;
  maxWidth?: number;
}) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(3,5,15,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16, backdropFilter: "blur(4px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "var(--panel)", borderRadius: 16, padding: 24, width: "100%", maxWidth, maxHeight: "88vh", overflowY: "auto", border: `1px solid ${accentColor}55`, boxShadow: `0 0 0 1px ${accentColor}22, 0 24px 48px rgba(0,0,0,0.6)` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, paddingBottom: 14, borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 18, fontWeight: 700, color: TEXT }}>{title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: TEXT_MUTED, lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
