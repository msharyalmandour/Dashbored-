import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { Clock, Phone, PhoneOff } from "lucide-react";
import Wesy from "../brand/Wesy";
import { useMeetCall, type MeetCall } from "../../hooks/useMeetCall";
import { useTeamRoster } from "../../hooks/useTeamRoster";
import { tr } from "../../lib/i18n";

/** «ويسي يتصل»: شاشة مكالمة واردة لما الفريق يبدأ اجتماع — ادخل / بعد 5 دقايق / ما أقدر (والسبب يوصل للفريق وينكتب بالمحضر) */

const REASONS = [tr("عندي محاضرة"), tr("بالتدريب أو الدوام"), tr("ظرف طارئ"), tr("بالطريق")];
const LATER_MS = 5 * 60_000;
const SHOW_WINDOW_MS = 20 * 60_000;

/** نغمة قصيرة (3 مرات وتوقف) — بدون ملفات */
function ringOnce() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const t0 = ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      for (const [f, d] of [[880, 0], [660, 0.18]] as const) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.frequency.value = f;
        o.type = "sine";
        const s = t0 + i * 1.2 + d;
        g.gain.setValueAtTime(0, s);
        g.gain.linearRampToValueAtTime(0.12, s + 0.02);
        g.gain.linearRampToValueAtTime(0, s + 0.16);
        o.connect(g).connect(ctx.destination);
        o.start(s);
        o.stop(s + 0.18);
      }
    }
    setTimeout(() => void ctx.close().catch(() => {}), 4000);
  } catch {
    /* المتصفح منع الصوت — الشاشة تكفي */
  }
  try {
    navigator.vibrate?.([200, 120, 200, 600, 200, 120, 200]);
  } catch {
    /* ما فيه اهتزاز */
  }
}

export default function WesyCall() {
  const { call, incoming, dismissIncoming, answers, answer, me } = useMeetCall();
  const { roster } = useTeamRoster();
  const { pathname } = useLocation();
  const nav = useNavigate();
  const [show, setShow] = useState<MeetCall | null>(null);
  const [cant, setCant] = useState(false);
  const [reason, setReason] = useState("");
  const rangFor = useRef("");
  const onMeet = pathname.startsWith("/meet") || pathname.startsWith("/meeting-minutes/live");
  const mine = answers.find((a) => a.profileId === me);

  // مكالمة وصلت الحين، أو مكالمة قريبة ما رديت عليها (فتحت التطبيق بعدها)
  useEffect(() => {
    // معاينة للتطوير بس: ?demoCall=1
    if (import.meta.env.DEV && window.location.hash.includes("demoCall=1")) return setShow({ id: "demo", startedBy: null, source: "join", createdAt: new Date().toISOString() });
    if (onMeet) return setShow(null);
    const c = incoming ?? call;
    if (!c || c.startedBy === me) return;
    const age = Date.now() - Date.parse(c.createdAt);
    if (age > SHOW_WINDOW_MS) return;
    if (mine && mine.answer !== "later") return;
    if (mine?.answer === "later") {
      // «بعد 5 دقايق»: نرجع نتصل
      const wait = LATER_MS - (Date.now() - Date.parse(mine.updatedAt));
      if (wait > 0) {
        const t = setTimeout(() => setShow(c), wait);
        return () => clearTimeout(t);
      }
    }
    setShow(c);
  }, [incoming, call, mine, me, onMeet]);

  useEffect(() => {
    if (show && rangFor.current !== `${show.id}:${mine?.answer ?? ""}`) {
      rangFor.current = `${show.id}:${mine?.answer ?? ""}`;
      ringOnce();
    }
  }, [show, mine?.answer]);

  if (!show) return null;
  const starter = roster.find((m) => m.id === show.startedBy);
  const inside = answers.filter((a) => a.answer === "join").map((a) => roster.find((m) => m.id === a.profileId)?.name.split(/\s+/)[0]).filter(Boolean) as string[];
  const close = () => {
    setShow(null);
    setCant(false);
    dismissIncoming();
  };
  const join = async () => {
    await answer("join", "", show.id);
    close();
    nav(`/meet?call=${show.id}`);
  };
  const later = async () => {
    await answer("later", "", show.id);
    close();
  };
  const decline = async (r: string) => {
    await answer("cant", r.trim(), show.id);
    close();
  };

  return createPortal(
    <div className="wc-scrim" role="dialog" aria-modal="true" aria-labelledby="wc-h">
      <section className="wc-card">
        <div className="wc-face" aria-hidden>
          <Wesy head size={96} state="greet" />
        </div>
        <div className="wc-kicker">{tr("ويسي يتصل 📞")}</div>
        <h2 id="wc-h" className="wc-h">
          {show.source === "schedule" ? tr("جا وقت اجتماع الفريق") : starter ? (starter.gender === "female" ? tr("{0} بدأت اجتماع الفريق", starter.name.split(/\s+/)[0]) : tr("{0} بدأ اجتماع الفريق", starter.name.split(/\s+/)[0])) : tr("الفريق بدأ الاجتماع")}
        </h2>
        <p className="wc-sub">{inside.length ? tr("{0} داخلين وينتظرونك", inside.slice(0, 3).join(tr("، "))) : tr("ادخل، والباقين جايين")}</p>
        {!cant ? (
          <>
            <button type="button" className="wc-join" onClick={() => void join()}>
              <Phone size={20} aria-hidden />
              {tr("ادخل الاجتماع")}
            </button>
            <div className="wc-row">
              <button type="button" className="wc-ghost" onClick={() => void later()}>
                <Clock size={18} aria-hidden />
                {tr("بعد 5 دقايق")}
              </button>
              <button type="button" className="wc-ghost no" onClick={() => setCant(true)}>
                <PhoneOff size={18} aria-hidden />
                {tr("ما أقدر")}
              </button>
            </div>
          </>
        ) : (
          <div className="wc-why">
            <div className="wc-why-h">{tr("وش السبب؟ يوصل للفريق وينكتب بالمحضر كاعتذار")}</div>
            <div className="wc-chips">
              {REASONS.map((r) => (
                <button key={r} type="button" className="wc-chip" onClick={() => void decline(r)}>
                  {r}
                </button>
              ))}
            </div>
            <form
              className="wc-other"
              onSubmit={(e) => {
                e.preventDefault();
                void decline(reason);
              }}
            >
              <input value={reason} maxLength={120} onChange={(e) => setReason(e.target.value)} placeholder={tr("سبب ثاني (اختياري)")} aria-label={tr("سبب ثاني (اختياري)")} />
              <button type="submit" className="wc-ghost">
                {tr("أرسل")}
              </button>
            </form>
            <button type="button" className="wc-text" onClick={() => setCant(false)}>
              {tr("رجوع")}
            </button>
          </div>
        )}
      </section>
    </div>,
    document.body,
  );
}
