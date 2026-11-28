import { useEffect, useRef, useState } from "react";
import { CELEBRATE_EVENT, type CelebrateKind } from "../../lib/celebrate";
import { tr } from "../../lib/i18n";

/** لحظة احتفال صغيرة: قصاصات ملوّنة من نص الشاشة + كرت ويسي تحت لمدة ثانيتين ونص.
    بدون صوت، وتنضغط لو جات أكثر من وحدة ورا بعض. لو «قلّل الحركة» مفعّل: الكرت بس بدون قصاصات. */
const COLORS = ["#FF6A00", "#7B61FF", "#3ED6A0", "#FFC93C", "#FF7AA8", "#5EE0C0"];

const lines = (): Record<CelebrateKind, string> => ({
  task: tr("كفو. مهمة انقفلت، والفريق قرّب خطوة."),
  section: tr("كفو. هالجزء خلص، نكمّل اللي بعده؟"),
  stage: tr("مرحلة كاملة خلصت. فخور فيكم."),
});

function reduced() {
  return (
    document.documentElement.hasAttribute("data-reduce-motion") ||
    !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

export default function Celebrate() {
  const [shot, setShot] = useState<{ id: number; text: string; burst: boolean } | null>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent<{ kind: CelebrateKind; text?: string }>).detail;
      if (!d) return;
      window.clearTimeout(timer.current);
      setShot({ id: Date.now(), text: d.text || lines()[d.kind] || lines().task, burst: !reduced() });
      timer.current = window.setTimeout(() => setShot(null), 2600);
    };
    window.addEventListener(CELEBRATE_EVENT, on);
    return () => {
      window.removeEventListener(CELEBRATE_EVENT, on);
      window.clearTimeout(timer.current);
    };
  }, []);
  if (!shot) return null;
  return (
    <div className="cel" key={shot.id} aria-live="polite">
      {shot.burst && (
        <div className="cel-burst" aria-hidden>
          {Array.from({ length: 26 }, (_, i) => {
            const a = (i / 26) * Math.PI * 2 + (i % 3) * 0.2;
            const r = 120 + (i % 5) * 34;
            return (
              <i
                key={i}
                style={{
                  ["--x" as string]: `${Math.cos(a) * r}px`,
                  ["--y" as string]: `${Math.sin(a) * r - 60}px`,
                  ["--r" as string]: `${(i * 47) % 360}deg`,
                  background: COLORS[i % COLORS.length],
                  borderRadius: i % 3 === 0 ? "50%" : "3px",
                }}
              />
            );
          })}
        </div>
      )}
      <div className="cel-card" role="status">
        <img src="/lux/wesy-face.webp" alt="" />
        <span>
          <b>{tr("ويسي")}</b>
          {shot.text}
        </span>
      </div>
    </div>
  );
}
