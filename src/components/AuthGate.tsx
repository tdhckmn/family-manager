import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { onAuthStateChanged, signInWithPopup, User } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { auth, db, googleProvider } from "../firebase";
import { AuthContext } from "../auth";
import {
  HouseholdContext, HouseholdInfo, HouseholdPerson, HouseholdRole, SubStatus, subIsActive,
} from "../household";
import StarField from "./StarField";
import { migrateLegacyDataOnce } from "../migrate";

const OWNER_EMAIL = "thomasdhickman@gmail.com";

export const FOOD_PLANNER_EMAIL = OWNER_EMAIL;

const BG = "#06091a";
const TEXT = "#dedad0";
const TEXT_DIM = "#7a7890";
const JADE = "#5db88a";
const SURFACE = "rgba(255,255,255,0.04)";
const BORDER = "rgba(255,255,255,0.08)";

async function loadOrCreateHousehold(
  user: User
): Promise<{ info: HouseholdInfo; people: HouseholdPerson[] }> {
  const profileRef = doc(db, "users", user.uid, "meta", "profile");
  const profileSnap = await getDoc(profileRef);

  if (!profileSnap.exists()) {
    // New user — create household as owner, start 14-day trial
    const trialEndsAt = new Date(Date.now() + 14 * 86_400_000).toISOString();
    await setDoc(profileRef, { role: "owner", householdId: user.uid, createdAt: new Date().toISOString() });
    await setDoc(doc(db, "users", user.uid, "meta", "subscription"), {
      status: "trialing", trialEndsAt, override: null,
    });
    await setDoc(doc(db, "users", user.uid, "meta", "household"), {
      members: [user.uid], people: [], inviteCode: null, displayToken: null,
    });
    await setDoc(doc(db, "registrations", user.uid), {
      email: user.email, createdAt: new Date().toISOString(), subStatus: "trialing",
    });
    return {
      info: { householdId: user.uid, role: "owner", subStatus: "trialing", trialEndsAt, periodEndsAt: null, isOverride: false },
      people: [],
    };
  }

  const profile = profileSnap.data() as { role: HouseholdRole; householdId: string; householdPersonId?: string };
  const householdId = profile.householdId ?? user.uid;

  const [subSnap, hhSnap] = await Promise.all([
    getDoc(doc(db, "users", householdId, "meta", "subscription")),
    getDoc(doc(db, "users", householdId, "meta", "household")),
  ]);

  let subStatus: SubStatus = "none";
  let trialEndsAt: string | null = null;
  let periodEndsAt: string | null = null;
  let isOverride = false;

  if (subSnap.exists()) {
    const sub = subSnap.data();
    const override = sub.override;
    if (override?.active) {
      const exp = override.expiresAt ? new Date(override.expiresAt) : null;
      if (!exp || exp > new Date()) { subStatus = "active"; isOverride = true; }
    }
    if (!isOverride) {
      if (sub.status === "trialing" && sub.trialEndsAt && new Date(sub.trialEndsAt) > new Date()) {
        subStatus = "trialing"; trialEndsAt = sub.trialEndsAt;
      } else if (sub.status === "trialing") {
        subStatus = "cancelled";
      } else {
        subStatus = (sub.status as SubStatus) ?? "none";
        periodEndsAt = sub.currentPeriodEnd ?? null;
      }
    }
  }

  const people: HouseholdPerson[] = hhSnap.data()?.people ?? [];
  const personId = profile.householdPersonId;
  const person = people.find(p => p.id === personId);

  return {
    info: { householdId, role: profile.role, subStatus, trialEndsAt, periodEndsAt, isOverride, personId, personName: person?.name },
    people,
  };
}

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null | "loading">("loading");
  const [household, setHousehold] = useState<HouseholdInfo | null>(null);
  const [householdLoading, setHouseholdLoading] = useState(false);
  const [people, setPeople] = useState<HouseholdPerson[]>([]);
  const [showPersonPicker, setShowPersonPicker] = useState(false);
  const location = useLocation();

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (!u) { setUser(null); setHousehold(null); setPeople([]); setShowPersonPicker(false); return; }
      setUser(u);
      setHouseholdLoading(true);
      try {
        const { info, people: loadedPeople } = await loadOrCreateHousehold(u);
        setHousehold(info);
        setPeople(loadedPeople);
        if (loadedPeople.length > 0 && !info.personId) setShowPersonPicker(true);
        migrateLegacyDataOnce(u.uid, u.email);
      } finally {
        setHouseholdLoading(false);
      }
    });
  }, []);

  async function handlePersonPick(person: HouseholdPerson | null, currentUser: User, currentHousehold: HouseholdInfo) {
    setShowPersonPicker(false);
    if (!person) return;

    // Write personId to profile
    await updateDoc(doc(db, "users", currentUser.uid, "meta", "profile"), {
      householdPersonId: person.id,
    });

    // Write linkedUid onto the person in the household doc (full array rewrite)
    const hhRef = doc(db, "users", currentHousehold.householdId, "meta", "household");
    const hhSnap = await getDoc(hhRef);
    const currentPeople: HouseholdPerson[] = hhSnap.data()?.people ?? [];
    const updatedPeople = currentPeople.map(p =>
      p.id === person.id ? { ...p, linkedUid: currentUser.uid } : p
    );
    await updateDoc(hhRef, { people: updatedPeople });

    setHousehold(h => h ? { ...h, personId: person.id, personName: person.name } : h);
  }

  if (user === "loading" || (user && householdLoading)) {
    return (
      <div style={{ background: BG, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 13, color: TEXT_DIM, fontFamily: "'Montserrat',sans-serif" }}>Loading…</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" state={{ returnTo: location.pathname + location.search }} replace />;
  }

  if (!household) return null;

  const isFounder = user.email?.toLowerCase() === OWNER_EMAIL;
  const onSubscribePage = location.pathname === "/app/subscribe";

  if (!isFounder && !subIsActive(household.subStatus) && !onSubscribePage) {
    return <Navigate to="/app/subscribe" replace />;
  }

  if (showPersonPicker && people.length > 0) {
    return (
      <PersonPickerScreen
        people={people}
        onPick={(p) => handlePersonPick(p, user, household)}
      />
    );
  }

  return (
    <AuthContext.Provider value={user}>
      <HouseholdContext.Provider value={household}>
        {children}
      </HouseholdContext.Provider>
    </AuthContext.Provider>
  );
}

