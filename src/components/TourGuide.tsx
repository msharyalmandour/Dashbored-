import { useEffect, useState } from "react";
import { Volume2, VolumeX, X } from "lucide-react";
import Logo from "./Logo";
import VoiceWaveform from "./VoiceWaveform";
import { useTour } from "../context/TourContext";
import { guideIntro, guideName } from "../data/onboardingTour";
import { isNarrationAvailable, onSpeakingChange, speak, stopSpeaking } from "../lib/speech";

const MUTED_KEY = "nursync.tourMuted";

/** مرشدة عائمة تتبع المستخدمة بين الصفحات أثناء الجولة التعريفية — كل خطوة
    تنقلها فعليًا للصفحة وتشرح لها وش فيها بصوت مسموع (Web Speech API)،
    بدل نافذة منبثقة ثابتة بمكانها */
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
    <div className="fixed bottom-6 end-6 z-50 w-[calc(100%-3rem)] max-w-sm print:hidden">
      <div className="animate-[panel-in_0.4s_ease-out] rounded-3xl border border-brand-100 bg-paper p-5 shadow-2xl shadow-brand-950/15">
        <div className="flex items-start gap-3">
          <span
            className={`shrink-0 animate-[card-float_3.5s_ease-in-out_infinite] rounded-full transition-transform duration-300 ${
              speaking ? "scale-110 animate-[speaker-glow_1.4s_ease-in-out_infinite]" : ""
            }`}
            style={{ "--tilt": "0deg" } as React.CSSProperties}
          >
            <Logo size={40} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-xs font-bold text-brand-600">
                <span className="text-brand-950">{guideName}</span> · خطوة{" "}
                {activeIndex + 1} من {steps.length} — {step.label}
                {speaking && <VoiceWaveform className="ms-0.5" />}
              </p>
              <div className="flex shrink-0 items-center gap-1">
                {isNarrationAvailable() && (
                  <button
                    onClick={toggleMute}
                    title={muted ? "تشغيل الصوت" : "كتم الصوت"}
                    className="rounded-lg p-1 text-brand-950/30 hover:bg-surface-muted hover:text-brand-950/60"
                  >
                    {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                  </button>
                )}
                <button
                  onClick={close}
                  title="إنهاء الجولة"
                  className="rounded-lg p-1 text-brand-950/30 hover:bg-surface-muted hover:text-brand-950/60"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <p className="mt-1.5 font-display text-base font-bold text-brand-950">{step.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-brand-950/65">{step.body}</p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <div className="flex gap-1">
            {steps.map((s, i) => (
              <span
                key={s.id}
                className={`h-1.5 w-1.5 rounded-full ${i === activeIndex ? "bg-brand-500" : "bg-brand-100"}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                onClick={prev}
                className="rounded-xl px-3 py-1.5 text-xs font-bold text-brand-950/50 hover:bg-surface-muted"
              >
                السابق
              </button>
            )}
            <button
              onClick={next}
              className="rounded-xl bg-brand-500 px-4 py-1.5 text-xs font-bold text-white hover:bg-brand-600"
            >
              {isLast ? "خلصنا! 🎉" : "التالي"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
