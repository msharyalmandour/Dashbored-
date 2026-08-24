import { useState } from "react";
import { KeyRound } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Logo from "../components/Logo";

export default function ResetPassword() {
  const { updatePassword, cancelPasswordRecovery } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("كلمتا المرور غير متطابقتين");
      return;
    }
    setSubmitting(true);
    const result = await updatePassword(password);
    setSubmitting(false);
    if (result.error) setError(result.error);
    else setDone(true);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-md rounded-3xl border border-brand-100 bg-paper p-8 shadow-sm shadow-brand-950/5">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3">
            <Logo size={48} />
          </div>
          <h1 className="font-display text-2xl font-extrabold text-brand-950">
            تعيين كلمة مرور جديدة
          </h1>
        </div>

        {done ? (
          <div className="text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-100 text-brand-600">
              <KeyRound size={22} />
            </span>
            <p className="mt-4 text-sm font-semibold text-brand-950/70">
              تم تحديث كلمة مرورك بنجاح. تقدر تكمل استخدام حسابك الحين.
            </p>
            <button
              onClick={() => (window.location.hash = "#/")}
              className="mt-5 w-full rounded-xl bg-brand-500 py-2.5 text-sm font-bold text-white hover:bg-brand-600"
            >
              الذهاب للوحة التحكم
            </button>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block font-semibold text-brand-950/70">
                  كلمة المرور الجديدة
                </span>
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
              <label className="block text-sm">
                <span className="mb-1 block font-semibold text-brand-950/70">
                  تأكيد كلمة المرور
                </span>
                <input
                  required
                  type="password"
                  minLength={6}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
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
                {submitting ? "..." : "حفظ كلمة المرور"}
              </button>
            </form>

            <button
              onClick={cancelPasswordRecovery}
              className="mt-4 w-full text-center text-sm font-semibold text-brand-600 hover:underline"
            >
              إلغاء والرجوع لتسجيل الدخول
            </button>
          </>
        )}
      </div>
    </div>
  );
}
