import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import { useHousehold, HouseholdPerson } from "./household";

export function usePeople(): HouseholdPerson[] {
  const { householdId } = useHousehold();
  const [people, setPeople] = useState<HouseholdPerson[]>([]);
  useEffect(() => {
    return onSnapshot(
      doc(db, "users", householdId, "meta", "household"),
      snap => setPeople(snap.data()?.people ?? [])
    );
  }, [householdId]);
  return people;
}

/** Returns the color for a person by name, falling back to a deterministic palette color. */
const PALETTE = ["#5db88a", "#e070a8", "#5b8fd4", "#d4a45b", "#9b7fe8", "#46b6ad", "#d45b7a", "#7ab8e8"];
export function personColor(person: HouseholdPerson | undefined, name?: string): string {
  if (person?.color) return person.color;
  const key = person?.name ?? name ?? "";
  if (!key) return "#7a7890";
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}
