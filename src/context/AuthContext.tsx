import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { teamMembers } from "../data/mockData";
import type { TeamMember } from "../data/types";

interface AuthContextValue {
  currentUser: TeamMember | null;
  isLeader: boolean;
  login: (userId: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = "nursync.currentUserId";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(() =>
    localStorage.getItem(STORAGE_KEY),
  );

  const currentUser = useMemo(
    () => teamMembers.find((m) => m.id === userId) ?? null,
    [userId],
  );

  const login = (id: string) => {
    localStorage.setItem(STORAGE_KEY, id);
    setUserId(id);
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setUserId(null);
  };

  const value: AuthContextValue = {
    currentUser,
    isLeader: currentUser?.role === "leader",
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
