import { lazy, Suspense, useEffect, useState } from "react";
import { Volume2, VolumeX, X } from "lucide-react";
import { useTour } from "../context/TourContext";
import { guideIntro, guideName } from "../data/onboardingTour";
import { isNarrationAvailable, onSpeakingChange, speak, stopSpeaking } from "../lib/speech";

const MUTED_KEY = "nursync.tourMuted";

// كسل التحميل — مشهد Three.js ثقيل (~950 كيلوبايت)، ونادر إنه يُفتح أصلاً
// (بس وقت الجولة التعريفية)، فما نبي يدخل الحزمة الرئيسية اللي تحمّل بكل صفحة
const VoiceLogoScene = lazy(() => import("./cinematic/VoiceLogoScene"));

/** الجولة التعريفية — الشعار وحده هو العنصر البصري بمنتصف الشاشة، حي
    ويتفاعل مع صوت المرشد الحقيقي (نبض، توهج، موجات تنطلق منه). بدون بطاقة
    أو صندوق حوله — النص والتنقل عناصر خفيفة عائمة أسفل الشاشة بس */
export default function TourGuide() {
  const { steps, activeIndex, next, prev, close } = useTour();
  const [muted, setMuted] = useState(() => localStorage.getItem(MUTED_KEY) === "1");
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => onSpeakingChange(setSpeaking), []);

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
    <div className="fixed inset-0 z-50 overflow-hidden bg-neutral-950/[0.97] backdrop-blur-md print:hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_42%,rgba(251,191,36,0.07),transparent_70%)]" />

      <Suspense fallback={null}>
        <VoiceLogoScene speaking={speaking} />
      </Suspense>

      <button
        onClick={close}
        title="إنهاء الجولة"
        className="absolute end-5 top-5 z-10 rounded-lg p-1.5 text-white/35 hover:bg-white/10 hover:text-white/70"
      >
        <X size={18} />
      </button>

      <div className="absolute inset-x-0 bottom-0 z-10 flex animate-[hero-in_0.9s_ease-out] flex-col items-center gap-4 px-6 pb-10 text-center">
        <div className="max-w-sm">
          <p className="text-xs font-bold text-amber-300/85">
            <span className="text-white/90">{guideName}</span> · خطوة {activeIndex + 1} من{" "}
            {steps.length} — {step.label}
          </p>
          <p className="mt-2 font-display text-xl font-bold text-white">{step.title}</p>
          <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-white/45">
            {step.body}
          </p>
          <img
            key={step.id}
            src={step.image}
            alt={step.title}
            className="mx-auto mt-3 h-24 w-44 animate-[panel-in_0.4s_ease-out] rounded-xl border border-amber-400/25 object-cover object-top shadow-lg shadow-black/50 sm:h-28 sm:w-52"
          />
        </div>

        {isNarrationAvailable() && (
          <button
            onClick={toggleMute}
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1 text-xs font-bold text-white/35 hover:bg-white/10 hover:text-white/65"
          >
            {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            {muted ? "تشغيل الصوت" : "كتم الصوت"}
          </button>
        )}

        <div className="flex items-center gap-1.5">
          {steps.map((s, i) => (
            <span
              key={s.id}
              className={`h-1.5 w-1.5 rounded-full ${i === activeIndex ? "bg-amber-400" : "bg-white/15"}`}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          {!isFirst && (
            <button
              onClick={prev}
              className="rounded-xl px-4 py-2 text-sm font-bold text-white/40 hover:bg-white/10"
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
