import { useEffect, useRef, useState } from "react";
import { CreditCard } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTeamRoster } from "../hooks/useTeamRoster";
import { g, isFemaleUser } from "../lib/gender";
import { MOYASAR_PUBLISHABLE_KEY } from "../lib/moyasar";

const SCRIPT_SRC = "https://cdn.moyasar.com/mpf/1.15.0/moyasar.js";
const STYLE_HREF = "https://cdn.moyasar.com/mpf/1.15.0/moyasar.css";

declare global {
  interface Window {
    Moyasar?: {
      init: (config: {
        element: string;
        amount: number;
        currency: string;
        description: string;
        publishable_api_key: string;
        callback_url: string;
        methods: string[];
        metadata?: Record<string, string>;
      }) => void;
    };
  }
}

function loadMoyasarAssets(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Moyasar) {
      resolve();
      return;
    }
    if (!document.querySelector(`link[href="${STYLE_HREF}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = STYLE_HREF;
      document.head.appendChild(link);
    }
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("moyasar script failed")));
      return;
    }
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("moyasar script failed"));
    document.body.appendChild(script);
  });
}

/** نموذج دفع فوري بالبطاقة عبر Moyasar — بديل أسرع لرفع إثبات تحويل STC Pay
    اليدوي. الاشتراك يتفعّل تلقائيًا خلال ثوانٍ بعد نجاح الدفع (عبر webhook)،
    بدون انتظار مراجعة يدوية.

    mode="share": الدافع يدفع حصته هو بس (أي عضو يقدر يسويها).
    mode="full": الدافع يدفع فاتورة الفريق كاملة دفعة وحدة (متاحة لقائد
    الفريق فقط من الواجهة اللي تستدعيها). الـ webhook يمدد الاشتراك بالتناسب
    مع المبلغ الفعلي — فمو شرط اختيار "كامل" عشان الفريق يستفيد، كل دفعة
    تراكمية بحد ذاتها. profile_id بالـ metadata يربط الدفعة بصاحبها عشان
    قائمة "مين دفع حصته" بصفحة الأسعار. */
export default function MoyasarPayment({ mode }: { mode: "share" | "full" }) {
  const { team, currentUser } = useAuth();
  const { roster } = useTeamRoster();
  const formRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const memberCount = roster.length || 1;
  const pricePerPerson = team?.monthlyPrice ?? 40;
  const amountRiyals = mode === "full" ? pricePerPerson * memberCount : pricePerPerson;
  const isFemale = isFemaleUser(currentUser);

  useEffect(() => {
    if (!team) return;
    loadMoyasarAssets()
      .then(() => setReady(true))
      .catch(() => setError("تعذّر تحميل نموذج الدفع — تأكدي من اتصال الإنترنت وحاولي مرة ثانية"));
  }, [team]);

  useEffect(() => {
    if (!ready || !team || !currentUser || !window.Moyasar) return;
    window.Moyasar.init({
      element: ".mysr-form",
      amount: Math.round(amountRiyals * 100),
      currency: "SAR",
      description:
        mode === "full"
          ? `اشتراك فريق ${team.name} — الفاتورة كاملة`
          : `حصة ${currentUser.name} — فريق ${team.name}`,
      publishable_api_key: MOYASAR_PUBLISHABLE_KEY,
      callback_url: window.location.href,
      methods: ["creditcard"],
      metadata: { team_id: team.id, profile_id: currentUser.id },
    });
  }, [ready, team, currentUser, amountRiyals, mode]);

  if (!team || !currentUser) return null;

  return (
    <div key={mode} className="mt-3 rounded-2xl border border-amber-accent-200 bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <CreditCard size={16} className="text-amber-accent-600" />
        <p className="text-sm font-bold text-brand-950">
          {mode === "full"
            ? `ادفعوا الآن بالبطاقة — تفعيل فوري (${amountRiyals} ريال / شهر لـ ${memberCount} ${memberCount === 1 ? "عضو" : "أعضاء"})`
            : `${g(isFemale, "ادفعي", "ادفع")} حصتك بالبطاقة — تفعيل فوري (${amountRiyals} ريال)`}
        </p>
      </div>
      {error ? (
        <p className="text-xs font-semibold text-rose-600">{error}</p>
      ) : (
        <div ref={formRef} className="mysr-form" />
      )}
    </div>
  );
}
