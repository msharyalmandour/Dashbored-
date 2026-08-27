import { useEffect, useRef, useState, type CSSProperties } from "react";
import { getSpeechAnalyser, onSpeakingChange } from "../lib/speech";

/** توهج ضبابي متعدد الطبقات خلف شعار المرشد — يتفاعل فعليًا مع طيف صوت
    AI الحقيقي (متوسط شدة الصوت اللحظي يتحكم بحجم وشفافية الطبقات)، وإلا
    ينبض بإيقاع ثابت وقت صوت المتصفح الاحتياطي. أسلوب "كرة ذكاء اصطناعي"
    حديثة (زي Siri / Apple Intelligence) بدل حلقة أو أعمدة حادة */
export default function GuideOrb({ size = 190 }: { size?: number }) {
  const [speaking, setSpeaking] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => onSpeakingChange(setSpeaking), []);

  useEffect(() => {
    if (!speaking) {
      rootRef.current?.style.setProperty("--amp", "0.12");
      return;
    }
    const analyser = getSpeechAnalyser();
    if (!analyser) {
      rootRef.current?.style.setProperty("--amp", "0.5");
      return;
    }
    const data = new Uint8Array(analyser.frequencyBinCount);
    let rafId: number;
    const tick = () => {
      analyser.getByteFrequencyData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i];
      const avg = sum / data.length / 255;
      rootRef.current?.style.setProperty("--amp", (0.22 + avg * 0.95).toFixed(2));
      rafId = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(rafId);
  }, [speaking]);

  return (
    <div
      ref={rootRef}
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
      style={{ "--amp": 0.12 } as CSSProperties}
      aria-hidden
    >
      <span
        className={`absolute rounded-full blur-3xl ${
          speaking ? "animate-[orb-drift-a_3s_ease-in-out_infinite]" : "animate-[orb-drift-a_7s_ease-in-out_infinite]"
        }`}
        style={{
          width: size * 1.35,
          height: size * 1.35,
          background:
            "radial-gradient(circle, rgba(252,211,77,0.55), rgba(251,191,36,0.15) 55%, transparent 75%)",
          transform: "scale(calc(0.85 + var(--amp) * 0.55))",
          opacity: "calc(0.45 + var(--amp) * 0.5)",
        }}
      />
      <span
        className={`absolute rounded-full blur-2xl ${
          speaking ? "animate-[orb-drift-b_2.4s_ease-in-out_infinite]" : "animate-[orb-drift-b_6s_ease-in-out_infinite]"
        }`}
        style={{
          width: size,
          height: size,
          background: "radial-gradient(circle, rgba(251,191,36,0.85), rgba(251,191,36,0) 70%)",
          transform: "scale(calc(0.8 + var(--amp) * 0.7))",
          opacity: "calc(0.55 + var(--amp) * 0.45)",
        }}
      />
      <span
        className={`absolute rounded-full blur-xl ${
          speaking ? "animate-[orb-drift-a_1.9s_ease-in-out_infinite_reverse]" : "animate-[orb-drift-a_5s_ease-in-out_infinite_reverse]"
        }`}
        style={{
          width: size * 0.6,
          height: size * 0.6,
          background: "radial-gradient(circle, rgba(255,247,222,0.9), rgba(252,211,77,0.2) 65%, transparent 80%)",
          transform: "scale(calc(0.75 + var(--amp) * 0.85))",
        }}
      />
    </div>
  );
}
