import { useEffect, useState } from "react";
import { Volume2, VolumeX, X } from "lucide-react";
import Logo from "./Logo";
import VoiceWaveform from "./VoiceWaveform";
import { useTour } from "../context/TourContext";
import { guideIntro, guideName } from "../data/onboardingTour";
import { isNarrationAvailable, onSpeakingChange, speak, stopSpeaking } from "../lib/speech";

const MUTED_KEY = "nursync.tourMuted";

/** مرشدة تظهر بمنتصف الشاشة بحضور كبير وواضح أثناء الجولة التعريفية — كل
    خطوة تنقلها فعليًا للصفحة وتشرح لها وش فيها بصوت مسموع، مع توهج
    وموجات صوت تتفاعل مع كلامها الفعلي */
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-950/50 p-6 backdrop-blur-sm print:hidden">
      <div className="relative w-full max-w-md animate-[panel-in_0.4s_ease-out] rounded-[2rem] border border-brand-100 bg-paper p-8 text-center shadow-2xl shadow-brand-950/40">
        <button
          onClick={close}
          title="إنهاء الجولة"
          className="absolute end-4 top-4 rounded-lg p-1.5 text-brand-950/30 hover:bg-surface-muted hover:text-brand-950/60"
        >
          <X size={18} />
        </button>

        <div className="relative mx-auto flex h-28 w-28 items-center justify-center">
          <span
            className={`absolute inset-0 rounded-full transition-transform duration-300 ${
              speaking ? "animate-[speaker-glow-lg_1.4s_ease-in-out_infinite]" : ""
            }`}
          />
          <span
            className="animate-[card-float_3.5s_ease-in-out_infinite]"
            style={{ "--tilt": "0deg" } as React.CSSProperties}
          >
            <Logo size={92} />
          </span>
        </div>

        <div className="mt-3 flex h-6 items-center justify-center">
          {speaking && <VoiceWaveform size="lg" />}
        </div>

        <p className="mt-2 flex items-center justify-center gap-1.5 text-xs font-bold text-brand-600">
          <span className="text-brand-950">{guideName}</span> · خطوة {activeIndex + 1} من{" "}
          {steps.length} — {step.label}
        </p>
        <p className="mt-3 font-display text-2xl font-bold text-brand-950">{step.title}</p>
        <p className="mx-auto mt-2 max-w-sm text-base leading-relaxed text-brand-950/65">
          {step.body}
        </p>

        {isNarrationAvailable() && (
          <button
            onClick={toggleMute}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold text-brand-950/45 hover:bg-surface-muted hover:text-brand-950/70"
          >
            {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            {muted ? "تشغيل الصوت" : "كتم الصوت"}
          </button>
        )}

        <div className="mt-5 flex items-center justify-center gap-1.5">
          {steps.map((s, i) => (
            <span
              key={s.id}
              className={`h-1.5 w-1.5 rounded-full ${i === activeIndex ? "bg-brand-500" : "bg-brand-100"}`}
            />
          ))}
        </div>

        <div className="mt-5 flex items-center justify-center gap-2">
          {!isFirst && (
            <button
              onClick={prev}
              className="rounded-xl px-4 py-2 text-sm font-bold text-brand-950/50 hover:bg-surface-muted"
            >
              السابق
            </button>
          )}
          <button
            onClick={next}
            className="rounded-xl bg-brand-500 px-6 py-2 text-sm font-bold text-white hover:bg-brand-600"
          >
            {isLast ? "خلصنا! 🎉" : "التالي"}
          </button>
        </div>
      </div>
    </div>
  );
}
