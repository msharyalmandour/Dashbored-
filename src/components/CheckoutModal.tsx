import { useEffect, useState } from "react";
import { CheckCircle2, CreditCard, Sparkles, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTeamRoster } from "../hooks/useTeamRoster";
import MoyasarPayment from "./MoyasarPayment";

/** نافذة دفع منبثقة تلخّص الطلب قبل تضمين نموذج Moyasar الفعلي، وتعرض حالة
    نجاح واضحة لما يرجع المستخدم بعد الدفع (Moyasar يرجّعه بـ ?status=paid
    عبر callback_url). التحقق الحقيقي من نجاح الدفع وتفعيل الاشتراك يبقى
    بالكامل عند الـ webhook — هذا فقط تحسين للواجهة. */
export default function CheckoutModal({ onClose }: { onClose: () => void }) {
  const { team } = useAuth();
  const { roster } = useTeamRoster();
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("status") === "paid") setPaid(true);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  if (!team) return null;

  const memberCount = roster.length || 1;
  const total = (team.monthlyPrice ?? 40) * memberCount;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-[1.75rem] bg-gradient-to-br from-amber-accent-300 via-brand-300 to-amber-accent-400 p-[1.5px] shadow-2xl shadow-black/25"
        onClick={(e) => e.stopPropagation()}
      >
      <div className="overflow-hidden rounded-[calc(1.75rem-1.5px)] bg-paper">
        <div className="relative flex items-center justify-between overflow-hidden bg-gradient-to-b from-brand-50 to-paper px-5 py-4">
          <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-amber-accent-200/40 blur-2xl" />
          <p className="relative flex items-center gap-1.5 font-display text-base font-extrabold text-brand-950">
            <Sparkles size={15} className="text-amber-accent-500" />
            {paid ? "تم الدفع بنجاح" : "إتمام الاشتراك"}
          </p>
          <button
            onClick={onClose}
            className="relative rounded-lg p-1.5 text-brand-950/40 hover:bg-surface-muted"
          >
            <X size={18} />
          </button>
        </div>

        {paid ? (
          <div
            className="flex flex-col items-center gap-3 px-6 py-10 text-center"
            style={{ animation: "success-fade 0.4s ease-out" }}
          >
            <span
              className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-500 text-white"
              style={{ animation: "success-pulse 0.6s ease-out" }}
            >
              <CheckCircle2 size={30} />
            </span>
            <p className="font-display text-lg font-extrabold text-brand-950">
              تفعّل اشتراككم 🎉
            </p>
            <p className="text-sm text-brand-950/55">
              شكرًا لكم! فريقكم رجع يقدر يضيف مهام ويعدّل عليها بكل حرية.
            </p>
            <button
              onClick={onClose}
              className="mt-2 rounded-xl bg-gradient-to-l from-brand-500 to-brand-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-brand-500/30 hover:from-brand-600 hover:to-brand-700"
            >
              تمام
            </button>
          </div>
        ) : (
          <div className="p-5">
            <div className="mb-4 rounded-2xl bg-surface-muted p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-brand-950/60">الفريق</span>
                <span className="font-semibold text-brand-950">{team.name}</span>
              </div>
              <div className="mt-1.5 flex items-center justify-between text-sm">
                <span className="text-brand-950/60">عدد الأعضاء</span>
                <span className="font-semibold text-brand-950">{memberCount}</span>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-brand-100 pt-3">
                <span className="flex items-center gap-1.5 text-sm font-bold text-brand-950">
                  <CreditCard size={14} />
                  الإجمالي شهريًا
                </span>
                <span className="font-display text-lg font-extrabold text-brand-700">
                  {total} ريال
                </span>
              </div>
            </div>
            <MoyasarPayment />
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
