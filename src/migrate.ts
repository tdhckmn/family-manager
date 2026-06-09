import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";

// Only this account has pre-existing data in the legacy (shared) locations.
// Firestore rules allow only this email to read the legacy paths.
const OWNER_EMAIL = "thomasdhickman@gmail.com";

/**
 * One-time data migrations, run on sign-in. All steps are idempotent and skip
 * anything already migrated.
 *
 * 1. Notes rename (all users): the "todos" tool was renamed to "Notes", so its
 *    per-user collection moves from `users/{uid}/todos` → `users/{uid}/notes`.
 * 2. Legacy shared data (owner only): copies the original shared docs
 *    (`finance/plan`, `todos/*`, `config/foodPlanner`) into the owner's per-user
 *    space. Firestore rules allow only the owner to read those legacy paths.
 */
export async function migrateLegacyDataOnce(uid: string, email: string | null | undefined) {
  // ── Notes rename: per-user todos → per-user notes (runs for everyone) ──────
  try {
    const perNotes = collection(db, "users", uid, "notes");
    if ((await getDocs(perNotes)).empty) {
      const perTodos = await getDocs(collection(db, "users", uid, "todos"));
      if (!perTodos.empty) {
        await Promise.all(perTodos.docs.map(d => setDoc(doc(db, "users", uid, "notes", d.id), d.data())));
      }
    }
  } catch (e) {
    console.error("Notes rename migration skipped:", e);
  }

  if ((email ?? "").toLowerCase() !== OWNER_EMAIL) return;
  try {
    // Finance plan
    const perFinance = doc(db, "users", uid, "finance", "plan");
    if (!(await getDoc(perFinance)).exists()) {
      const legacy = await getDoc(doc(db, "finance", "plan"));
      if (legacy.exists()) await setDoc(perFinance, legacy.data());
    }

    // Notes (legacy shared `todos` → per-user `notes`)
    const perNotes = collection(db, "users", uid, "notes");
    if ((await getDocs(perNotes)).empty) {
      const legacy = await getDocs(collection(db, "todos"));
      await Promise.all(legacy.docs.map(d => setDoc(doc(db, "users", uid, "notes", d.id), d.data())));
    }

    // Food planner
    const perFood = doc(db, "users", uid, "food", "planner");
    if (!(await getDoc(perFood)).exists()) {
      const legacy = await getDoc(doc(db, "config", "foodPlanner"));
      if (legacy.exists()) await setDoc(perFood, legacy.data());
    }
  } catch (e) {
    console.error("Legacy data migration skipped:", e);
  }
}
