import type { Car } from "@/lib/types";

export function InteriorArt({ car }: { car: Car }) {
  const c1 = `hsl(${car.hue} 75% 58%)`;
  const uid = `${car.slug}-int`;

  return (
    <svg viewBox="0 0 400 260" className="h-full w-full" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Interior detail">
      <defs>
        <linearGradient id={`int-bg-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--bg-3)" />
          <stop offset="100%" stopColor="var(--bg)" />
        </linearGradient>
        <linearGradient id={`int-glow-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={c1} stopOpacity="0.5" />
          <stop offset="100%" stopColor={c1} stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect width="400" height="260" fill={`url(#int-bg-${uid})`} />

      {/* dashboard sweep */}
      <path d="M0 150 C120 110 280 110 400 150 L400 180 C280 150 120 150 0 180 Z" fill="var(--bg-2)" stroke="var(--line)" strokeWidth="1" />
      <rect x="120" y="122" width="90" height="26" rx="4" fill="rgba(255,255,255,0.06)" />
      <rect x="128" y="128" width="74" height="4" rx="2" fill={c1} opacity="0.7" />

      {/* steering wheel */}
      <circle cx="90" cy="190" r="46" fill="none" stroke="var(--line)" strokeWidth="10" />
      <circle cx="90" cy="190" r="46" fill="none" stroke={`url(#int-glow-${uid})`} strokeWidth="10" />
      <circle cx="90" cy="190" r="10" fill="var(--bg-3)" stroke={c1} strokeWidth="1.5" />

      {/* seat silhouette */}
      <path
        d="M300 260 L300 190 C300 160 320 148 344 148 C368 148 384 164 384 190 L384 214 L360 214 L360 260 Z"
        fill="var(--bg-2)"
        stroke="var(--line)"
        strokeWidth="1"
      />
      <path d="M312 200 L372 200" stroke={c1} strokeWidth="1" opacity="0.5" />
      <path d="M312 214 L372 214" stroke={c1} strokeWidth="1" opacity="0.3" />

      {/* ambient light line */}
      <path d="M0 120 C130 96 270 96 400 120" stroke={c1} strokeWidth="1.5" opacity="0.55" fill="none" />
    </svg>
  );
}
