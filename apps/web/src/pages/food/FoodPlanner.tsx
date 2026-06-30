import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { Icon } from "../../components/Icon";
import { useHouseholdUid } from "../../household";
import { useOverlay } from "../../overlay";
import StarField from "../../components/StarField";
import {
  PageShell, useIsMobile,
  BG, SURFACE, SURFACE_HI, BORDER, TEXT, TEXT_DIM, TEXT_MUTED,
  LAV, DANGER, INK, FONT,
  DAY_NAMES, DAY_ABBR, MONTH_NAMES,
  weekKey,
} from "../shared/kit";

const FOOD_TYPES = ["American","Italian","Mexican","Asian","Mediterranean","Indian","Greek","Breakfast","Soup/Salad","Other"];
const PROTEINS = ["None/Vegetarian","Chicken","Fish/Seafood","Beef","Pork","Turkey","Eggs","Beans/Legumes","Tofu","Other"];
const LABEL_SUGGESTIONS = ["Breakfast","Lunch","Dinner","Snack","Dessert","Baked goods","Side dish","Drinks"];

const MEAL_ORDER = ["Breakfast","Lunch","Dinner","Snack","Dessert"];
function labelRank(label?: string): number {
  const i = MEAL_ORDER.indexOf(label ?? "");
  return i === -1 ? MEAL_ORDER.length : i;
}
function byLabel(a: PlanEntry, b: PlanEntry): number {
  return labelRank(a.label) - labelRank(b.label);
}

// ── Theme ─────────────────────────────────────────────────────────────────────
const SURFACE_ACCENT = "rgba(167,139,250,0.10)";
const BORDER_ACCENT = "rgba(167,139,250,0.35)";
const LAV_DIM = "#7c5cbf";

const TYPE_COLOR: Record<string, string> = {
  "American":"#fb923c","Italian":"#4ade80","Mexican":"#fbbf24","Asian":"#a78bfa",
  "Mediterranean":"#22d3ee","Indian":"#f59e0b","Greek":"#60a5fa",
  "Breakfast":"#f97316","Soup/Salad":"#86efac","Other":"#9ca3af",
};
const PROTEIN_COLOR: Record<string, string> = {
  "None/Vegetarian":"#4ade80","Chicken":"#fb923c","Fish/Seafood":"#22d3ee",
  "Beef":"#f87171","Pork":"#fca5a5","Turkey":"#c4b5fd","Eggs":"#fbbf24",
  "Beans/Legumes":"#86efac","Tofu":"#a7f3d0","Other":"#9ca3af",
};

// ── Types ─────────────────────────────────────────────────────────────────────
interface Meal {
  id: string; name: string; type: string; protein: string; prepTime: string;
  servings: number; ingredients: string; notes: string;
  rating: number; ratingNote: string; mealService: boolean;
}
interface PlanEntry {
  id: string;
  mealId: string;
  day?: string;      // day name within the week: "Monday" etc.
  label?: string;
  weekKey?: string;  // ISO date of Sunday of the week; absent = legacy
}
interface AppData {
  meals: Meal[];
  planEntries: PlanEntry[];
  groceryExtras: string[];
}

const SEED_DATA: AppData = { meals: [], planEntries: [], groceryExtras: [] };

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
    borderRadius: 8, cursor: "pointer", fontFamily: FONT,
    fontWeight: 700, padding: "7px 16px", fontSize: 13,
    display: "inline-flex", alignItems: "center", gap: 6,
  };
}

const inputStyle: React.CSSProperties = {
  background: "var(--input-bg)", border: `1px solid ${BORDER}`,
  borderRadius: 8, padding: "9px 12px", fontSize: 14, color: TEXT,
  fontFamily: FONT, width: "100%", boxSizing: "border-box", outline: "none",
};
const selectStyle: React.CSSProperties = {
  ...inputStyle, appearance: "none",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%237a7890' fill='none' stroke-width='1.5'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", paddingRight: 32,
};
const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase",
  color: TEXT_DIM, display: "block", marginBottom: 5, fontFamily: FONT,
};

const navBtn: React.CSSProperties = {
  background: "transparent", border: `1px solid ${BORDER}`, borderRadius: 8, color: TEXT_DIM,
  fontSize: 16, width: 30, height: 30, cursor: "pointer", display: "flex", alignItems: "center",
  justifyContent: "center", fontFamily: FONT,
};

// ── Small components ──────────────────────────────────────────────────────────
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

