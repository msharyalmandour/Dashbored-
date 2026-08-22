import { Navigate, useLocation } from "react-router-dom";
import { Stethoscope } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { teamMembers } from "../data/mockData";
import Avatar from "../components/ui/Avatar";

export default function Login() {
  const { currentUser, login } = useAuth();
  const location = useLocation();

  if (currentUser) {
    const from = (location.state as { from?: Location })?.from?.pathname ?? "/";
    return <Navigate to={from} replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-md rounded-2xl border border-brand-100 bg-white p-8 shadow-sm shadow-brand-950/5">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500 text-white">
            <Stethoscope size={24} />
          </div>
          <h1 className="text-2xl font-extrabold text-brand-950">NURSYNC</h1>
          <p className="mt-1 text-sm text-brand-950/50">
            منصة إدارة أبحاث التخرج لفرق طلاب التمريض
          </p>
        </div>

        <p className="mb-3 text-sm font-semibold text-brand-950/70">
          اختر حسابك لتسجيل الدخول
        </p>
        <div className="space-y-2">
          {teamMembers.map((member) => (
            <button
              key={member.id}
              onClick={() => login(member.id)}
              className="flex w-full items-center gap-3 rounded-xl border border-brand-100 p-3 text-start transition-colors hover:border-brand-300 hover:bg-brand-50"
            >
              <Avatar initials={member.initials} color={member.color} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-brand-950">
                  {member.name}
                </p>
                <p className="truncate text-xs text-brand-950/50">{member.title}</p>
              </div>
              {member.role === "leader" && (
                <span className="rounded-full bg-amber-accent-100 px-2 py-1 text-[11px] font-bold text-amber-accent-600">
                  قائدة الفريق
                </span>
              )}
            </button>
          ))}
        </div>

        <p className="mt-6 text-center text-xs text-brand-950/40">
          هذا تسجيل دخول تجريبي ببيانات وهمية — سيتم ربط تسجيل الدخول
          الحقيقي عبر Supabase لاحقًا.
        </p>
      </div>
    </div>
  );
}
