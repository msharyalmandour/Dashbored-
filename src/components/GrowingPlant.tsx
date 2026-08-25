import { useEffect, useState } from "react";

/** نبتة SVG بسيطة تكبر بهدوء وتتمايل أوراقها بلطف — رمز نمو وصبر بجانب
    الترحيب، بدون أي تكلفة WebGL (SVG + CSS فقط) */
export default function GrowingPlant({ className }: { className?: string }) {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  const grow = reducedMotion ? "" : "animate-[plant-grow_1.6s_ease-out_both]";
  const sway = reducedMotion ? "" : "animate-[leaf-sway_5s_ease-in-out_infinite]";

  return (
    <svg viewBox="0 0 120 150" className={className} aria-hidden="true">
      <g className={grow} style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}>
        {/* الأصيص */}
        <path d="M38 122 L82 122 L75 144 L45 144 Z" fill="var(--color-brand-300)" opacity="0.55" />
        <rect x="35" y="114" width="50" height="11" rx="4" fill="var(--color-brand-300)" opacity="0.7" />

        {/* الساق */}
        <path
          d="M60 116 C 58 96 62 78 60 58"
          stroke="#34d399"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
        />

        {/* ورقة يسار */}
        <g
          className={sway}
          style={{ transformBox: "fill-box", transformOrigin: "0% 100%", animationDelay: "0s" }}
        >
          <path
            d="M60 96 C 40 92 26 78 24 62 C 46 64 60 78 60 96 Z"
            fill="#34d399"
            opacity="0.85"
          />
        </g>

        {/* ورقة يمين */}
        <g
          className={sway}
          style={{ transformBox: "fill-box", transformOrigin: "0% 100%", animationDelay: "0.9s" }}
        >
          <path
            d="M60 76 C 78 72 92 60 95 46 C 74 47 60 60 60 76 Z"
            fill="#6ee7b7"
            opacity="0.85"
          />
        </g>

        {/* برعم ذهبي بالأعلى */}
        <circle
          cx="60"
          cy="54"
          r="6"
          fill="var(--color-amber-accent-400)"
          style={{ transformBox: "fill-box", transformOrigin: "center" }}
          className={reducedMotion ? "" : "animate-[bud-glow_2.8s_ease-in-out_infinite]"}
        />
      </g>
    </svg>
  );
}
