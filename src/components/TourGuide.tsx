import { useEffect, useState } from "react";
import { Volume2, VolumeX, X } from "lucide-react";
import Logo from "./Logo";
import GuideOrb from "./GuideOrb";
import { useTour } from "../context/TourContext";
import { guideIntro, guideName } from "../data/onboardingTour";
import { isNarrationAvailable, speak, stopSpeaking } from "../lib/speech";

const MUTED_KEY = "nursync.tourMuted";

/** مرشد يظهر بمنتصف الشاشة بحضور كبير أثناء الجولة التعريفية، بأسلوب
    "مساعد ذكاء اصطناعي" حديث (زجاجي داكن + توهج ضبابي حي بدل بطاقة عادية) —
    كل خطوة تنقل المستخدمة فعليًا للصفحة وتشرح لها وش فيها بصوت مسموع */
export default function TourGuide() {
  const { steps, activeIndex, next, prev, close } = useTour();
  const [muted, setMuted] = useState(() => localStorage.getItem(MUTED_KEY) === "1");

  useEffect(() => {
    if (activeIndex === null) {
      stopSpeaking();
      return;
    }
    if (muted) return;
    const step = steps[activeIndex];
    const intro = activeIndex === 0 ? `${guideIntro} ` : "";
    speak(`${intro}${step.title}. ${step.body}`);
    return () => stopSpeaking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, muted]);

  const toggleMute = () => {
    const willMute = !muted;
    setMuted(willMute);
    localStorage.setItem(MUTED_KEY, willMute ? "1" : "0");
    if (willMute) stopSpeaking();
  };

  if (activeIndex === null) return null;

  const step = steps[activeIndex];
  const isFirst = activeIndex === 0;
  const isLast = activeIndex === steps.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6 backdrop-blur-md print:hidden">
      <div className="relative w-full max-w-md animate-[panel-in_0.4s_ease-out] overflow-hidden rounded-[2rem] border border-white/10 bg-neutral-950/80 p-8 text-center shadow-2xl shadow-black/60 backdrop-blur-2xl">
        <button
          onClick={close}
          title="إنهاء الجولة"
          className="absolute end-4 top-4 rounded-lg p-1.5 text-white/35 hover:bg-white/10 hover:text-white/70"
        >
          <X size={18} />
        </button>

        <div className="relative mx-auto flex h-40 w-40 items-center justify-center">
          <GuideOrb size={190} />
          <span
            className="relative animate-[card-float_3.5s_ease-in-out_infinite]"
            style={{ "--tilt": "0deg" } as React.CSSProperties}
          >
            <Logo size={72} />
          </span>
        </div>

        <p className="mt-1 flex items-center justify-center gap-1.5 text-xs font-bold text-amber-300/90">
          <span className="text-white">{guideName}</span> · خطوة {activeIndex + 1} من{" "}
          {steps.length} — {step.label}
        </p>
        <p className="mt-3 font-display text-2xl font-bold text-white">{step.title}</p>
        <p className="mx-auto mt-2 max-w-sm text-base leading-relaxed text-white/55">
          {step.body}
        </p>

        {isNarrationAvailable() && (
          <button
            onClick={toggleMute}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold text-white/40 hover:bg-white/10 hover:text-white/70"
          >
            {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            {muted ? "تشغيل الصوت" : "كتم الصوت"}
          </button>
        )}

        <div className="mt-5 flex items-center justify-center gap-1.5">
          {steps.map((s, i) => (
            <span
              key={s.id}
              className={`h-1.5 w-1.5 rounded-full ${i === activeIndex ? "bg-amber-400" : "bg-white/15"}`}
            />
          ))}
        </div>

        <div className="mt-5 flex items-center justify-center gap-2">
          {!isFirst && (
            <button
              onClick={prev}
              className="rounded-xl px-4 py-2 text-sm font-bold text-white/45 hover:bg-white/10"
            >
              السابق
            </button>
          )}
          <button
            onClick={next}
            className="rounded-xl bg-amber-400 px-6 py-2 text-sm font-bold text-neutral-950 shadow-sm shadow-amber-400/20 transition-all duration-300 hover:scale-[1.03] hover:bg-amber-300 hover:shadow-[0_0_24px_rgba(251,191,36,0.4)]"
          >
            {isLast ? "خلصنا! 🎉" : "التالي"}
          </button>
        </div>
      </div>
    </div>
  );
}
