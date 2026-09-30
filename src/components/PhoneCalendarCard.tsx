import { useEffect, useState } from "react";
import { Check, Copy, RefreshCw, Smartphone } from "lucide-react";
import Card from "./ui/Card";
import { useAuth } from "../context/AuthContext";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";

type Scope = "mine" | "team";

/** اشتراك تقويم الجوال: رابط ICS خاص بالمستخدمة يضيفه تقويم أبل/قوقل/سامسونق ويتحدّث لحاله. */
export default function PhoneCalendarCard() {
  const { currentUser } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [scope, setScope] = useState<Scope>("mine");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured || !currentUser) return;
    let cancelled = false;
    supabase!.rpc("get_or_create_calendar_token").then(({ data, error: e }) => {
      if (cancelled) return;
      if (e || !data) setError("تعذّر تجهيز رابط التقويم — حدّثوا الصفحة وحاولوا مرة ثانية.");
      else setToken(data as string);
    });
    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  const base = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const httpsUrl = token && base ? `${base}/functions/v1/calendar-feed?t=${token}${scope === "team" ? "&scope=team" : ""}` : null;
  const webcalUrl = httpsUrl ? httpsUrl.replace(/^https:/, "webcal:") : null;
  const googleUrl = webcalUrl ? `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl)}` : null;

  const copy = async () => {
    if (!httpsUrl) return;
    try {
      await navigator.clipboard.writeText(httpsUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // نسخ يدوي
    }
  };

  const rotate = async () => {
    if (!supabase || busy) return;
    if (!window.confirm("تغيير الرابط يوقف الاشتراك القديم بكل أجهزتكم — لازم تضيفون الجديد. نكمل؟")) return;
    setBusy(true);
    setError(null);
    const { data, error: e } = await supabase.rpc("rotate_calendar_token");
    setBusy(false);
    if (e || !data) setError("تعذّر تغيير الرابط — حاولوا مرة ثانية.");
    else setToken(data as string);
  };

  return (
    <Card tone="teal" className="space-y-3">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-500 text-white">
          <Smartphone size={18} />
        </span>
        <div>
          <h3 className="text-base font-bold text-brand-950">تقويم الجوال</h3>
          <p className="mt-0.5 text-xs leading-relaxed text-brand-950/55">
            اشتركوا مرة وحدة، ومهامكم ومواعيد مراحل البحث وموعد التسليم تنزل بتقويم جوالكم وتتحدّث لحالها، وتجيكم تنبيهات من جوالكم مو من الموقع.
          </p>
        </div>
      </div>

      {!isSupabaseConfigured ? (
        <p className="rounded-xl bg-surface-muted px-3 py-2 text-xs font-semibold text-brand-950/55">
          هذي الميزة تشتغل بحساب حقيقي على Wesync — مو بالعرض التجريبي.
        </p>
      ) : (
        <>
          <div className="flex gap-2">
            {(
              [
                ["mine", "مهامي ومواعيدي"],
                ["team", "مواعيد كل الفريق"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setScope(id)}
                className={`rounded-xl border px-3 py-1.5 text-xs font-bold ${
                  scope === id ? "border-brand-500 bg-brand-500/10 text-brand-800" : "border-brand-100 bg-paper text-brand-950/60 hover:bg-surface-muted"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {httpsUrl && webcalUrl && googleUrl ? (
            <>
              <div className="flex flex-wrap gap-2">
                <a
                  href={webcalUrl}
                  className="rounded-xl bg-brand-500 px-3.5 py-2 text-xs font-bold text-white hover:bg-brand-600"
                >
                  أضيفوه لتقويم آيفون / أندرويد
                </a>
                <a
                  href={googleUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-brand-200 bg-paper px-3.5 py-2 text-xs font-bold text-brand-800 hover:bg-surface-muted"
                >
                  أضيفوه لقوقل كالندر
                </a>
                <button
                  onClick={copy}
                  className="flex items-center gap-1.5 rounded-xl border border-brand-200 bg-paper px-3.5 py-2 text-xs font-bold text-brand-800 hover:bg-surface-muted"
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? "تم النسخ" : "نسخ الرابط"}
                </button>
              </div>
              <ul className="list-disc space-y-1 pe-5 text-[11px] leading-relaxed text-brand-950/50">
                <li>يتضمن: مهام غير مكتملة لها تاريخ تسليم، مواعيد مراحل البحث، وموعد تسليم البحث. أحداث التقويم اللي تضيفونها يدويًا هنا (اجتماعات مثلًا) ما تنزل للجوال حاليًا.</li>
                <li>آبل تحدّثه كل ساعة تقريبًا وتشتغل التنبيهات. قوقل يتأخر ١٢–٢٤ ساعة أحيانًا ويستخدم تنبيهاته الافتراضية.</li>
                <li>الرابط سرّي وخاص بحسابكم — أي أحد عنده الرابط يقدر يشوف مهامكم، لا ترسلونه لأحد.</li>
              </ul>
              <button
                onClick={rotate}
                disabled={busy}
                className="flex items-center gap-1.5 text-[11px] font-bold text-brand-700 underline underline-offset-2 disabled:opacity-50"
              >
                <RefreshCw size={11} className={busy ? "animate-spin" : ""} />
                غيّروا الرابط (لو وصل لأحد)
              </button>
            </>
          ) : (
            !error && <p className="text-xs text-brand-950/45">جاري تجهيز الرابط...</p>
          )}
          {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}
        </>
      )}
    </Card>
  );
}
