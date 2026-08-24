import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { teamMembers } from "../data/mockData";
import type { TeamMember } from "../data/types";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";

interface AuthResult {
  error?: string;
}

interface AuthContextValue {
  currentUser: TeamMember | null;
  isLeader: boolean;
  loading: boolean;
  mode: "supabase" | "mock";
  loginAsMock: (userId: string) => void;
  signInWithPassword: (email: string, password: string) => Promise<AuthResult>;
  signUpWithPassword: (
    email: string,
    password: string,
    name: string,
    gender: "male" | "female",
  ) => Promise<AuthResult>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = "nursync.currentUserId";

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0][0]} ${parts[1][0]}` : name.slice(0, 2);
}

function AuthProviderMock({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(() =>
    localStorage.getItem(STORAGE_KEY),
  );

  const currentUser = useMemo(
    () => teamMembers.find((m) => m.id === userId) ?? null,
    [userId],
  );

  const loginAsMock = (id: string) => {
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
    loading: false,
    mode: "mock",
    loginAsMock,
    signInWithPassword: async () => ({ error: "Supabase غير مفعّل" }),
    signUpWithPassword: async () => ({ error: "Supabase غير مفعّل" }),
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function AuthProviderSupabase({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [currentUser, setCurrentUser] = useState<TeamMember | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase!.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const { data: sub } = supabase!.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setCurrentUser(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    supabase!
      .from("profiles")
      .select("id, name, initials, title, role, color, email, gender")
      .eq("id", session.user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setCurrentUser({
            ...data,
            progress: 0,
            tasksDone: 0,
            tasksTotal: 0,
          } as TeamMember);
        }
        setLoading(false);
      });
  }, [session]);

  const signInWithPassword = async (email: string, password: string) => {
    const { error } = await supabase!.auth.signInWithPassword({ email, password });
    return error ? { error: error.message } : {};
  };

  const signUpWithPassword = async (
    email: string,
    password: string,
    name: string,
    gender: "male" | "female",
  ) => {
    const { error } = await supabase!.auth.signUp({
      email,
      password,
      options: { data: { name, initials: initialsFromName(name), gender } },
    });
    return error ? { error: error.message } : {};
  };

  const logout = () => {
    supabase!.auth.signOut();
  };

  const value: AuthContextValue = {
    currentUser,
    isLeader: currentUser?.role === "leader",
    loading,
    mode: "supabase",
    loginAsMock: () => {},
    signInWithPassword,
    signUpWithPassword,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return isSupabaseConfigured ? (
    <AuthProviderSupabase>{children}</AuthProviderSupabase>
  ) : (
    <AuthProviderMock>{children}</AuthProviderMock>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
