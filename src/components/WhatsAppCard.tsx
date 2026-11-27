import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { WESY_WHATSAPP, maskPhone, waLinkUrl } from "../lib/whatsapp";
import { WhatsAppLogo } from "./ui/BrandLogos";
import { tr } from "../lib/i18n";

/** «ويسي على واتساب» بصفحة الفريق: كل عضو يربط رقمه بنفسه برسالة «ربط CODE» من جواله
    (يثبت إن الرقم رقمه بدون كود SMS)، وبعدها تجيه مهامه كل صباح ويرد «تم» / «أجّل».
    مخفية لين يكون فيه رقم (WESY_WHATSAPP) — الأنماط wsa-* نفس بطاقة التنبيهات. */

interface LinkRow {
  phone: string | null;
  linked_at: string | null;
  paused: boolean;
  morning_hour: number;
}

const HOURS = [6, 7, 8, 9, 10, 11];

export default function WhatsAppCard() {
  const { mode, currentUser } = useAuth();
  const [row, setRow] = useState<LinkRow | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  const load = useCallback(async () => {
    if (!supabase || !currentUser) return null;
    const { data } = await supabase
      .from("whatsapp_links")
      .select("phone, linked_at, paused, morning_hour")
      .eq("profile_id", currentUser.id)
      .maybeSingle();
    setRow((data as LinkRow | null) ?? null);
    setLoaded(true);
    return (data as LinkRow | null) ?? null;
  }, [currentUser]);

  useEffect(() => {
    void load();
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [load]);

  if (!WESY_WHATSAPP || mode !== "supabase" || !currentUser || !loaded) return null;
  const linked = !!row?.phone;

  const connect = async () => {
    if (!supabase) return;
    setErr(null);
    setBusy(true);
    const { data, error } = await supabase.rpc("whatsapp_link_code");
    setBusy(false);
    if (error || typeof data !== "string") {
      setErr(tr("ما قدرنا نجهّز الربط — جرّبوا بعد شوي."));
      return;
    }
    window.open(waLinkUrl(data), "_blank", "noopener,noreferrer");
    // نستنى رسالتهم توصل (لين ٣ دقايق) ونحدّث البطاقة لحالها
    setWaiting(true);
    let tries = 0;
    if (pollRef.current) window.clearInterval(pollRef.current);
    pollRef.current = window.setInterval(async () => {
      tries++;
      const r = await load();
      if (r?.phone || tries > 45) {
        if (pollRef.current) window.clearInterval(pollRef.current);
        setWaiting(false);
      }
    }, 4000);
  };

  const setPrefs = async (paused: boolean | null, hour: number | null) => {
    if (!supabase) return;
    setBusy(true);
    const { error } = await supabase.rpc("whatsapp_set_prefs", { p_paused: paused, p_hour: hour });
    setBusy(false);
    if (error) setErr(tr("ما انحفظ — جرّبوا مرة ثانية."));
    else void load();
  };

  const unlink = async () => {
    if (!supabase) return;
    setBusy(true);
    await supabase.rpc("whatsapp_unlink");
    setBusy(false);
    setRow(null);
  };

  return (
    <section className="wsa-card mt-4" aria-labelledby="wa-title">
      <div className="mb-3.5 flex items-center justify-between gap-3">
        <h2 id="wa-title" className="wsa-h m-0">
          {tr("ويسي على واتساب")}
        </h2>
        <span className="wsa-s">{tr("لك أنت بس")}</span>
      </div>

      <div className="flex items-start gap-3">
        <div className={`wsa-ic mail${linked && !row?.paused ? "" : " dim"}`}>
          <WhatsAppLogo size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="wsa-t">{linked ? tr("مربوط {0}", maskPhone(row?.phone)) : tr("مهامك كل صباح على واتساب")}</span>
            {linked && <span className={`wsa-chip ${row?.paused ? "off" : "on"}`}>{row?.paused ? tr("موقّف") : tr("● شغّال")}</span>}
          </div>
          <p className="wsa-s m-0 mt-0.5">
            {linked
              ? tr("ردّ «تم» تنقفل المهمة، «أجّل» تتأجل يوم، و«مهامي» تجيك القائمة — بدون ما تفتح الموقع.")
              : tr("ويسي يرسل لك مهامك الصبح، وترد «تم» أو «أجّل» من الواتساب نفسه. تضغط الزر، يفتح الواتساب برسالة جاهزة، ترسلها وخلاص.")}
          </p>
        </div>
        {!linked && (
          <button type="button" className="wsa-btn ghost" disabled={busy} onClick={connect}>
            {waiting ? tr("ننتظر رسالتك…") : tr("اربطوا")}
          </button>
        )}
      </div>

      {waiting && !linked && (
        <p className="wsa-s m-0 mt-2 ps-12">{tr("أرسل الرسالة اللي انفتحت بالواتساب («ربط …»)، والبطاقة تتحدّث لحالها.")}</p>
      )}

      {linked && row && (
        <>
          <div className="wsa-sep" />
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 ps-12">
            <label className="wsa-s flex items-center gap-2">
              {tr("وقت رسالة الصباح")}
              <select
                className="min-h-11 rounded-xl border border-white/15 bg-white/5 px-3 text-[14px] text-[#F6F1EC]"
                value={row.morning_hour}
                disabled={busy}
                onChange={(e) => void setPrefs(null, Number(e.target.value))}
              >
                {HOURS.map((h) => (
                  <option key={h} value={h} className="text-black">
                    {tr("{0} الصبح", h)}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="wsa-lnk" disabled={busy} onClick={() => void setPrefs(!row.paused, null)}>
              {row.paused ? tr("رجّع رسالة الصباح") : tr("وقّف رسالة الصباح")}
            </button>
            <button type="button" className="wsa-lnk" disabled={busy} onClick={unlink}>
              {tr("فك الربط")}
            </button>
          </div>
        </>
      )}

      {err && (
        <p className="m-0 mt-2 ps-12 text-[13px] text-[#FF8A7A]" role="alert">
          {err}
        </p>
      )}
    </section>
  );
}
