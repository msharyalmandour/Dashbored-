import { useEffect, useState } from "react";
import { Check, Copy, RefreshCw } from "lucide-react";
import { Panel } from "./ui/page";
import { useAuth } from "../context/AuthContext";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";

type Scope = "mine" | "team";

function GoogleLogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function AppleLogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
    </svg>
  );
}

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
    if (!window.confirm("تغيير الرابط يوقف الاشتراك القديم بكل أجهزتكم — لازم تربطون من جديد. نكمل؟")) return;
    setBusy(true);
    setError(null);
    const { data, error: e } = await supabase.rpc("rotate_calendar_token");
    setBusy(false);
    if (e || !data) setError("تعذّر تغيير الرابط — حاولوا مرة ثانية.");
    else setToken(data as string);
  };

  if (!isSupabaseConfigured) return null;

  const logoBtn =
    "flex flex-1 items-center justify-center gap-2.5 rounded-full border border-brand-500/35 bg-black/20 px-5 py-3 text-sm font-bold text-brand-950 transition hover:border-brand-500/70 hover:bg-brand-500/10";

  return (
    <Panel title="اربطوا تقويمكم">
      <p className="text-sm leading-relaxed text-brand-950/65">
        اربطوا مرة وحدة، وبعدها أي موعد أو مهمة تضيفونها هنا تنزل بتقويم جوالكم لحالها، مع تنبيهات من جوالكم.
      </p>

      {httpsUrl && webcalUrl && googleUrl ? (
        <div className="mt-4 space-y-3">
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <a href={googleUrl} target="_blank" rel="noreferrer" className={logoBtn}>
              <GoogleLogo />
              Google Calendar
            </a>
            <a href={webcalUrl} className={logoBtn}>
              <AppleLogo />
              Apple Calendar
            </a>
          </div>

          <div className="inline-flex gap-1 rounded-full border border-brand-500/30 bg-black/20 p-1 text-xs font-semibold">
            {(
              [
                ["team", "كل مواعيد الفريق"],
                ["mine", "مهامي ومواعيدي"],
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

          <p className="text-[11px] leading-relaxed text-brand-950/45">
            آبل تحدّثه كل ١٥ دقيقة تقريبًا. قوقل يحدّث التقويمات المشترك فيها بجدوله هو، وممكن يتأخر كم ساعة.
          </p>

          <details className="text-[11px] text-brand-950/50">
            <summary className="cursor-pointer font-semibold text-brand-950/60">خيارات أخرى</summary>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <button onClick={copy} className="inline-flex items-center gap-1.5 font-semibold text-amber-accent-400 hover:underline">
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? "تم النسخ" : "نسخ الرابط (لتطبيق ثاني)"}
              </button>
              <button onClick={rotate} disabled={busy} className="inline-flex items-center gap-1.5 font-semibold text-amber-accent-400 hover:underline disabled:opacity-50">
                <RefreshCw size={11} className={busy ? "animate-spin" : ""} />
                غيّروا الرابط (لو وصل لأحد)
              </button>
            </div>
            <p className="mt-2">الرابط سرّي وخاص بحسابكم — أي أحد عنده الرابط يقدر يشوف مواعيدكم ومهامكم.</p>
          </details>
        </div>
      ) : (
        !error && <p className="mt-3 text-xs text-brand-950/45">جاري تجهيز الرابط...</p>
      )}
      {error && <p className="mt-3 text-xs font-semibold text-rose-500">{error}</p>}
    </Panel>
  );
}
