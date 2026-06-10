import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, onSnapshot, collection, query, orderBy, getDoc } from "firebase/firestore"; // eslint-disable-line
import { auth, db } from "../../firebase";
import StarField from "../../components/StarField";

const BG = "#06091a";
const TEXT = "#dedad0";
const TEXT_DIM = "#7a7890";
const JADE = "#5db88a";
const AMBER = "#e0a435";
const DANGER = "#c0566a";
const BORDER = "rgba(255,255,255,0.08)";
const SURFACE = "rgba(255,255,255,0.04)";

const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

interface Meal { id: string; name: string; type?: string; protein?: string }
interface Todo { id: string; title: string; completed: boolean; createdAt: number }
interface MaintenanceItem { id: string; task: string; lastDone?: string; intervalDays?: number; category?: string }

async function getDataUid(user: User): Promise<string> {
  const snap = await getDoc(doc(db, "users", user.uid, "profile"));
  if (snap.exists()) {
    return (snap.data() as { householdId?: string }).householdId ?? user.uid;
  }
  return user.uid;
}

export default function Display() {
  const [user, setUser] = useState<User | null | "loading">("loading");
  const [dataUid, setDataUid] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());

  // Meal plan data
  const [weekPlan, setWeekPlan] = useState<Record<string, string>>({});
  const [meals, setMeals] = useState<Meal[]>([]);

  // Todos
  const [todos, setTodos] = useState<Todo[]>([]);

  // Maintenance
  const [maintenance, setMaintenance] = useState<MaintenanceItem[]>([]);

  // Clock tick
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  // Auth
  useEffect(() => {
    return onAuthStateChanged(auth, async u => {
      if (!u) { setUser(null); return; }
      setUser(u);
      const uid = await getDataUid(u);
      setDataUid(uid);
    });
  }, []);

  // Meal plan
  useEffect(() => {
    if (!dataUid) return;
    const unsubPlan = onSnapshot(doc(db, "config", "foodPlanner"), snap => {
      if (snap.exists()) {
        const d = snap.data();
        setWeekPlan(d.weekPlan ?? {});
        setMeals(d.meals ?? []);
      }
    });
    return unsubPlan;
  }, [dataUid]);

  // Todos (recent incomplete)
  useEffect(() => {
    if (!dataUid) return;
    return onSnapshot(
      query(collection(db, "users", dataUid, "todos"), orderBy("createdAt", "desc")),
      snap => setTodos(snap.docs.map(d => ({ id: d.id, ...d.data() } as Todo)).filter(t => !t.completed).slice(0, 6))
    );
  }, [dataUid]);

  // Maintenance
  useEffect(() => {
    if (!dataUid) return;
    return onSnapshot(
      collection(db, "users", dataUid, "maintenance"),
      snap => setMaintenance(snap.docs.map(d => ({ id: d.id, ...d.data() } as MaintenanceItem)))
    );
  }, [dataUid]);

  if (user === "loading") {
    return <FullScreenLoader />;
  }

  if (!user) {
    return (
      <div style={{ background: BG, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Montserrat',sans-serif", color: TEXT }}>
        <StarField />
        <div style={{ position: "relative", zIndex: 5, textAlign: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 12 }}>Sign in to use Display Mode</div>
          <div style={{ fontSize: 14, color: TEXT_DIM, marginBottom: 24 }}>Display mode requires your household to be signed in.</div>
          <Link to="/" style={{ color: JADE, fontWeight: 700, fontSize: 14, textDecoration: "none" }}>← Go to sign in</Link>
        </div>
      </div>
    );
  }

  // Today's day key
  const dayKey = DAY_NAMES[now.getDay()].toLowerCase();
  const todayMeals = {
    breakfast: getMealForSlot(weekPlan, meals, dayKey, "breakfast"),
    lunch: getMealForSlot(weekPlan, meals, dayKey, "lunch"),
    dinner: getMealForSlot(weekPlan, meals, dayKey, "dinner"),
  };

  // Maintenance alerts
  const overdueItems = maintenance.filter(m => isOverdue(m));
  const upcomingItems = maintenance.filter(m => !isOverdue(m) && isDueSoon(m, 7));

  return (
    <div style={{ background: BG, minHeight: "100vh", fontFamily: "'Montserrat', sans-serif", color: TEXT, padding: "32px 40px", position: "relative", overflow: "hidden" }}>
      <StarField />
      <div style={{ position: "relative", zIndex: 5 }}>

        {/* Header: Date + Time */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 40 }}>
          <div>
            <div style={{ fontSize: "clamp(18px, 3vw, 24px)", fontWeight: 700, color: TEXT_DIM }}>
              {DAY_NAMES[now.getDay()]}
            </div>
            <div style={{ fontSize: "clamp(32px, 6vw, 52px)", fontWeight: 800, letterSpacing: -1, lineHeight: 1 }}>
              {MONTH_NAMES[now.getMonth()]} {now.getDate()}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "clamp(36px, 6vw, 56px)", fontWeight: 800, letterSpacing: -2, lineHeight: 1 }}>
              {now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
            </div>
            <div style={{ fontSize: 13, color: TEXT_DIM }}>{now.getFullYear()}</div>
          </div>
        </div>

        {/* Main grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>

          {/* Today's Meals */}
          <DisplayCard title="Today's Meals" icon="🍽️" accentColor={AMBER}>
            {["breakfast", "lunch", "dinner"].map(slot => (
              <MealRow
                key={slot}
                slot={slot}
                name={todayMeals[slot as keyof typeof todayMeals]}
              />
            ))}
            {!todayMeals.breakfast && !todayMeals.lunch && !todayMeals.dinner && (
              <EmptyState text="No meals planned today" />
            )}
          </DisplayCard>

          {/* Todos */}
          <DisplayCard title="Open Tasks" icon="✅" accentColor={JADE}>
            {todos.length === 0 ? (
              <EmptyState text="All caught up!" />
            ) : (
              todos.map(t => (
                <div key={t.id} style={{ fontSize: 14, padding: "7px 0", borderBottom: `1px solid ${BORDER}`, lineHeight: 1.4 }}>
                  {t.title}
                </div>
              ))
            )}
          </DisplayCard>

          {/* Maintenance */}
          {(overdueItems.length > 0 || upcomingItems.length > 0) && (
            <DisplayCard title="Home Maintenance" icon="🔧" accentColor={overdueItems.length > 0 ? DANGER : AMBER}>
              {overdueItems.map(m => (
                <AlertRow key={m.id} text={m.task} severity="overdue" />
              ))}
              {upcomingItems.map(m => (
                <AlertRow key={m.id} text={m.task} severity="upcoming" />
              ))}
            </DisplayCard>
          )}

        </div>

        {/* Footer */}
        <div style={{ marginTop: 40, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: TEXT_DIM, letterSpacing: 1 }}>Equanimity</div>
          <Link to="/home" style={{ fontSize: 12, color: TEXT_DIM, textDecoration: "none", opacity: 0.5 }}>Exit display →</Link>
        </div>
      </div>
    </div>
  );
}

