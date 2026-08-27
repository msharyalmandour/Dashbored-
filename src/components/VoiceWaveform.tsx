import { useEffect, useRef, useState } from "react";
import { getSpeechAnalyser, onSpeakingChange } from "../lib/speech";

const BAR_COUNT = 5;

/** موجات صوت متحركة — ترسم طيف الصوت الحقيقي أثناء تشغيل صوت AI (عبر
    Web Audio API)، أو نبضة تقريبية أثناء صوت المتصفح الاحتياطي اللي ما
    فيه تحليل طيف متاح */
export default function VoiceWaveform({ className = "" }: { className?: string }) {
  const [speaking, setSpeaking] = useState(false);
  const barsRef = useRef<(HTMLSpanElement | null)[]>([]);
  const [usingAnalyser, setUsingAnalyser] = useState(false);

  useEffect(() => onSpeakingChange(setSpeaking), []);

  useEffect(() => {
    if (!speaking) {
      setUsingAnalyser(false);
      barsRef.current.forEach((bar) => bar?.style.setProperty("--h", "0.15"));
      return;
    }

    const analyser = getSpeechAnalyser();
    if (!analyser) {
      setUsingAnalyser(false);
      return;
    }

    setUsingAnalyser(true);
    const data = new Uint8Array(analyser.frequencyBinCount);
    const step = Math.max(1, Math.floor(data.length / BAR_COUNT));
    let rafId: number;

    const tick = () => {
      analyser.getByteFrequencyData(data);
      barsRef.current.forEach((bar, i) => {
        const v = data[i * step] ?? 0;
        const h = 0.15 + (v / 255) * 0.85;
        bar?.style.setProperty("--h", h.toFixed(2));
      });
      rafId = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(rafId);
  }, [speaking]);

  return (
    <div className={`flex items-end gap-[3px] ${className}`} aria-hidden>
      {Array.from({ length: BAR_COUNT }).map((_, i) => (
        <span
          key={i}
          ref={(el) => {
            barsRef.current[i] = el;
          }}
          className={`w-1 rounded-full bg-brand-500 ${
            speaking && !usingAnalyser ? "animate-[wave-pulse_0.9s_ease-in-out_infinite]" : ""
          }`}
          style={{
            height: "calc(5px + var(--h, 0.15) * 20px)",
            transition: usingAnalyser ? "height 60ms linear" : "height 150ms ease",
            animationDelay: speaking && !usingAnalyser ? `${i * 0.11}s` : undefined,
          }}
        />
      ))}
    </div>
  );
}
