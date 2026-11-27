import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { Volume2, VolumeX, X } from "lucide-react";
import { useTour } from "../context/TourContext";
import { guideIntro, guideName } from "../data/onboardingTour";
import { isNarrationAvailable, speak, stopSpeaking } from "../lib/speech";
import { WesyFigure } from "./brand/Wesy";
import { isEn, tr } from "../lib/i18n";

/* جولة ويسي (اختيارية): ويسي يمشي معكم قسم قسم. ينقلكم للصفحة، ويضوّي بند القسم بالقائمة، ويقول جملة وحدة بسيطة.
   ما يغطي الشاشة كلها: البند المضاء واضح وكل شي ثاني معتّم شوي. بالجوال (القائمة مخفية) تطلع بطاقة تحت.
   الحركة قصيرة (أقل من ٤٠٠ جزء من الثانية) وتطفى مع «تقليل الحركة». Esc يقفل، والأسهم تمشي. */

const MUTED_KEY = "nursync.tourMuted";
const CARD_W = 320;
const GAP = 18;

type Box = { top: number; left: number; width: number; height: number };

/** مكان بند القسم بالقائمة لو ظاهر (الكمبيوتر)، وإلا null (الجوال) */
function navBox(nav: string): Box | null {
  const el = document.querySelector<HTMLElement>(`[data-nav-id="${nav}"]`);
  if (!el || el.offsetParent === null) return null;
  const r = el.getBoundingClientRect();
  // القائمة الجانبية بالجوال درج مخفي برا الشاشة: نعتبره مو ظاهر
  if (r.width === 0 || r.height === 0 || r.right <= 0 || r.left >= window.innerWidth || r.bottom <= 0 || r.top >= window.innerHeight) return null;
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

export default function TourGuide() {
  const { steps, activeIndex, next, prev, close } = useTour();
  const [muted, setMuted] = useState(() => localStorage.getItem(MUTED_KEY) !== "0");
  const [box, setBox] = useState<Box | null>(null);
  const step = activeIndex === null ? null : steps[activeIndex];

  const measure = useCallback(() => setBox(step ? navBox(step.nav) : null), [step]);

  // نقيس بعد ما تنتقل الصفحة (القائمة ممكن تتغيّر)، ومع تغيّر حجم الشاشة
  useLayoutEffect(() => {
    if (!step) return;
    measure();
    const t = window.setTimeout(measure, 120);
    window.addEventListener("resize", measure);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("resize", measure);
    };
  }, [step, measure]);

  useEffect(() => {
    if (!step) return stopSpeaking();
    if (muted || !isNarrationAvailable()) return;
    speak(`${activeIndex === 0 ? `${guideIntro} ` : ""}${step.title}. ${step.body}`);
    return () => stopSpeaking();
  }, [step, activeIndex, muted]);

  useEffect(() => {
    if (!step) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === (isEn ? "ArrowRight" : "ArrowLeft")) next();
      else if (e.key === (isEn ? "ArrowLeft" : "ArrowRight")) prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, next, prev, close]);

  if (!step || activeIndex === null) return null;

  const isFirst = activeIndex === 0;
  const isLast = activeIndex === steps.length - 1;
  const toggleMute = () => {
    const m = !muted;
    setMuted(m);
    localStorage.setItem(MUTED_KEY, m ? "1" : "0");
    if (m) stopSpeaking();
  };

  // البطاقة جنب البند: بالعربي القائمة يمين → البطاقة يسارها، وبالإنجليزي العكس
  const cardStyle = box
    ? {
        top: Math.min(Math.max(box.top + box.height / 2 - 110, 16), window.innerHeight - 260),
        left: isEn ? Math.min(box.left + box.width + GAP, window.innerWidth - CARD_W - 16) : Math.max(box.left - CARD_W - GAP, 16),
        width: CARD_W,
      }
    : undefined;

  return (
    <div className="wt-tour print:hidden" role="dialog" aria-modal="true" aria-label={tr("جولة ويسي")}>
      {box ? (
        <div className="wt-spot" style={{ top: box.top - 6, left: box.left - 6, width: box.width + 12, height: box.height + 12 }} aria-hidden />
      ) : (
        <div className="wt-dim" aria-hidden onClick={close} />
      )}

      <div className={box ? "wt-card" : "wt-card wt-card-sheet"} style={cardStyle}>
        <div className="wt-card-top">
          <span className="wt-step">
            {guideName} · {tr("{0} من {1}", String(activeIndex + 1), String(steps.length))}
          </span>
          <span className="flex items-center gap-0.5">
            {isNarrationAvailable() && (
              <button type="button" className="wt-icon" onClick={toggleMute} aria-label={muted ? tr("تشغيل الصوت") : tr("كتم الصوت")}>
                {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
              </button>
            )}
            <button type="button" className="wt-icon" onClick={close} aria-label={tr("إنهاء الجولة")}>
              <X size={16} />
            </button>
          </span>
        </div>

        <div className="wt-body">
          {/* ويسي يمشي (هزة خفيفة) كل ما تنتقلون لقسم، ويسلّم بأول خطوة */}
          <div key={step.id} className={isFirst ? "wt-wesy" : "wt-wesy is-walking"} aria-hidden>
            <WesyFigure playKey={isFirst ? step.id : undefined} />
          </div>
          <div key={`${step.id}-t`} className="wt-text">
            {isFirst && <p className="wt-intro">{guideIntro}</p>}
            <p className="wt-title">{step.title}</p>
            <p className="wt-line">{step.body}</p>
          </div>
        </div>

        <div className="wt-foot">
          <span className="wt-dots" aria-hidden>
            {steps.map((s, i) => (
              <i key={s.id} className={i === activeIndex ? "on" : i < activeIndex ? "done" : ""} />
            ))}
          </span>
          <span className="flex items-center gap-1.5">
            {!isFirst && (
              <button type="button" className="wt-back" onClick={prev}>
                {tr("السابق")}
              </button>
            )}
            <button type="button" className="ws-btn-primary wt-next" onClick={next} autoFocus>
              {isLast ? tr("تمام، فهمت") : tr("التالي")}
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}