function getMealForSlot(weekPlan: Record<string, string>, meals: Meal[], day: string, slot: string): string | null {
  const key = `${day}-${slot}`;
  const mealId = weekPlan[key];
  if (!mealId) return null;
  return meals.find(m => m.id === mealId)?.name ?? null;
}

function isOverdue(m: MaintenanceItem): boolean {
  if (!m.lastDone || !m.intervalDays) return false;
  const nextDue = new Date(m.lastDone).getTime() + m.intervalDays * 86_400_000;
  return nextDue < Date.now();
}

function isDueSoon(m: MaintenanceItem, days: number): boolean {
  if (!m.lastDone || !m.intervalDays) return false;
  const nextDue = new Date(m.lastDone).getTime() + m.intervalDays * 86_400_000;
  return nextDue < Date.now() + days * 86_400_000;
}

function DisplayCard({ title, icon, accentColor, children }: { title: string; icon: string; accentColor: string; children: React.ReactNode }) {
  return (
    <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 20, padding: "24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <span style={{ fontSize: 14, fontWeight: 800, color: accentColor, letterSpacing: 0.3 }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function MealRow({ slot, name }: { slot: string; name: string | null }) {
  if (!name) return null;
  return (
    <div style={{ display: "flex", gap: 12, padding: "7px 0", borderBottom: `1px solid ${BORDER}` }}>
      <span style={{ fontSize: 12, color: TEXT_DIM, textTransform: "capitalize", minWidth: 70, fontWeight: 600 }}>{slot}</span>
      <span style={{ fontSize: 14, flex: 1 }}>{name}</span>
    </div>
  );
}

function AlertRow({ text, severity }: { text: string; severity: "overdue" | "upcoming" }) {
  const color = severity === "overdue" ? DANGER : AMBER;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: `1px solid ${BORDER}` }}>
      <span style={{ color, fontSize: 12, fontWeight: 700, minWidth: 64 }}>
        {severity === "overdue" ? "OVERDUE" : "SOON"}
      </span>
      <span style={{ fontSize: 14 }}>{text}</span>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div style={{ fontSize: 13, color: TEXT_DIM, padding: "8px 0", fontStyle: "italic" }}>{text}</div>;
}

function FullScreenLoader() {
  return (
    <div style={{ background: BG, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontSize: 13, color: "#7a7890", fontFamily: "'Montserrat',sans-serif" }}>Loading…</div>
    </div>
  );
}
