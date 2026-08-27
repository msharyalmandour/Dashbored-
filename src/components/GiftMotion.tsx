import type { CSSProperties } from "react";

const sparkAngles = [-60, -20, 20, 60, 100, -100];

/** موشن صندوق هدية صغير — الغطا يقفز وينفتح شوي مع بريق وشرر يطير حواليه،
    بحلقة متكررة تسكن أغلب الوقت وتنبض لحظة "افتحوها!" كل بضع ثوانٍ.
    بديل عن أيقونة Gift الثابتة لأي مكان نبرز فيه "٣ أيام تجربة مجانية" */
export default function GiftMotion({ size = 20 }: { size?: number }) {
  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      <span
        aria-hidden="true"
        className="absolute inset-0 animate-[gift-glow-burst_4s_ease-in-out_infinite] rounded-full bg-amber-300/60 blur-[3px]"
      />
      {sparkAngles.map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        const dist = size * 0.85;
        const style = {
          "--sx": `${Math.cos(rad) * dist}px`,
          "--sy": `${Math.sin(rad) * dist}px`,
          animationDelay: `${i * 0.05}s`,
        } as CSSProperties;
        return (
          <span
            key={angle}
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 h-[3px] w-[3px] animate-[gift-spark_4s_ease-in-out_infinite] rounded-full bg-amber-200"
            style={style}
          />
        );
      })}
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="relative text-amber-300"
      >
        <g className="origin-[12px_10px] animate-[gift-box-bounce_4s_ease-in-out_infinite]">
          <path d="M12 8v13" />
          <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
        </g>
        <g className="origin-[12px_10px] animate-[gift-lid-pop_4s_ease-in-out_infinite]">
          <rect x="3" y="8" width="18" height="4" rx="1" />
          <path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8" />
          <path d="M16.5 8a2.5 2.5 0 0 0 0-5C13 3 12 8 12 8" />
        </g>
      </svg>
    </span>
  );
}
