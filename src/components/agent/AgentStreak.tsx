import { useId } from "react";

/** خط الضوء داخل خانة الكتابة (منقول من streak() بالتصميم): 4 خطوط متموجة بتدرّج برتقالي-كريمي + توهّج.
    `level` (0..1) = مستوى الصوت الحقيقي وقت «نسمعك»: يكبّر الموجة معه (بدون أي حركة لا نهائية). */
export default function AgentStreak({ width = 300, height = 52, level, className }: { width?: number; height?: number; level?: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  const w = width;
  const m = height / 2;
  const path = (a: number, b: number, c: number) => `M0 ${m} C ${w * 0.18} ${m - a}, ${w * 0.32} ${m + a}, ${w / 2} ${m} S ${w * 0.82} ${m - b}, ${w} ${m}`.replace(/\s+/g, " ") + (c ? "" : "");
  const lines: [number, number, number, number][] = [
    [22, 13.2, 5, 0.35],
    [14, 8.4, 2.2, 0.9],
    [28, 16.8, 1.2, 0.6],
    [8, 4.8, 1, 0.8],
  ];
  const g = (
    <>
      {lines.map(([a, b, sw, op], k) => (
        <path key={k} d={path(a, b, 0)} fill="none" stroke={`url(#sg${id})`} strokeWidth={sw} opacity={op} />
      ))}
    </>
  );
  return (
    <svg aria-hidden width="100%" height={height} viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className={className} style={{ display: "block", overflow: "visible" }}>
      <defs>
        <linearGradient id={`sg${id}`} x1="0" x2="1">
          <stop offset="0" stopColor="#FF5A0A" stopOpacity="0" />
          <stop offset=".35" stopColor="#FF8A2A" />
          <stop offset=".55" stopColor="#FFF1DE" />
          <stop offset=".75" stopColor="#FF7A1A" />
          <stop offset="1" stopColor="#FF5A0A" stopOpacity="0" />
        </linearGradient>
        <filter id={`sb${id}`} x="-20%" y="-80%" width="140%" height="260%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>
      <g className="ag-streak" style={level === undefined ? undefined : { transform: `scaleY(${(0.55 + Math.min(1, level) * 1.1).toFixed(2)})` }}>
        <g filter={`url(#sb${id})`}>{g}</g>
        <g>{g}</g>
        <ellipse cx={w * 0.52} cy={m} rx={w * 0.12} ry="6" fill="#FFF6EA" opacity=".85" filter={`url(#sb${id})`} />
      </g>
    </svg>
  );
}
