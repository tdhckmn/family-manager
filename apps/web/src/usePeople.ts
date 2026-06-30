import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import { useHousehold, type HouseholdPerson } from "./household";

export { personColor } from "@equanimity/core";

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
