import { GmailLogo } from "./ui/BrandLogos";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { usePush, type PushState } from "../hooks/usePush";
import { useEmailReminders } from "../hooks/useEmailReminders";
import { tr } from "../lib/i18n";

/** بطاقة «التنبيهات» بصفحة الفريق: صف إشعارات الجوال (Web Push لهذا الجهاز) وصف تذكيرات الإيميل
    (profiles.email_reminders). التصميم من لوحة «بطاقة التنبيهات — جوال + إيميل»؛ الأنماط بـ index.css (wsa-*).
    بالوضع التجريبي البطاقة تشتغل ببيانات تجريبية، مع شريط حالات للمعاينة. */

type Msg = { kind: "ok" | "err"; text: string };

const PUSH_DESC = () => tr("يوصلك تذكير الصبح بمهامك اللي قربت أو تأخرت، حتى لو الموقع مقفول.");

const BellIcon = ({ off = false, size = 18 }: { off?: boolean; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10 21a2 2 0 0 0 4 0" />
    {off && <path d="M3 3l18 18" />}
  </svg>
);
const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12.5l4.5 4.5L19 7" />
  </svg>
);
const AlertIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5v5.5M12 16.5v.01" />
  </svg>
);
const ShareIcon = ({ size = 13 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3v12" />
    <path d="M8 7l4-4 4 4" />
    <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
  </svg>
);
const AddHomeIcon = ({ size = 13, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="4" y="4" width="16" height="16" rx="4" />
    <path d="M12 8v8M8 12h8" />
  </svg>
);
const GmailIcon = () => <GmailLogo size={22} />;

function MessageLine({ msg }: { msg: Msg }) {
  return (
    <div className={`wsa-msg ${msg.kind}`} role={msg.kind === "err" ? "alert" : "status"}>
      {msg.kind === "ok" ? (
        <span className="wsa-pop">
          <CheckIcon />
        </span>
      ) : (
        <AlertIcon />
      )}
      <span>{msg.text}</span>
    </div>
  );
}

function StatusChip({ kind }: { kind: "on" | "off" | "bad" }) {
  return <span className={`wsa-chip ${kind}`}>{kind === "on" ? tr("● شغّالة") : kind === "bad" ? tr("محظورة") : tr("مطفية")}</span>;
}

function Spinner({ light = false }: { light?: boolean }) {
  return <span className={`wsa-spin${light ? " light" : ""}`} aria-hidden="true" />;
}

/** كرة Wesync تتنفس + ٣ نقاط تنط — لما التفعيل ياخذ أكثر من ثانية */
function Preparing() {
  return (
    <div className="mt-2.5 flex items-center gap-2.5 ps-12 text-[13px]" role="status">
      <span className="wsa-orb h-5 w-5 shrink-0" aria-hidden="true" />
      <span>{tr("نجهّز تنبيهاتك")}</span>
      <span className="wsa-dots inline-flex gap-1" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
    </div>
  );
}

/** لودينق Wesync الكبير: كرة تتنفس + حلقة ذهبية + نقطة تدور */
function BigLoader() {
  return (
    <div className="flex flex-col items-center gap-3 py-6" role="status" aria-label={tr("نجهّز تنبيهاتك")}>
      <div className="relative flex h-[72px] w-[72px] items-center justify-center">
        <div className="wsa-loader-ring" />
        <div className="wsa-orb h-10 w-10" />
        <div className="wsa-loader-orbit">
          <i />
        </div>
      </div>
      <span className="wsa-s">{tr("نجهّز تنبيهاتك")}</span>
    </div>
  );
}

function SkeletonRows() {
  const row = (w1: string, w2: string, btn: string) => (
    <div className="flex items-center gap-3">
      <div className="wsa-skel h-9 w-9 shrink-0 rounded-[11px]" />
      <div className="grid flex-1 gap-[7px]">
        <div className="wsa-skel h-3" style={{ width: w1 }} />
        <div className="wsa-skel h-2.5" style={{ width: w2 }} />
      </div>
      <div className={`wsa-skel shrink-0 rounded-full ${btn}`} />
    </div>
  );
  return (
    <div className="grid gap-4" aria-busy="true" aria-label={tr("نجهّز تنبيهاتك")}>
      {row("55%", "85%", "h-9 w-[70px]")}
      {row("45%", "75%", "h-[30px] w-14")}
    </div>
  );
}

/** نافذة «وريني الخطوات بالصور» — ٣ لقطات آيفون من التصميم */
function IosStepsModal({ onClose }: { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const Phone = ({ children, caption }: { children: ReactNode; caption: string }) => (
    <figure className="m-0 flex flex-col items-center gap-2.5">
      <div className="wsa-phone" aria-hidden="true">
        <div className="notch" />
        {children}
      </div>
      <figcaption className="wsa-s text-center font-bold" style={{ color: "#F6F1EC" }}>
        {caption}
      </figcaption>
    </figure>
  );

  return createPortal(
    <div className="wsa-modal-bg" onClick={onClose}>
      <div className="wsa-modal" role="dialog" aria-modal="true" aria-labelledby="wsa-ios-title" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id="wsa-ios-title" className="wsa-h m-0">
            {tr("فعّلوا الإشعارات بالآيفون")}
          </h2>
          <button ref={closeRef} type="button" className="wsa-x" onClick={onClose} aria-label={tr("إغلاق")}>
            <X size={18} />
          </button>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 sm:justify-center">
          <Phone caption={tr("١ اضغطوا زر المشاركة")}>
            <div className="wsa-s absolute inset-x-4 top-14 text-center" dir="ltr">
              wesyncapp.com
            </div>
            <div className="absolute inset-x-0 bottom-0 flex h-12 items-center justify-around" style={{ background: "rgba(30,30,32,.9)", color: "#8F857C" }}>
              <span className="text-lg">‹</span>
              <span className="flex h-10 w-10 items-center justify-center rounded-full" style={{ border: "2px solid #FF8A24", color: "#FF8A24", boxShadow: "0 0 0 6px rgba(255,138,36,.2)" }}>
                <ShareIcon size={20} />
              </span>
              <span className="h-4 w-4 rounded-[3px] border-2" style={{ borderColor: "#8F857C" }} />
            </div>
          </Phone>
          <Phone caption={tr("٢ «إضافة إلى الشاشة الرئيسية»")}>
            <div className="absolute inset-x-0 bottom-0 rounded-t-[18px] p-3" style={{ background: "rgba(36,34,34,.97)" }}>
              <div className="border-b px-1.5 py-2 text-xs" style={{ borderColor: "rgba(255,255,255,.08)", color: "#ccc" }}>
                {tr("نسخ")}
              </div>
              <div className="flex items-center justify-between rounded-[10px] px-2 py-2 text-xs font-bold" style={{ background: "rgba(255,138,36,.16)", border: "1px solid #FF8A24", color: "#fff" }}>
                <span>{tr("إضافة إلى الشاشة الرئيسية")}</span>
                <AddHomeIcon size={16} color="#FF8A24" />
              </div>
              <div className="px-1.5 py-2 text-xs" style={{ color: "#ccc" }}>
                {tr("إضافة إلى المفضلة")}
              </div>
            </div>
          </Phone>
          <Phone caption={tr("٣ افتحوه من الأيقونة وفعّلوا")}>
            <div className="absolute inset-x-0 top-14 grid grid-cols-4 gap-x-1 gap-y-2.5 px-2">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="mx-auto h-8 w-8 rounded-[9px]" style={{ background: "rgba(255,255,255,.1)" }} />
              ))}
              <div className="text-center">
                <div className="mx-auto h-8 w-8 rounded-[9px]" style={{ background: "radial-gradient(circle at 50% 60%,#FFF0C2 0,#FFC85A 22%,#FF7A10 55%,#C2400A 82%,#5A1A04 100%)", boxShadow: "0 0 0 3px #FF8A24,0 0 20px rgba(255,138,36,.7)" }} />
                <div className="mt-1 text-[9px]">Wesync</div>
              </div>
            </div>
          </Phone>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** بالوضع التجريبي: نفس الحالات بدون متصفح حقيقي، عشان نشوف البطاقة كاملة */
function useDemoPush() {
  const [state, setState] = useState<PushState>("off");
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
  return {
    state,
    setState,
    ready: true,
    enable: async () => {
      setState("busy");
      await wait(1400);
      setState("on");
      return null;
    },
    disable: async () => {
      setState("busy");
      await wait(500);
      setState("off");
    },
    sendTest: async () => {
      await wait(600);
      return 1;
    },
  };
}

const DEMO_STATES: PushState[] = ["off", "on", "busy", "denied", "ios-install", "unsupported"];

export default function AlertsCard() {
  const { currentUser, mode } = useAuth();
  const live = mode === "supabase";
  const realPush = usePush(live ? currentUser?.id : undefined);
  const demoPush = useDemoPush();
  const push = live ? realPush : demoPush;
  const email = useEmailReminders(currentUser?.id, live);

  const [pushMsg, setPushMsg] = useState<Msg | null>(null);
  const [emailMsg, setEmailMsg] = useState<Msg | null>(null);
  const [testing, setTesting] = useState(false);
  const [enabling, setEnabling] = useState(false);
  const [slow, setSlow] = useState(false);
  const [justOn, setJustOn] = useState(false);
  const [preview, setPreview] = useState(false);
  const [stepsOpen, setStepsOpen] = useState(false);
  const [slowLoad, setSlowLoad] = useState(false);

  const loading = !push.ready || email.loading;
  const state = push.state;

  // التفعيل أخذ أكثر من ثانية → «نجهّز تنبيهاتك»
  useEffect(() => {
    if (!enabling) {
      setSlow(false);
      return;
    }
    const t = setTimeout(() => setSlow(true), 1000);
    return () => clearTimeout(t);
  }, [enabling]);

  // التحميل الأول تأخر → لودينق Wesync الكبير بدل الـ skeleton
  useEffect(() => {
    if (!loading) {
      setSlowLoad(false);
      return;
    }
    const t = setTimeout(() => setSlowLoad(true), 1200);
    return () => clearTimeout(t);
  }, [loading]);

  // رسالة إطفاء الإيميل تختفي بعد ٣ ثواني
  useEffect(() => {
    if (emailMsg?.kind !== "ok") return;
    const t = setTimeout(() => setEmailMsg(null), 3000);
    return () => clearTimeout(t);
  }, [emailMsg]);

  useEffect(() => {
    if (!justOn) return;
    const t = setTimeout(() => setJustOn(false), 1600);
    return () => clearTimeout(t);
  }, [justOn]);

  useEffect(() => {
    if (!preview) return;
    const t = setTimeout(() => setPreview(false), 3500);
    return () => clearTimeout(t);
  }, [preview]);

  const turnOn = async () => {
    setPushMsg(null);
    setEnabling(true);
    const err = await push.enable();
    setEnabling(false);
    if (err) setPushMsg({ kind: "err", text: tr("ما قدرنا نفعّل الإشعارات — حاولوا مرة ثانية.") });
    else setJustOn(true);
  };
  const turnOff = async () => {
    setPushMsg(null);
    await push.disable();
  };
  const test = async () => {
    setPushMsg(null);
    setTesting(true);
    const n = await push.sendTest();
    setTesting(false);
    if (n > 0) {
      setPushMsg({ kind: "ok", text: tr("أرسلنا إشعار تجريبي — يوصل خلال ثواني.") });
      setPreview(true);
    } else setPushMsg({ kind: "err", text: tr("ما وصل شي. جرّبوا تطفون الإشعارات وتفعّلونها من جديد.") });
  };
  const toggleEmail = async () => {
    const next = !email.value;
    setEmailMsg(null);
    const ok = await email.update(next);
    if (!ok) setEmailMsg({ kind: "err", text: tr("ما انحفظ التغيير، جرّب مرة ثانية.") });
    else if (!next) setEmailMsg({ kind: "ok", text: tr("انطفت تذكيرات الإيميل. تقدر ترجّعها بأي وقت.") });
  };

  const pushIconOn = state === "on";
  const pushChip: "on" | "off" | "bad" = state === "on" ? "on" : state === "denied" ? "bad" : "off";
  const pushText =
    state === "denied"
      ? tr("الإشعارات محظورة لهذا الموقع. فعّلوها من إعدادات المتصفح ثم ارجعوا هنا.")
      : state === "ios-install"
        ? tr("في الآيفون لازم تضيفون الموقع للشاشة الرئيسية أول.")
        : PUSH_DESC();
  const emailAddr = currentUser?.email || (live ? "" : "name@stu.kau.edu.sa");

  return (
    <section className="wsa-card" aria-labelledby="wsa-title">
      {preview && (
        <div className="pointer-events-none absolute inset-x-3 top-3 z-10">
          <div className="wsa-drop flex items-start gap-2 rounded-2xl px-3 py-2.5 shadow-2xl" style={{ background: "rgba(40,36,34,.96)", backdropFilter: "blur(12px)" }} aria-hidden="true">
            <span className="h-[26px] w-[26px] shrink-0 rounded-[7px]" style={{ background: "radial-gradient(circle at 50% 60%,#FFF0C2 0,#FFC85A 22%,#FF7A10 55%,#C2400A 82%,#5A1A04 100%)" }} />
            <span className="text-xs leading-relaxed">
              <span className="flex justify-between gap-3">
                <b>Wesync</b>
                <span style={{ opacity: 0.6 }}>{tr("الحين")}</span>
              </span>
              {tr("الإشعارات شغّالة ✓ بتوصلك تذكيرات مهامك هنا.")}
            </span>
          </div>
        </div>
      )}

      <div className="mb-3.5 flex items-center justify-between gap-3">
        <h2 id="wsa-title" className="wsa-h m-0">
          {tr("التنبيهات")}
        </h2>
        <span className="wsa-s">{tr("لك أنت بس")}</span>
      </div>

      {loading ? (
        slowLoad ? (
          <BigLoader />
        ) : (
          <SkeletonRows />
        )
      ) : (
        <>
          {state !== "unsupported" && (
            <>
              <div>
                <div className="flex items-start gap-3">
                  <div className={`wsa-ic${pushIconOn ? "" : " off"}${justOn ? " wsa-ring" : ""}`}>
                    <BellIcon off={!pushIconOn} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="wsa-t">{tr("إشعارات الجوال")}</span>
                      <StatusChip kind={pushChip} />
                    </div>
                    <p className="wsa-s m-0 mt-0.5">{pushText}</p>
                  </div>
                  {(state === "off" || state === "on" || state === "busy") && (
                    <button type="button" className={`wsa-btn${state === "on" ? " ghost" : ""}`} disabled={state === "busy"} onClick={state === "on" ? turnOff : turnOn}>
                      {state === "busy" ? (
                        <>
                          <Spinner />
                          {tr("لحظة")}
                        </>
                      ) : state === "on" ? (
                        tr("إيقاف")
                      ) : (
                        tr("فعّل")
                      )}
                    </button>
                  )}
                </div>

                {state === "busy" && enabling && slow && <Preparing />}

                {state === "on" && (
                  <div className="ps-12">
                    <button type="button" className="wsa-lnk" onClick={test} disabled={testing}>
                      {testing && <Spinner light />}
                      {testing ? tr("لحظة") : tr("أرسل إشعار تجريبي")}
                    </button>
                  </div>
                )}

                {state === "ios-install" && (
                  <>
                    <div className="mt-3 flex flex-wrap gap-2 ps-12">
                      <span className="wsa-chip off step">{tr("١ افتحوه بسفاري")}</span>
                      <span className="wsa-chip off step">
                        {tr("٢")} <ShareIcon /> {tr("مشاركة")}
                      </span>
                      <span className="wsa-chip off step">
                        {tr("٣")} <AddHomeIcon /> {tr("الشاشة الرئيسية")}
                      </span>
                    </div>
                    <div className="ps-12">
                      <button type="button" className="wsa-lnk" onClick={() => setStepsOpen(true)}>
                        {tr("وريني الخطوات بالصور")}
                      </button>
                    </div>
                  </>
                )}

                {pushMsg && <MessageLine msg={pushMsg} />}
              </div>
              <div className="wsa-sep" />
            </>
          )}

          <div>
            <div className="flex items-start gap-3">
              <div className={`wsa-ic mail${email.value ? "" : " dim"}`}>
                <GmailIcon />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="wsa-t" id="wsa-email-title">
                    {tr("تذكيرات الإيميل")}
                  </span>
                  <StatusChip kind={email.value ? "on" : "off"} />
                </div>
                <p className="wsa-s m-0 mt-0.5">{email.value ? tr("يوصلك إيميل بمهامك المتأخرة، وتقرير الفريق كل أسبوع.") : tr("ما راح يوصلك أي إيميل تذكير ولا تقرير أسبوعي.")}</p>
                {emailAddr && (
                  <p className="wsa-s m-0 mt-1.5 truncate" dir="ltr" style={{ color: "#CFC6BE", textAlign: "end" }}>
                    {emailAddr}
                  </p>
                )}
              </div>
              <button type="button" role="switch" aria-checked={email.value} aria-labelledby="wsa-email-title" className="wsa-sw-btn" onClick={toggleEmail} disabled={email.saving}>
                <span className={`wsa-sw${email.value ? " on" : ""}`}>
                  <i />
                </span>
                <span className={`wsa-sw-label${email.value ? " on" : ""}`}>{email.value ? tr("شغّال") : tr("مطفي")}</span>
              </button>
            </div>
            {emailMsg && <MessageLine msg={emailMsg} />}
          </div>
        </>
      )}

      {!live && (
        <div className="mt-4 border-t pt-3" style={{ borderColor: "rgba(255,255,255,.08)" }}>
          <p className="wsa-s m-0 mb-2">{tr("معاينة (الوضع التجريبي): جرّبوا حالات إشعارات الجوال")}</p>
          <div className="flex flex-wrap gap-1.5">
            {DEMO_STATES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setPushMsg(null);
                  demoPush.setState(s);
                }}
                className={`wsa-chip ${state === s ? "on" : "off"}`}
                style={{ minHeight: 44, border: 0, cursor: "pointer", fontFamily: "inherit" }}
                dir="ltr"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {stepsOpen && <IosStepsModal onClose={() => setStepsOpen(false)} />}
    </section>
  );
}
