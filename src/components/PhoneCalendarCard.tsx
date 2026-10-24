import { useEffect, useState } from "react";
import { Check, Copy, RefreshCw } from "lucide-react";
import { Panel } from "./ui/page";
import { AppleLogo, GoogleLogo, LogoTile } from "./ui/BrandLogos";
import { useAuth } from "../context/AuthContext";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";
import { tr } from "../lib/i18n";

type Scope = "mine" | "team";

/** ربط التقويم: زرّان بشعاري قوقل وآبل. بعد الربط، أي موعد أو مهمة تنضاف بـWesync تنزل لتقويم جوالكم لحالها.
    (اشتراك ICS خاص بكل مستخدم — آبل تحدّثه كل ١٥ دقيقة تقريبًا، وقوقل حسب جدوله هو، عادة كل كم ساعة.) */
export default function PhoneCalendarCard() {
  const { currentUser } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [scope, setScope] = useState<Scope>("team");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured || !currentUser) return;
    let cancelled = false;
    supabase!.rpc("get_or_create_calendar_token").then(({ data, error: e }) => {
      if (cancelled) return;
      if (e || !data) setError(tr("تعذّر تجهيز رابط التقويم — حدّثوا الصفحة وحاولوا مرة ثانية."));
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
    if (!window.confirm(tr("تغيير الرابط يوقف الاشتراك القديم بكل أجهزتكم — لازم تربطون من جديد. نكمل؟"))) return;
    setBusy(true);
    setError(null);
    const { data, error: e } = await supabase.rpc("rotate_calendar_token");
    setBusy(false);
    if (e || !data) setError(tr("تعذّر تغيير الرابط — حاولوا مرة ثانية."));
    else setToken(data as string);
  };

  if (!isSupabaseConfigured) return null;

  const logoBtn =
    "flex flex-1 items-center justify-center gap-2.5 rounded-full border border-brand-500/35 bg-black/20 px-5 py-3 text-sm font-bold text-brand-950 transition hover:border-brand-500/70 hover:bg-brand-500/10";

  return (
    <Panel title={tr("اربطوا تقويمكم")}>
      <p className="text-sm leading-relaxed text-brand-950/65">{tr("اربطوا مرة وحدة، وبعدها أي موعد أو مهمة تضيفونها هنا تنزل بتقويم جوالكم لحالها، مع تنبيهات من جوالكم.")}</p>

      {httpsUrl && webcalUrl && googleUrl ? (
        <div className="mt-4 space-y-3">
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <a href={googleUrl} target="_blank" rel="noreferrer" className={logoBtn}>
              <LogoTile className="h-7 w-7"><GoogleLogo size={22} /></LogoTile>
              Google Calendar
            </a>
            <a href={webcalUrl} className={logoBtn}>
              <LogoTile className="h-7 w-7" delay={0.6}><AppleLogo size={22} /></LogoTile>
              Apple Calendar
            </a>
          </div>

          <div className="inline-flex gap-1 rounded-full border border-brand-500/30 bg-black/20 p-1 text-xs font-semibold">
            {(
              [
                ["team", tr("كل مواعيد الفريق")],
                ["mine", tr("مهامي ومواعيدي")],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setScope(id)}
                className={`rounded-full px-3.5 py-1.5 ${scope === id ? "bg-brand-500/25 text-amber-accent-400" : "text-brand-950/55 hover:text-brand-950"}`}
              >
                {label}
              </button>
            ))}
          </div>

          <p className="text-[11px] leading-relaxed text-brand-950/45">{tr("آبل تحدّثه كل ١٥ دقيقة تقريبًا. قوقل يحدّث التقويمات المشترك فيها بجدوله هو، وممكن يتأخر كم ساعة.")}</p>

          <details className="text-[11px] text-brand-950/50">
            <summary className="cursor-pointer font-semibold text-brand-950/60">{tr("خيارات أخرى")}</summary>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <button onClick={copy} className="inline-flex items-center gap-1.5 font-semibold text-amber-accent-400 hover:underline">
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? tr("تم النسخ") : tr("نسخ الرابط (لتطبيق ثاني)")}
              </button>
              <button onClick={rotate} disabled={busy} className="inline-flex items-center gap-1.5 font-semibold text-amber-accent-400 hover:underline disabled:opacity-50">
                <RefreshCw size={11} className={busy ? "animate-spin" : ""} />{tr("غيّروا الرابط (لو وصل لأحد)")}</button>
            </div>
            <p className="mt-2">{tr("الرابط سرّي وخاص بحسابكم — أي أحد عنده الرابط يقدر يشوف مواعيدكم ومهامكم.")}</p>
          </details>
        </div>
      ) : (
        !error && <p className="mt-3 text-xs text-brand-950/45">{tr("جاري تجهيز الرابط...")}</p>
      )}
      {error && <p className="mt-3 text-xs font-semibold text-rose-500">{error}</p>}
    </Panel>
  );
}