function PersonPickerScreen({ people, onPick }: { people: HouseholdPerson[]; onPick: (p: HouseholdPerson | null) => void }) {
  return (
    <div style={{ background: BG, minHeight: "100vh", fontFamily: "'Montserrat',sans-serif", color: TEXT, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <StarField />
      <div style={{ position: "relative", background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 20, padding: "40px 48px", maxWidth: 360, width: "90%", textAlign: "center" }}>

        <div style={{ fontSize: 18, fontWeight: 800, color: TEXT, marginBottom: 6 }}>Who are you?</div>
        <div style={{ fontSize: 13, color: TEXT_DIM, marginBottom: 28, lineHeight: 1.5 }}>Select your name so the app knows who's using it.</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {people.map(p => (
            <button
              key={p.id}
              onClick={() => onPick(p)}
              style={{ width: "100%", padding: "13px 20px", borderRadius: 12, border: `1px solid ${BORDER}`, background: SURFACE, color: TEXT, fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 15, cursor: "pointer", transition: "all 0.15s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = JADE; (e.currentTarget as HTMLButtonElement).style.color = JADE; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = BORDER; (e.currentTarget as HTMLButtonElement).style.color = TEXT; }}
            >
              {p.name}
            </button>
          ))}
        </div>
        <button
          onClick={() => onPick(null)}
          style={{ marginTop: 20, background: "transparent", border: "none", color: TEXT_DIM, fontSize: 12, cursor: "pointer", fontFamily: "'Montserrat',sans-serif" }}>
          Skip for now
        </button>
      </div>
    </div>
  );
}

