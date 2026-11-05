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
import type { Team, TeamMember } from "../data/types";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";
import { canTeamWrite, getTeamSubscriptionState, type TeamSubscriptionState } from "../lib/subscription";
import { tr } from "../lib/i18n";

interface AuthResult {
  error?: string;
}

interface AuthContextValue {
  currentUser: TeamMember | null;
  isLeader: boolean;
  isSuperAdmin: boolean;
  /** null بوضع العرض التجريبي — الفريق التجريبي مو مرتبط باشتراك حقيقي */
  team: Team | null;
  /** فعّالة دايمًا بوضع العرض التجريبي؛ تعكس حالة اشتراك الفريق الحقيقية بوضع Supabase */
  subscriptionState: TeamSubscriptionState;
  canWrite: boolean;
  loading: boolean;
  mode: "supabase" | "mock";
  /** true بعد ما المستخدم يفتح رابط "استعادة كلمة المرور" من بريده */
  passwordRecovery: boolean;
  loginAsMock: (userId: string) => void;
  signInWithPassword: (email: string, password: string) => Promise<AuthResult>;
  signUpWithPassword: (
    email: string,
    password: string,
    name: string,
    gender: "male" | "female",
    teamId?: string,
    referralCode?: string,
    university?: string,
  ) => Promise<AuthResult>;
  resetPassword: (email: string) => Promise<AuthResult>;
  updatePassword: (password: string) => Promise<AuthResult>;
  cancelPasswordRecovery: () => void;
  /** قائد الفريق فقط — يعدّل جامعة الفريق من صفحة الفريق */
  updateTeamUniversity: (university: string) => Promise<AuthResult>;
  /** قائد الفريق فقط — يختار باقة Basic أو AI (السيرفر يحسب السعر ويرفض التبديل بنص الشهر) */
  setTeamPlan: (plan: "basic" | "ai") => Promise<AuthResult>;
  /** شخصية الأفاتار (profiles.avatar) — "piece:bg:skin" */
  setMyAvatar: (avatar: string) => Promise<AuthResult>;
  /** يخفي كرت «أول أسبوع» للفريق كله */
  dismissFirstWeek: () => Promise<AuthResult>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = "nursync.currentUserId";

const mockTeam: Team = {
  id: "mock-team",
  name: tr("فريق البحث التجريبي"),
  subscriptionEndDate: "2030-01-01",
  memberCount: teamMembers.length,
  monthlyPrice: 40,
  plan: "ai",
  isFounder: true,
  isOnTrial: false,
  referralCode: "DEMO01",
};

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
    isSuperAdmin: currentUser?.isSuperAdmin ?? false,
    team: mockTeam,
    subscriptionState: "active",
    canWrite: true,
    loading: false,
    mode: "mock",
    passwordRecovery: false,
    loginAsMock,
    signInWithPassword: async () => ({ error: tr("Supabase غير مفعّل") }),
    signUpWithPassword: async () => ({ error: tr("Supabase غير مفعّل") }),
    resetPassword: async () => ({ error: tr("Supabase غير مفعّل") }),
    updatePassword: async () => ({ error: tr("Supabase غير مفعّل") }),
    cancelPasswordRecovery: () => {},
    updateTeamUniversity: async () => ({ error: tr("Supabase غير مفعّل") }),
    setTeamPlan: async () => ({ error: tr("Supabase غير مفعّل") }),
    setMyAvatar: async () => ({}),
    dismissFirstWeek: async () => ({}),
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function AuthProviderSupabase({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [currentUser, setCurrentUser] = useState<TeamMember | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  // قبل ما نقرأ الجلسة المحفوظة ما نعتبر المستخدم «غير مسجّل»: وإلا كل تحميل جديد (مثل الرجعة من قوقل)
  // يرميه لصفحة الدخول/الهبوط لحظة ويضيع ?drive=... من الرابط
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    supabase!.auth
      .getSession()
      .then(({ data }) => {
        // بنفس الدفعة عشان تشتغل الحالة مرة وحدة (بدون جلب ملف المستخدم مرتين)
        setSession(data.session);
        setSessionChecked(true);
      })
      .catch(() => setSessionChecked(true));

    const { data: sub } = supabase!.auth.onAuthStateChange((event, s) => {
      // تجديد الرمز وإعادة الإرسال عند العودة للتبويب ما يغيّر المستخدم، فلا نحدّث الحالة (يوفّر إعادة رسم الموقع كله)
      setSession((prev) => (prev?.user.id === s?.user.id ? prev : s));
      if (event === "PASSWORD_RECOVERY") setPasswordRecovery(true);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  // نعتمد على رقم المستخدم فقط (مو كائن الجلسة): Supabase يجدّد الجلسة ويرسل أحداثًا كل شوي،
  // وكل مرة كان الكائن «الجديد» يعيد جلب الملف ويرجّع شاشة التحميل ويعلّق الصفحة.
  const userId = session?.user.id ?? null;

  useEffect(() => {
    if (!userId) {
      if (!sessionChecked) return;
      setCurrentUser(null);
      setTeam(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const base = "id, team_id, name, initials, title, role, color, email, gender, is_super_admin";
    // avatar عمود جديد: لو ملف SQL ما انشغّل للحين نقرأ بدونه بدل ما يطيح الدخول
    const loadProfile = async () => {
      const first = await supabase!.from("profiles").select(`${base}, avatar`).eq("id", userId).single();
      if (!first.error || !/avatar/.test(first.error.message)) return first;
      return supabase!.from("profiles").select(base).eq("id", userId).single();
    };
    loadProfile()
      .then(async ({ data }) => {
        if (!data) {
          setLoading(false);
          return;
        }

        const { team_id, is_super_admin, ...rest } = data as typeof data & {
          team_id: string | null;
          is_super_admin: boolean;
        };
        setCurrentUser({
          ...rest,
          teamId: team_id,
          isSuperAdmin: is_super_admin,
          progress: 0,
          tasksDone: 0,
          tasksTotal: 0,
        } as TeamMember);

        if (team_id) {
          const cols = "id, name, subscription_end_date, monthly_price, plan, is_founder, on_trial, share_token, supervisor_note, supervisor_note_at, referral_code, university, created_at";
          let teamRes = await supabase!.from("teams").select(`${cols}, first_week_dismissed_at`).eq("id", team_id).single();
          if (teamRes.error && /first_week_dismissed_at/.test(teamRes.error.message)) {
            teamRes = (await supabase!.from("teams").select(cols).eq("id", team_id).single()) as typeof teamRes;
          }
          const teamRow = teamRes.data as (typeof teamRes.data & { first_week_dismissed_at?: string | null; created_at?: string }) | null;
          if (teamRow) {
            setTeam({
              id: teamRow.id,
              name: teamRow.name,
              subscriptionEndDate: teamRow.subscription_end_date,
              memberCount: 0,
              monthlyPrice: Number(teamRow.monthly_price),
              plan: teamRow.plan === "basic" ? "basic" : "ai",
              isFounder: teamRow.is_founder,
              isOnTrial: teamRow.on_trial,
              shareToken: teamRow.share_token,
              supervisorNote: teamRow.supervisor_note,
              supervisorNoteAt: teamRow.supervisor_note_at,
              referralCode: teamRow.referral_code,
              university: teamRow.university,
              createdAt: teamRow.created_at,
              firstWeekDismissedAt: teamRow.first_week_dismissed_at ?? null,
            });
          }
        } else {
          setTeam(null);
        }

        setLoading(false);
      });
  }, [userId, sessionChecked]);

  const signInWithPassword = async (email: string, password: string) => {
    const { error } = await supabase!.auth.signInWithPassword({ email, password });
    return error ? { error: error.message } : {};
  };

  const signUpWithPassword = async (
    email: string,
    password: string,
    name: string,
    gender: "male" | "female",
    teamId?: string,
    referralCode?: string,
    university?: string,
  ) => {
    const { error } = await supabase!.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          initials: initialsFromName(name),
          gender,
          ...(teamId ? { team_id: teamId } : {}),
          ...(referralCode ? { referral_code: referralCode } : {}),
          ...(university?.trim() ? { university: university.trim() } : {}),
        },
      },
    });
    // handle_new_user يرفض الانضمام لفريق فيه ٥ أعضاء (team_full)، وSupabase يرجّعها كـ "Database error saving new user"
    if (error && teamId && /team_full|database error saving new user/i.test(error.message)) {
      return { error: tr("تعذّر الانضمام للفريق — غالبًا الفريق مكتمل (٥ أعضاء كحد أقصى) أو رابط الدعوة قديم. تواصلوا مع قائد الفريق.") };
    }
    return error ? { error: error.message } : {};
  };

  const updateTeamUniversity = async (university: string) => {
    const { error } = await supabase!.rpc("update_team_university", { p_university: university });
    if (!error) setTeam((prev) => (prev ? { ...prev, university: university.trim() || null } : prev));
    return error ? { error: error.message } : {};
  };

  const setTeamPlan = async (plan: "basic" | "ai") => {
    const { data, error } = await supabase!.rpc("set_team_plan", { p_plan: plan });
    if (error) return { error: error.message };
    setTeam((prev) => (prev ? { ...prev, plan, monthlyPrice: Number(data) } : prev));
    return {};
  };

  const setMyAvatar = async (avatar: string) => {
    if (!currentUser) return { error: "no user" };
    const prev = currentUser.avatar;
    setCurrentUser((u) => (u ? { ...u, avatar } : u));
    const { error } = await supabase!.from("profiles").update({ avatar }).eq("id", currentUser.id);
    if (error) setCurrentUser((u) => (u ? { ...u, avatar: prev } : u));
    return error ? { error: error.message } : {};
  };

  const dismissFirstWeek = async () => {
    const { error } = await supabase!.rpc("dismiss_first_week");
    if (!error) setTeam((t) => (t ? { ...t, firstWeekDismissedAt: new Date().toISOString() } : t));
    return error ? { error: error.message } : {};
  };

  const logout = () => {
    supabase!.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase!.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname,
    });
    return error ? { error: error.message } : {};
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase!.auth.updateUser({ password });
    if (!error) setPasswordRecovery(false);
    return error ? { error: error.message } : {};
  };

  const cancelPasswordRecovery = () => {
    setPasswordRecovery(false);
    supabase!.auth.signOut();
  };

  const subscriptionState = getTeamSubscriptionState(team?.subscriptionEndDate);

  const value: AuthContextValue = {
    currentUser,
    isLeader: currentUser?.role === "leader",
    isSuperAdmin: currentUser?.isSuperAdmin ?? false,
    team,
    subscriptionState,
    canWrite: canTeamWrite(subscriptionState),
    loading,
    mode: "supabase",
    passwordRecovery,
    loginAsMock: () => {},
    signInWithPassword,
    signUpWithPassword,
    resetPassword,
    updatePassword,
    cancelPasswordRecovery,
    updateTeamUniversity,
    setTeamPlan,
    setMyAvatar,
    dismissFirstWeek,
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
