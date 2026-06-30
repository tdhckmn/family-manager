import { createContext, useContext } from "react";
import type { User } from "firebase/auth";

/** The authorized, signed-in user. Only ever non-null inside AuthGate's authorized tree. */
export const AuthContext = createContext<User | null>(null);

/** Returns the current signed-in user. Safe to call on any page rendered inside AuthGate. */
export function useAuth(): User {
  const user = useContext(AuthContext);
  if (!user) throw new Error("useAuth() must be used within an authorized AuthGate subtree");
  return user;
}
