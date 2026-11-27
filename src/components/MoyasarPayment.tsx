import { useEffect, useRef, useState } from "react";
import { CreditCard } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { g, isFemaleUser } from "../lib/gender";
import { MOYASAR_PUBLISHABLE_KEY } from "../lib/moyasar";
import { tr } from "../lib/i18n";

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
        apple_pay?: { country: string; label: string; validate_merchant_url: string };
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

/** نموذج دفع فوري (بطاقة/مدى، Apple Pay، STC Pay) عبر Moyasar. المبلغ والوصف والـ metadata يحسبها
    CheckoutModal (المدة، عن مين، صندوق المنح، خصم الاستمرار) — والسيرفر (moyasar-webhook) يتحقق من كل شي
    ويحسب الأيام بنفسه، فالواجهة ما تقدر تعطي أحد أيام أكثر من اللي دفعها.
    profile_id = الدافع دايمًا · for_profile_id = اللي انْدفع عنه (لو «عن صاحبي»). */
export default function MoyasarPayment({
  amount,
  description,
  label,
  metadata,
}: {
  amount: number;
  description: string;
  label: string;
  metadata: Record<string, string>;
}) {
  const { team, currentUser } = useAuth();
  const formRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isFemale = isFemaleUser(currentUser);
  const metaKey = JSON.stringify(metadata);

  useEffect(() => {
    if (!team) return;
    loadMoyasarAssets()
      .then(() => setReady(true))
      .catch(() => setError(g(isFemale, tr("تعذّر تحميل نموذج الدفع — تأكدي من اتصال الإنترنت وحاولي مرة ثانية"), tr("تعذّر تحميل نموذج الدفع — تأكد من اتصال الإنترنت وحاول مرة ثانية"))));
  }, [team, isFemale]);

  useEffect(() => {
    if (!ready || !team || !currentUser || !window.Moyasar || amount <= 0) return;
    window.Moyasar.init({
      element: ".mysr-form",
      amount: Math.round(amount * 100),
      currency: "SAR",
      description,
      publishable_api_key: MOYASAR_PUBLISHABLE_KEY,
      callback_url: window.location.href,
      // Apple Pay يحتاج توثيق الدومين بلوحة Moyasar، وSTC Pay يحتاج تفعيله من حسابهم — لو مو مفعّلين ما يطلعون
      methods: ["creditcard", "applepay", "stcpay"],
      apple_pay: {
        country: "SA",
        label: "Wesync",
        validate_merchant_url: "https://api.moyasar.com/v1/applepay/initiate",
      },
      metadata: { team_id: team.id, profile_id: currentUser.id, ...JSON.parse(metaKey) },
    });
  }, [ready, team, currentUser, amount, description, metaKey]);

  if (!team || !currentUser) return null;

  return (
    <div className="rounded-2xl border border-amber-accent-200 bg-paper p-4">
      <div className="mb-3 flex items-center gap-2">
        <CreditCard size={16} className="text-amber-accent-600" />
        <p className="text-sm font-bold text-brand-950">{label}</p>
      </div>
      {error ? (
        <p className="text-xs font-semibold text-rose-600">{error}</p>
      ) : (
        // key: نموذج جديد كل ما تغيّر المبلغ أو الخيارات (Moyasar ما يتحدّث بمكانه)
        <div key={`${amount}-${metaKey}`} ref={formRef} className="mysr-form" />
      )}
    </div>
  );
}
