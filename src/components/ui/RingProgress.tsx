import type { ReactNode } from "react";
import { colorClasses } from "../../lib/colors";

/** حلقة تقدّم دائرية — نفس ألوان ProgressBar بالضبط، بس كعنصر بصري أبرز
    لواجهة الهيرو الرئيسية (بدل الشريط الأفقي المسطّح) */
export default function RingProgress({
  value,
  size = 116,
  strokeWidth = 10,
  color = "brand",
  children,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  children?: ReactNode;
}) {
  const c = colorClasses(color);
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-track)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`${c.text600} transition-all duration-700 ease-out`}
          stroke="currentColor"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}