// ── Main ──────────────────────────────────────────────────────────────────────
export default function FoodPlanner() {
  const [data, setData] = useState<AppData>(SEED_DATA);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const [filterType, setFilterType] = useState("all");
  const [filterProtein, setFilterProtein] = useState("all");
  const [filterRating, setFilterRating] = useState(0);
  const [sortBy, setSortBy] = useState<"name" | "rating" | "type">("name");
  const [searchQ, setSearchQ] = useState("");
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [newRecipeOpen, setNewRecipeOpen] = useState(false);
  const [showGrocery, setShowGrocery] = useState(false);
  const [groceryChecked, setGroceryChecked] = useState<Record<string, boolean>>({});
  const [groceryInput, setGroceryInput] = useState("");
  const [addEntryDay, setAddEntryDay] = useState("");
  const [addEntryLabel, setAddEntryLabel] = useState("");
  const [addEntrySearch, setAddEntrySearch] = useState("");
  const [addQuickName, setAddQuickName] = useState("");
  const [ratingModal, setRatingModal] = useState<Meal | null>(null);
  const [viewMealId, setViewMealId] = useState<string | null>(null);
  const [viewMealEditing, setViewMealEditing] = useState(false);
  const viewMeal = viewMealId ? (data.meals.find(m => m.id === viewMealId) ?? null) : null;
  const [loaded, setLoaded] = useState(false);
  const uid = useHouseholdUid();
  const [searchParams] = useSearchParams();

  // Week navigation
  const [weekStart, setWeekStart] = useState(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), t.getDate() - t.getDay());
  });
  const wk = weekKey(weekStart);
  const isThisWeek = wk === weekKey(new Date());
  const todayIdx = useMemo(() => {
    const t = new Date();
    return weekKey(t) === wk ? t.getDay() : -1;
  }, [wk]);

  function shiftWeek(delta: number) {
    setWeekStart(d => new Date(d.getFullYear(), d.getMonth(), d.getDate() + delta * 7));
  }
  function thisWeek() {
    const t = new Date();
    setWeekStart(new Date(t.getFullYear(), t.getMonth(), t.getDate() - t.getDay()));
  }

  const weekLabel = `${MONTH_NAMES[weekStart.getMonth()].slice(0, 3)} ${weekStart.getDate()}`;

  useEffect(() => {
    try {
      const ref = doc(db, "users", uid, "food", "planner");
      const unsub = onSnapshot(ref, snap => {
        if (snap.exists()) {
          const d = snap.data() as Partial<AppData> & { weekPlan?: unknown };
          setData({
            ...SEED_DATA, ...d,
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

  // Entries for the currently-viewed week
  const weekEntries = useMemo(() =>
    data.planEntries.filter(e => e.weekKey === wk || (!e.weekKey && isThisWeek)),
    [data.planEntries, wk, isThisWeek]
  );

  const entriesByDay = useMemo(() => {
    const map: Record<string, PlanEntry[]> = {};
    weekEntries.forEach(e => {
      if (e.day) {
        if (!map[e.day]) map[e.day] = [];
        map[e.day].push(e);
      }
    });
    Object.values(map).forEach(list => list.sort(byLabel));
    return map;
  }, [weekEntries]);

  const filteredMeals = useMemo(() => {
    let list = data.meals.filter(m => {
      if (filterType !== "all" && m.type !== filterType) return false;
      if (filterProtein !== "all" && m.protein !== filterProtein) return false;
      if (filterRating > 0 && (m.rating || 0) < filterRating) return false;
      if (searchQ && !m.name.toLowerCase().includes(searchQ.toLowerCase())) return false;
      return true;
    });
    if (sortBy === "rating") list = [...list].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    else if (sortBy === "type") list = [...list].sort((a, b) => a.type.localeCompare(b.type));
    else list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [data.meals, filterType, filterProtein, filterRating, searchQ, sortBy]);

  function saveMeal(m: Meal) {
    const meals = data.meals.find(x => x.id === m.id)
      ? data.meals.map(x => x.id === m.id ? m : x)
      : [...data.meals, m];
    save({ ...data, meals });
    setViewMealEditing(false);
  }
  function deleteMeal(id: string) {
    save({ ...data, meals: data.meals.filter(m => m.id !== id), planEntries: data.planEntries.filter(e => e.mealId !== id) });
  }
  function openAddEntry(day = "") {
    setAddEntryDay(day); setAddEntryLabel(""); setAddEntrySearch(""); setAddQuickName(""); setShowAddEntry(true);
  }
  function commitAddEntry(mealId: string, meals?: Meal[]) {
    const entry: PlanEntry = {
      id: Date.now().toString(), mealId,
      day: addEntryDay || undefined,
      label: addEntryLabel.trim() || undefined,
      weekKey: wk,
    };
    save({ ...data, meals: meals ?? data.meals, planEntries: [...data.planEntries, entry] });
    setShowAddEntry(false);
  }
  function addQuickMealEntry() {
    const name = addQuickName.trim();
    if (!name) return;
    const newMeal: Meal = {
      id: Date.now().toString(), name, type: "Other", protein: "None/Vegetarian",
      ingredients: "", servings: 4, prepTime: "", notes: "", rating: 0, ratingNote: "", mealService: false,
    };
    commitAddEntry(newMeal.id, [...data.meals, newMeal]);
  }
  function removePlanEntry(id: string) {
    save({ ...data, planEntries: data.planEntries.filter(e => e.id !== id) });
  }
  function updatePlanEntryDay(entryId: string, day: string | undefined) {
    save({ ...data, planEntries: data.planEntries.map(e => e.id === entryId ? { ...e, day } : e) });
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

  // Compact draggable meal card used in the calendar grid
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
          background: SURFACE_HI, border: `1px solid ${BORDER}`,
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
    <PageShell tool="food" maxWidth={1100}
      headerExtra={
        <button onClick={() => setNewRecipeOpen(true)} style={btn(LAV)}>
          <Icon name="plus" size={15} color={INK} /> Add Recipe
        </button>
      }>

      {/* Week nav */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => shiftWeek(-1)} style={navBtn}>‹</button>
          <span style={{ fontSize: 14, fontWeight: 800, color: TEXT, minWidth: 110, textAlign: "center" }}>Week of {weekLabel}</span>
          <button onClick={() => shiftWeek(1)} style={navBtn}>›</button>
          {!isThisWeek && (
            <button onClick={thisWeek} style={{ ...btn("transparent", LAV, LAV + "55"), fontSize: 11, padding: "5px 12px" }}>This week</button>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={{ ...btn("transparent", TEXT_DIM, BORDER), fontSize: 12, padding: "6px 12px" }} onClick={() => setShowGrocery(true)}>
            <Icon name="bag" size={14} color="currentColor" /> Grocery
          </button>
          <button style={btn(LAV)} onClick={() => openAddEntry()}>
            <Icon name="plus" size={14} color={INK} /> Add meal
          </button>
        </div>
      </div>

      {/* Week calendar grid */}
      {!loaded ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: TEXT_MUTED, fontSize: 14 }}>Loading…</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(7, 1fr)", gap: 8, marginBottom: 32 }}>
          {DAY_NAMES.map((dayName, dayIdx) => {
            const dayEntries = entriesByDay[dayName] ?? [];
            const isToday = dayIdx === todayIdx;
            const over = dragOverDay === dayName;
            const date = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + dayIdx);
            if (isMobile && dayEntries.length === 0) return null;
            return (
              <div key={dayIdx}
                onDragOver={e => { if (dragId) { e.preventDefault(); if (dragOverDay !== dayName) setDragOverDay(dayName); } }}
                onDragLeave={() => setDragOverDay(d => (d === dayName ? null : d))}
                onDrop={e => { e.preventDefault(); if (dragId) { updatePlanEntryDay(dragId, dayName); setDragId(null); setDragOverDay(null); } }}
                style={{
                  background: over ? SURFACE_ACCENT : isToday ? "rgba(167,139,250,0.06)" : SURFACE,
                  border: `1px solid ${over ? BORDER_ACCENT : isToday ? LAV + "44" : BORDER}`,
                  borderRadius: 12, minHeight: isMobile ? "auto" : 120, display: "flex", flexDirection: "column", overflow: "hidden",
                }}>
                <div style={{ padding: "8px 10px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", color: isToday ? LAV : TEXT_DIM }}>
                      {isMobile ? dayName : DAY_ABBR[dayIdx]}
                    </span>
                    <span style={{ fontSize: 11, color: TEXT_MUTED }}>{date.getDate()}</span>
                  </div>
                  <button onClick={() => openAddEntry(dayName)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: TEXT_MUTED, padding: 2, display: "flex", lineHeight: 1 }}
                    onMouseEnter={e => (e.currentTarget.style.color = LAV)}
                    onMouseLeave={e => (e.currentTarget.style.color = TEXT_MUTED)}>
                    <Icon name="plus" size={13} color="currentColor" />
                  </button>
                </div>
                <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                  {dayEntries.map(e => planCard(e))}
                  {dayEntries.length === 0 && !isMobile && (
                    <div style={{ fontSize: 11, color: TEXT_MUTED, fontStyle: "italic", textAlign: "center", padding: "10px 0" }}>
                      {dragId ? "Drop here" : "—"}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Recipe library */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: TEXT_MUTED, marginBottom: 12 }}>
          Recipes
        </div>

        {/* Filter bar */}
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "12px 14px", marginBottom: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr 1fr auto", gap: 8, alignItems: "end" }}>
            <div>
              <label style={labelStyle}>Search</label>
              <input style={inputStyle} value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search recipes…"
                onFocus={e => (e.target.style.borderColor = LAV_DIM)} onBlur={e => (e.target.style.borderColor = BORDER)} />
            </div>
            <div>
              <label style={labelStyle}>Cuisine</label>
              <select style={selectStyle} value={filterType} onChange={e => setFilterType(e.target.value)}>
                <option value="all">All types</option>
                {FOOD_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Protein</label>
              <select style={selectStyle} value={filterProtein} onChange={e => setFilterProtein(e.target.value)}>
                <option value="all">All proteins</option>
                {PROTEINS.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Min rating</label>
              <select style={selectStyle} value={filterRating} onChange={e => setFilterRating(Number(e.target.value))}>
                <option value={0}>Any</option>
                {[5,4,3,2,1].map(r => <option key={r} value={r}>{r}+ stars</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Sort</label>
              <select style={selectStyle} value={sortBy} onChange={e => setSortBy(e.target.value as "name" | "rating" | "type")}>
                <option value="name">Name</option>
                <option value="rating">Rating</option>
                <option value="type">Cuisine</option>
              </select>
            </div>
          </div>
        </div>

        {data.meals.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 20px", color: TEXT_MUTED }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}><Icon name="utensils" size={40} color={TEXT_MUTED} /></div>
            <div style={{ fontSize: 16, color: TEXT_DIM, fontWeight: 700, marginBottom: 6 }}>No recipes yet</div>
            <div style={{ fontSize: 13 }}>Add a recipe to start building your meal library.</div>
          </div>
        ) : filteredMeals.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 20px", color: TEXT_MUTED, fontSize: 13 }}>Nothing matches your filters.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 11, color: TEXT_MUTED, fontWeight: 700, marginBottom: 4 }}>
              {filteredMeals.length} of {data.meals.length} recipes
            </div>
            {filteredMeals.map(m => (
              <div key={m.id} onClick={() => setViewMealId(m.id)}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", background: SURFACE, border: `1px solid ${BORDER}`, borderLeft: `3px solid ${TYPE_COLOR[m.type] || LAV}`, borderRadius: 10, cursor: "pointer", transition: "background 0.12s" }}
                onMouseEnter={e => (e.currentTarget.style.background = SURFACE_HI)}
                onMouseLeave={e => (e.currentTarget.style.background = SURFACE)}>
                <Icon name="utensils" size={16} color={TYPE_COLOR[m.type] || TEXT_DIM} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>{m.name}</span>
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
                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                      <StarRating value={m.rating} size={11} />
                      {m.ratingNote && <span style={{ fontSize: 11, color: TEXT_DIM, fontStyle: "italic" }}>{m.ratingNote}</span>}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => setRatingModal({ ...m })}
                    style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 7, cursor: "pointer", color: TEXT_DIM, padding: "5px 8px", display: "flex", alignItems: "center" }}
                    onMouseEnter={e => (e.currentTarget.style.color = LAV)}
                    onMouseLeave={e => (e.currentTarget.style.color = TEXT_DIM)}>
                    <Icon name="star" size={13} color="currentColor" />
                  </button>
                  <button
                    onClick={() => { setViewMealEditing(true); setViewMealId(m.id); }}
                    style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 7, cursor: "pointer", color: TEXT_DIM, padding: "5px 8px", display: "flex", alignItems: "center" }}
                    onMouseEnter={e => (e.currentTarget.style.color = LAV)}
                    onMouseLeave={e => (e.currentTarget.style.color = TEXT_DIM)}>
                    <Icon name="pencil" size={13} color="currentColor" />
                  </button>
                </div>
                <Icon name="chevronDown" size={13} color={TEXT_MUTED} style={{ transform: "rotate(-90deg)", opacity: 0.5, flexShrink: 0 }} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── RECIPE DETAIL ── */}
      {viewMeal && (
        <RecipeDetail
          meal={viewMeal}
          planEntries={weekEntries}
          weekKey={wk}
          initialEditing={viewMealEditing}
          onClose={() => { setViewMealId(null); setViewMealEditing(false); }}
          onSave={saveMeal}
          onDelete={() => { deleteMeal(viewMeal.id); setViewMealId(null); setViewMealEditing(false); }}
          onAddToPlan={() => {
            const entry: PlanEntry = { id: Date.now().toString(), mealId: viewMeal.id, weekKey: wk };
            save({ ...data, planEntries: [...data.planEntries, entry] });
          }}
          onRemoveFromPlan={(entryId) => removePlanEntry(entryId)}
          onUpdatePlanDay={(entryId, day) => updatePlanEntryDay(entryId, day)}
        />
      )}

      {/* ── NEW RECIPE FORM ── */}
      {newRecipeOpen && (
        <NewRecipeOverlay
          onClose={() => setNewRecipeOpen(false)}
          onSave={(m) => { saveMeal(m); setNewRecipeOpen(false); }}
        />
      )}

      {/* ── ADD TO WEEK OVERLAY ── */}
      {showAddEntry && (
        <div style={{ position: "fixed", inset: 0, background: BG, zIndex: 1100, overflowY: "auto", fontFamily: FONT, color: TEXT }}>
          <div style={{ position: "sticky", top: 0, zIndex: 1110, background: "rgba(6,9,26,0.92)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", padding: "0 20px", minHeight: 60, gap: 12, boxSizing: "border-box" }}>
            <button onClick={() => setShowAddEntry(false)}
              style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 8, cursor: "pointer", color: TEXT_DIM, padding: "6px 10px", display: "flex", alignItems: "center", lineHeight: 1, flexShrink: 0 }}
              onMouseEnter={e => (e.currentTarget.style.color = TEXT)}
              onMouseLeave={e => (e.currentTarget.style.color = TEXT_DIM)}>
              <Icon name="x" size={16} color="currentColor" />
            </button>
            <span style={{ flex: 1, textAlign: "center", fontWeight: 800, fontSize: 16, color: TEXT }}>Add to Week</span>
            <div style={{ width: 38, flexShrink: 0 }} />
          </div>

          <div style={{ padding: "28px 24px 80px", maxWidth: 600, margin: "0 auto" }}>
            {/* Day picker */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: TEXT_MUTED, marginBottom: 10 }}>Day</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {DAY_NAMES.map((d, i) => {
                  const date = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i);
                  const label = `${DAY_ABBR[i]} ${date.getDate()}`;
                  return (
                    <button key={d} onClick={() => setAddEntryDay(d === addEntryDay ? "" : d)}
                      style={{ ...btn(addEntryDay === d ? SURFACE_ACCENT : "transparent", addEntryDay === d ? LAV : TEXT_DIM, addEntryDay === d ? BORDER_ACCENT : BORDER), fontSize: 12, padding: "6px 14px" }}>
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Label picker */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: TEXT_MUTED, marginBottom: 10 }}>Meal</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {LABEL_SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => setAddEntryLabel(addEntryLabel === s ? "" : s)}
                    style={{ ...btn(addEntryLabel === s ? SURFACE_ACCENT : "transparent", addEntryLabel === s ? LAV : TEXT_DIM, addEntryLabel === s ? BORDER_ACCENT : BORDER), fontSize: 12, padding: "6px 14px" }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick add */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: TEXT_MUTED, marginBottom: 10 }}>Quick add</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input autoFocus placeholder="Type a meal name…" value={addQuickName}
                  onChange={e => setAddQuickName(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") addQuickMealEntry(); if (e.key === "Escape") setShowAddEntry(false); }}
                  style={{ ...inputStyle, flex: 1 }}
                  onFocus={e => (e.target.style.borderColor = LAV_DIM)} onBlur={e => (e.target.style.borderColor = BORDER)} />
                <button onClick={addQuickMealEntry} disabled={!addQuickName.trim()}
                  style={{ ...btn(LAV), opacity: addQuickName.trim() ? 1 : 0.4, flexShrink: 0 }}>
                  Add
                </button>
              </div>
            </div>

            {/* From recipes */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: TEXT_MUTED, marginBottom: 10 }}>From recipes</div>
              <input placeholder="Search recipes…" value={addEntrySearch} onChange={e => setAddEntrySearch(e.target.value)}
                style={{ ...inputStyle, marginBottom: 10 }}
                onFocus={e => (e.target.style.borderColor = LAV_DIM)} onBlur={e => (e.target.style.borderColor = BORDER)} />
              {data.meals.length === 0 && (
                <div style={{ fontSize: 13, color: TEXT_MUTED, fontStyle: "italic", textAlign: "center", padding: "24px 0" }}>No recipes yet — use quick add above.</div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {data.meals
                  .filter(m => !addEntrySearch || m.name.toLowerCase().includes(addEntrySearch.toLowerCase()))
                  .map(m => (
                    <div key={m.id} onClick={() => commitAddEntry(m.id)}
                      style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 10, cursor: "pointer", background: SURFACE, border: `1px solid ${BORDER}`, transition: "all 0.12s", borderLeft: `3px solid ${TYPE_COLOR[m.type] || LAV}` }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = SURFACE_HI; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = SURFACE; }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: TEXT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</div>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
                          <span style={pill(TYPE_COLOR[m.type] || "#9ca3af")}>{m.type}</span>
                          <span style={pill(PROTEIN_COLOR[m.protein] || "#9ca3af")}>{m.protein}</span>
                        </div>
                      </div>
                      <Icon name="plus" size={14} color={TEXT_MUTED} />
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

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

      {/* ── GROCERY LIST OVERLAY ── */}
      {showGrocery && (
        <GroceryOverlay
          groceryItems={buildGroceryList()}
          groceryChecked={groceryChecked}
          groceryInput={groceryInput}
          onToggle={(item) => setGroceryChecked(c => ({ ...c, [item]: !c[item] }))}
          onUncheckAll={() => setGroceryChecked({})}
          onInputChange={setGroceryInput}
          onAdd={addGroceryExtra}
          onRemoveExtra={removeGroceryExtra}
          onClose={() => setShowGrocery(false)}
        />
      )}
    </PageShell>
  );

}

// ── Grocery overlay ───────────────────────────────────────────────────────────
function GroceryOverlay({ groceryItems, groceryChecked, groceryInput, onToggle, onUncheckAll, onInputChange, onAdd, onRemoveExtra, onClose }: {
  groceryItems: Record<string, { count: number; meals: string[]; manual: boolean }>;
  groceryChecked: Record<string, boolean>;
  groceryInput: string;
  onToggle: (item: string) => void;
  onUncheckAll: () => void;
  onInputChange: (v: string) => void;
  onAdd: () => void;
  onRemoveExtra: (name: string) => void;
  onClose: () => void;
}) {
  useOverlay();
  const sorted = Object.entries(groceryItems).sort((a, b) => {
    // Unchecked first, then alphabetical
    const aChecked = groceryChecked[a[0]] ? 1 : 0;
    const bChecked = groceryChecked[b[0]] ? 1 : 0;
    if (aChecked !== bChecked) return aChecked - bChecked;
    return a[0].localeCompare(b[0]);
  });
  const checkedCount = sorted.filter(([item]) => groceryChecked[item]).length;

  return (
    <div style={{ position: "fixed", inset: 0, background: BG, zIndex: 1100, overflowY: "auto", fontFamily: FONT, color: TEXT }}>
      {/* Header */}
      <div style={{ position: "sticky", top: 0, zIndex: 1110, background: "rgba(6,9,26,0.92)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", padding: "0 20px", minHeight: 60, gap: 12, boxSizing: "border-box" }}>
        <button onClick={onClose}
          style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 8, cursor: "pointer", color: TEXT_DIM, padding: "6px 10px", display: "flex", alignItems: "center", lineHeight: 1, flexShrink: 0 }}
          onMouseEnter={e => (e.currentTarget.style.color = TEXT)} onMouseLeave={e => (e.currentTarget.style.color = TEXT_DIM)}>
          <Icon name="x" size={16} color="currentColor" />
        </button>
        <span style={{ flex: 1, textAlign: "center", fontWeight: 800, fontSize: 16, color: TEXT }}>Grocery List</span>
        {checkedCount > 0 && (
          <button onClick={onUncheckAll}
            style={{ fontSize: 11, fontWeight: 700, color: TEXT_DIM, background: "transparent", border: `1px solid ${BORDER}`, borderRadius: 7, padding: "5px 10px", cursor: "pointer", fontFamily: FONT, flexShrink: 0 }}>
            Uncheck all
          </button>
        )}
      </div>

      <div style={{ padding: "20px 20px 80px", maxWidth: 560, margin: "0 auto" }}>
        {/* Add item */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          <input
            value={groceryInput}
            onChange={e => onInputChange(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") onAdd(); }}
            placeholder="Add an item…"
            style={{ flex: 1, background: "var(--input-bg)", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "11px 14px", fontSize: 15, color: TEXT, fontFamily: FONT, outline: "none" }}
            onFocus={e => (e.target.style.borderColor = LAV_DIM)} onBlur={e => (e.target.style.borderColor = BORDER)}
          />
          <button onClick={onAdd} disabled={!groceryInput.trim()}
            style={{ ...btn(LAV), opacity: groceryInput.trim() ? 1 : 0.4, padding: "0 18px", flexShrink: 0 }}>
            Add
          </button>
        </div>

        {sorted.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 20px", color: TEXT_MUTED }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}><Icon name="bag" size={40} color={TEXT_MUTED} /></div>
            <div style={{ fontSize: 15, fontWeight: 700, color: TEXT_DIM, marginBottom: 6 }}>Nothing on the list</div>
            <div style={{ fontSize: 13 }}>Plan meals for the week or add items above.</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {sorted.map(([item, info]) => {
              const checked = !!groceryChecked[item];
              return (
                <div key={item} onClick={() => onToggle(item)}
                  style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderRadius: 12, cursor: "pointer", background: checked ? "transparent" : SURFACE, border: `1px solid ${checked ? "transparent" : BORDER}`, transition: "all 0.15s", opacity: checked ? 0.45 : 1 }}>
                  <div style={{ width: 24, height: 24, borderRadius: 7, border: `2px solid ${checked ? LAV : BORDER}`, background: checked ? LAV : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>
                    {checked && <Icon name="checkMark" size={13} color={INK} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: TEXT, textDecoration: checked ? "line-through" : "none" }}>{item}</div>
                    {info.meals.length > 0 && (
                      <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 2 }}>{info.meals.join(", ")}</div>
                    )}
                  </div>
                  {info.count > 1 && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: LAV_DIM, flexShrink: 0 }}>×{info.count}</span>
                  )}
                  {info.manual && (
                    <button onClick={e => { e.stopPropagation(); onRemoveExtra(item); }}
                      style={{ background: "none", border: "none", cursor: "pointer", color: TEXT_MUTED, padding: 4, display: "flex", alignItems: "center", flexShrink: 0 }}
                      onMouseEnter={e => (e.currentTarget.style.color = DANGER)}
                      onMouseLeave={e => (e.currentTarget.style.color = TEXT_MUTED)}>
                      <Icon name="x" size={14} color="currentColor" />
                    </button>
                  )}
                </div>
              );
            })}
            {checkedCount > 0 && (
              <div style={{ marginTop: 8, fontSize: 11, color: TEXT_MUTED, textAlign: "center", fontWeight: 600 }}>
                {checkedCount} of {sorted.length} checked
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── New recipe overlay ────────────────────────────────────────────────────────
function NewRecipeOverlay({ onClose, onSave }: { onClose: () => void; onSave: (m: Meal) => void }) {
  useOverlay();
  const [draft, setDraft] = useState<Meal>({
    id: Date.now().toString(), name: "", type: "Other", protein: "None/Vegetarian",
    ingredients: "", servings: 4, prepTime: "", notes: "", rating: 0, ratingNote: "", mealService: false,
  });
  function save() { if (!draft.name.trim()) return; onSave(draft); }
  return (
    <div style={{ position: "fixed", inset: 0, background: BG, zIndex: 1100, overflowY: "auto", fontFamily: FONT, color: TEXT }}>
      <div style={{ position: "sticky", top: 0, zIndex: 1110, background: "rgba(6,9,26,0.92)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", padding: "0 20px", minHeight: 60, gap: 12, boxSizing: "border-box" }}>
        <button onClick={onClose} style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 8, cursor: "pointer", color: TEXT_DIM, padding: "6px 10px", display: "flex", alignItems: "center", lineHeight: 1 }}
          onMouseEnter={e => (e.currentTarget.style.color = TEXT)} onMouseLeave={e => (e.currentTarget.style.color = TEXT_DIM)}>
          <Icon name="x" size={16} color="currentColor" />
        </button>
        <span style={{ flex: 1, textAlign: "center", fontWeight: 800, fontSize: 16, color: TEXT }}>New Recipe</span>
        <button onClick={save} disabled={!draft.name.trim()} style={{ ...btn(LAV), opacity: draft.name.trim() ? 1 : 0.5 }}>Save</button>
      </div>
      <RecipeForm draft={draft} onChange={setDraft} onSave={save} onCancel={onClose} />
    </div>
  );
}

// ── Shared recipe form body ───────────────────────────────────────────────────
function RecipeForm({ draft, onChange, onSave, onCancel, onDelete }: {
  draft: Meal; onChange: (m: Meal) => void; onSave: () => void; onCancel: () => void; onDelete?: () => void;
}) {
  const inputStyle: React.CSSProperties = {
    background: "var(--input-bg)", border: `1px solid ${BORDER}`,
    borderRadius: 8, padding: "9px 12px", fontSize: 14, color: TEXT,
    fontFamily: FONT, width: "100%", boxSizing: "border-box", outline: "none",
  };
  const selectStyle: React.CSSProperties = {
    ...inputStyle, appearance: "none",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%237a7890' fill='none' stroke-width='1.5'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", paddingRight: 32,
  };
  const lbl: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase",
    color: TEXT_DIM, display: "block", marginBottom: 5, fontFamily: FONT,
  };
  return (
    <div style={{ padding: "28px 24px 80px", maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <label style={lbl}>Recipe name</label>
        <input autoFocus style={inputStyle} value={draft.name} onChange={e => onChange({ ...draft, name: e.target.value })} placeholder="What's cooking?"
          onFocus={e => (e.target.style.borderColor = LAV_DIM)} onBlur={e => (e.target.style.borderColor = BORDER)} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div><label style={lbl}>Cuisine type</label>
          <select style={selectStyle} value={draft.type} onChange={e => onChange({ ...draft, type: e.target.value })}>
            {FOOD_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div><label style={lbl}>Protein</label>
          <select style={selectStyle} value={draft.protein} onChange={e => onChange({ ...draft, protein: e.target.value })}>
            {PROTEINS.map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div><label style={lbl}>Prep time</label>
          <input style={inputStyle} value={draft.prepTime} onChange={e => onChange({ ...draft, prepTime: e.target.value })} placeholder="e.g. 30 min" />
        </div>
        <div><label style={lbl}>Servings</label>
          <input type="number" style={inputStyle} value={draft.servings} onChange={e => onChange({ ...draft, servings: Number(e.target.value) })} min={1} />
        </div>
      </div>
      <div><label style={lbl}>Ingredients (one per line)</label>
        <textarea style={{ ...inputStyle, resize: "vertical" }} rows={5} value={draft.ingredients} onChange={e => onChange({ ...draft, ingredients: e.target.value })} />
      </div>
      <div><label style={lbl}>Notes / Instructions</label>
        <textarea style={{ ...inputStyle, resize: "vertical" }} rows={3} value={draft.notes} onChange={e => onChange({ ...draft, notes: e.target.value })} />
      </div>
      <div onClick={() => onChange({ ...draft, mealService: !draft.mealService })}
        style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
        <div style={{ width: 20, height: 20, borderRadius: 5, border: `1.5px solid ${draft.mealService ? LAV : BORDER}`, background: draft.mealService ? LAV : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {draft.mealService && <Icon name="check" size={12} color={INK} />}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>Meal service</div>
          <div style={{ fontSize: 11, color: TEXT_MUTED }}>Ingredients are provided — exclude from grocery list</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
        <button style={btn(LAV)} onClick={onSave} disabled={!draft.name.trim()}>Save</button>
        <button style={btn("transparent", TEXT_DIM, BORDER)} onClick={onCancel}>Cancel</button>
        {onDelete && (
          <button onClick={onDelete} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", fontSize: 12, color: DANGER, fontWeight: 700, fontFamily: FONT, display: "flex", alignItems: "center", gap: 5 }}>
            <Icon name="trash" size={14} color={DANGER} /> Delete
          </button>
        )}
      </div>
    </div>
  );
}

// ── Recipe Detail (full-screen overlay) ───────────────────────────────────────
function RecipeDetail({ meal, planEntries, weekKey: wk, initialEditing = false, onClose, onSave, onDelete, onAddToPlan, onRemoveFromPlan, onUpdatePlanDay }: {
  meal: Meal;
  planEntries: PlanEntry[];
  weekKey: string;
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

  useEffect(() => { setPlanDay(existingEntry?.day ?? ""); }, [existingEntry?.id]); // eslint-disable-line

  function handleDayChange(newDay: string) {
    setPlanDay(newDay);
    if (existingEntry) onUpdatePlanDay(existingEntry.id, newDay || undefined);
  }
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
    <div style={{ position: "fixed", inset: 0, background: BG, zIndex: 1100, overflowY: "auto", fontFamily: FONT, color: TEXT }}>
      <StarField />
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ position: "sticky", top: 0, zIndex: 1110, background: "rgba(6,9,26,0.92)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", padding: "0 20px", minHeight: 60, gap: 12, boxSizing: "border-box" }}>
          {iconBtn(editing ? () => setEditing(false) : onClose, "x", TEXT)}
          <div style={{ flex: 1, textAlign: "center", fontWeight: 800, fontSize: 16, color: TEXT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {editing ? "Edit Recipe" : meal.name}
          </div>
          {editing
            ? <button onClick={save} disabled={!draft.name.trim()} style={{ ...btn(LAV), opacity: draft.name.trim() ? 1 : 0.5 }}>Save</button>
            : iconBtn(startEdit, "pencil", LAV)}
        </div>

        {editing ? (
          <RecipeForm draft={draft} onChange={setDraft} onSave={save} onCancel={() => setEditing(false)} onDelete={onDelete} />
        ) : (
          <div style={{ padding: "28px 24px 80px", maxWidth: 720, margin: "0 auto" }}>
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

            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 24 }}>
              {isInPlan ? (
                <>
                  <select value={planDay} onChange={e => handleDayChange(e.target.value)}
                    style={{ background: "var(--input-bg)", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "9px 12px", fontSize: 14, color: TEXT, fontFamily: FONT, outline: "none", colorScheme: "dark", appearance: "none", minWidth: 132 }}>
                    <option value="">Any day</option>
                    {DAY_NAMES.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <button onClick={() => onRemoveFromPlan(existingEntry!.id)}
                    style={{ ...btn("transparent", DANGER, DANGER + "55"), padding: "9px 18px" }}>
                    Remove from this week
                  </button>
                </>
              ) : (
                <button onClick={onAddToPlan} style={{ ...btn(LAV), padding: "9px 18px" }}>
                  <Icon name="plus" size={15} color={INK} /> Add to this week
                </button>
              )}
            </div>

            {meal.rating > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
                <StarRating value={meal.rating} size={15} />
                {meal.ratingNote && <span style={{ fontSize: 12, color: TEXT_DIM, fontStyle: "italic" }}>{meal.ratingNote}</span>}
              </div>
            )}

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

  function startEdit() { setDraft({ ...meal }); setEditing(true); }
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function Modal({ children, onClose, title, accentColor, maxWidth = 520 }: {
  children: React.ReactNode; onClose: () => void; title: string; accentColor: string; maxWidth?: number;
}) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(3,5,15,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, padding: 16, backdropFilter: "blur(4px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "var(--panel)", borderRadius: 16, padding: 24, width: "100%", maxWidth, maxHeight: "88vh", overflowY: "auto", border: `1px solid ${accentColor}55`, boxShadow: `0 0 0 1px ${accentColor}22, 0 24px 48px rgba(0,0,0,0.6)` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, paddingBottom: 14, borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ fontFamily: FONT, fontSize: 18, fontWeight: 700, color: TEXT }}>{title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: TEXT_MUTED, lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
