import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";

// Only this account has pre-existing data in the legacy (shared) locations.
// Firestore rules allow only this email to read the legacy paths.
const OWNER_EMAIL = "thomasdhickman@gmail.com";

/**
 * One-time copy of the original shared data (`finance/plan`, `todos/*`) into the
 * owner's per-user space. Idempotent: skips anything already migrated. Runs only
 * for the owner; everyone else starts with their own empty data.
 */
export async function migrateLegacyDataOnce(uid: string, email: string | null | undefined) {
  if ((email ?? "").toLowerCase() !== OWNER_EMAIL) return;
  try {
    // Finance plan
    const perFinance = doc(db, "users", uid, "finance", "plan");
    if (!(await getDoc(perFinance)).exists()) {
      const legacy = await getDoc(doc(db, "finance", "plan"));
      if (legacy.exists()) await setDoc(perFinance, legacy.data());
    }

    // Todos
    const perTodos = collection(db, "users", uid, "todos");
    if ((await getDocs(perTodos)).empty) {
      const legacy = await getDocs(collection(db, "todos"));
      await Promise.all(legacy.docs.map(d => setDoc(doc(db, "users", uid, "todos", d.id), d.data())));
    }
  } catch (e) {
    console.error("Legacy data migration skipped:", e);
  }
}
