import { useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Coffee, Stethoscope } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { demoCredentials, teamMembers } from "../data/mockData";

export default function Login() {
  const { currentUser, mode, loginAsMock, signInWithPassword, signUpWithPassword } = useAuth();
  const location = useLocation();

  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [universityId, setUniversityId] = useState("");
  const [mockPassword, setMockPassword] = useState("");
  const [mockError, setMockError] = useState<string | null>(null);
  const [showDemoCreds, setShowDemoCreds] = useState(false);

  if (currentUser) {
    const from = (location.state as { from?: Location })?.from?.pathname ?? "/";
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const result = isSignUp
      ? await signUpWithPassword(email, password, name)
      : await signInWithPassword(email, password);

    setSubmitting(false);
    if (result.error) setError(result.error);
    else if (isSignUp) {
      setError("تم إنشاء الحساب! تحقق من بريدك الإلكتروني لتأكيد الحساب ثم سجّل دخولك.");
    }
  };

  const handleMockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMockError(null);
    const match = demoCredentials.find(
      (c) => c.universityId === universityId.trim() && c.password === mockPassword,
    );
    if (!match) {
      setMockError("الرقم الجامعي أو كلمة المرور غير صحيحة — جرّب البيانات التجريبية تحت.");
      return;
    }
    loginAsMock(match.memberId);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-md rounded-3xl border border-brand-100 bg-paper p-8 shadow-sm shadow-brand-950/5">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-sm shadow-brand-500/30">
            <Stethoscope size={24} />
          </div>
          <h1 className="font-display text-2xl font-extrabold text-brand-950">NURSYNC</h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-brand-950/50">
            جهّز فنجان قهوتك، ونبدأ رحلة بحثك <Coffee size={14} className="text-amber-accent-600" />
          </p>
        </div>

        {mode === "supabase" ? (
          <>
            <form onSubmit={handleSubmit} className="space-y-3">
              {isSignUp && (
                <label className="block text-sm">
                  <span className="mb-1 block font-semibold text-brand-950/70">الاسم الكامل</span>
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-brand-100 px-3 py-2.5 outline-none focus:border-brand-300"
                    placeholder="مثال: سارة العتيبي"
                  />
                </label>
              )}
              <label className="block text-sm">
                <span className="mb-1 block font-semibold text-brand-950/70">البريد الجامعي</span>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-brand-100 px-3 py-2.5 outline-none focus:border-brand-300"
                  placeholder="you@example.com"
                  dir="ltr"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-semibold text-brand-950/70">كلمة المرور</span>
                <input
                  required
                  type="password"
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-brand-100 px-3 py-2.5 outline-none focus:border-brand-300"
                  placeholder="••••••••"
                  dir="ltr"
                />
              </label>

              {error && (
                <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-brand-500 py-2.5 text-sm font-bold text-white hover:bg-brand-600 disabled:opacity-60"
              >
                {submitting ? "..." : isSignUp ? "إنشاء حساب" : "تسجيل الدخول"}
              </button>
            </form>

            <button
              onClick={() => {
                setIsSignUp((s) => !s);
                setError(null);
              }}
              className="mt-4 w-full text-center text-sm font-semibold text-brand-600 hover:underline"
            >
              {isSignUp ? "عندك حساب؟ سجّل دخولك" : "ما عندك حساب؟ أنشئ واحد"}
            </button>
          </>
        ) : (
          <>
            <form onSubmit={handleMockSubmit} className="space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block font-semibold text-brand-950/70">الرقم الجامعي</span>
                <input
                  required
                  inputMode="numeric"
                  value={universityId}
                  onChange={(e) => setUniversityId(e.target.value)}
                  className="w-full rounded-xl border border-brand-100 px-3 py-2.5 outline-none focus:border-brand-300"
                  placeholder="442100154"
                  dir="ltr"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-semibold text-brand-950/70">كلمة المرور</span>
                <input
                  required
                  type="password"
                  value={mockPassword}
                  onChange={(e) => setMockPassword(e.target.value)}
                  className="w-full rounded-xl border border-brand-100 px-3 py-2.5 outline-none focus:border-brand-300"
                  placeholder="••••••••"
                  dir="ltr"
                />
              </label>

              {mockError && (
                <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600">
                  {mockError}
                </p>
              )}

              <button
                type="submit"
                className="w-full rounded-xl bg-brand-500 py-2.5 text-sm font-bold text-white hover:bg-brand-600"
              >
                تسجيل الدخول
              </button>
            </form>

            <button
              onClick={() => setShowDemoCreds((s) => !s)}
              className="mt-4 w-full text-center text-sm font-semibold text-brand-600 hover:underline"
            >
              {showDemoCreds ? "إخفاء بيانات الدخول التجريبية" : "عرض بيانات الدخول التجريبية"}
            </button>

            {showDemoCreds && (
              <div className="mt-3 space-y-1.5 rounded-xl bg-surface-muted p-3">
                {demoCredentials.map((c) => {
                  const member = teamMembers.find((m) => m.id === c.memberId)!;
                  return (
                    <button
                      key={c.memberId}
                      type="button"
                      onClick={() => {
                        setUniversityId(c.universityId);
                        setMockPassword(c.password);
                        setMockError(null);
                      }}
                      className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-xs hover:bg-paper"
                    >
                      <span className="font-semibold text-brand-950/70">
                        {member.name}
                        {member.role === "leader" && (
                          <span className="ms-1 text-amber-accent-600">(قائدة الفريق)</span>
                        )}
                      </span>
                      <span className="font-mono text-brand-950/45" dir="ltr">
                        {c.universityId} / {c.password}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            <p className="mt-6 text-center text-xs text-brand-950/40">
              هذا تسجيل دخول تجريبي بمحاكاة بوابة الطالب — لتفعيل تسجيل دخول
              حقيقي بالبريد الجامعي وكلمة المرور، أضف مفاتيح Supabase في
              متغيرات البيئة (راجع ملف .env.example).
            </p>
          </>
        )}
      </div>
    </div>
  );
}
