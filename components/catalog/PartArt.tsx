"use client";

import { useId } from "react";

type IconKind =
  | "engine"
  | "exhaust"
  | "brakes"
  | "wheels"
  | "suspension"
  | "performance"
  | "exterior"
  | "interior"
  | "lighting";

function round(n: number) {
  return Math.round(n * 100) / 100;
}

function IconShape({ kind, gradId }: { kind: IconKind; gradId: string }) {
  const fillUrl = `url(#${gradId})`;
  switch (kind) {
    case "engine":
      return (
        <g>
          <rect x="60" y="70" width="80" height="50" rx="6" fill={fillUrl} />
          {[72, 90, 108, 126].map((x) => (
            <rect key={x} x={x} y="46" width="10" height="26" rx="2" fill={fillUrl} opacity={0.9} />
          ))}
          <rect x="60" y="122" width="80" height="8" rx="2" fill={fillUrl} opacity={0.7} />
        </g>
      );
    case "exhaust":
      return (
        <g fill="none" stroke={fillUrl} strokeWidth="7" strokeLinecap="round">
          <path d="M40 80 L110 80" />
          <ellipse cx="140" cy="80" rx="26" ry="18" fill={fillUrl} stroke="none" />
          <path d="M166 80 L184 80" strokeWidth="10" />
        </g>
      );
    case "brakes":
      return (
        <g>
          <circle cx="100" cy="90" r="46" fill="none" stroke={fillUrl} strokeWidth="6" />
          <circle cx="100" cy="90" r="30" fill="none" stroke={fillUrl} strokeWidth="3" opacity={0.6} />
          {[0, 60, 120, 180, 240, 300].map((deg) => (
            <line
              key={deg}
              x1="100"
              y1="90"
              x2={round(100 + 40 * Math.cos((deg * Math.PI) / 180))}
              y2={round(90 + 40 * Math.sin((deg * Math.PI) / 180))}
              stroke={fillUrl}
              strokeWidth="3"
              opacity={0.5}
            />
          ))}
          <rect x="82" y="46" width="36" height="20" rx="4" fill={fillUrl} />
        </g>
      );
    case "wheels":
      return (
        <g>
          <circle cx="100" cy="90" r="48" fill="none" stroke={fillUrl} strokeWidth="8" />
          <circle cx="100" cy="90" r="16" fill={fillUrl} />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <line
              key={deg}
              x1={round(100 + 18 * Math.cos((deg * Math.PI) / 180))}
              y1={round(90 + 18 * Math.sin((deg * Math.PI) / 180))}
              x2={round(100 + 42 * Math.cos((deg * Math.PI) / 180))}
              y2={round(90 + 42 * Math.sin((deg * Math.PI) / 180))}
              stroke={fillUrl}
              strokeWidth="5"
              strokeLinecap="round"
            />
          ))}
        </g>
      );
    case "suspension":
      return (
        <path
          d="M100 40 L100 52 L80 58 L120 68 L80 78 L120 88 L80 98 L120 108 L100 118 L100 140"
          fill="none"
          stroke={fillUrl}
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    case "performance":
      return (
        <g>
          <circle cx="100" cy="90" r="46" fill="none" stroke={fillUrl} strokeWidth="6" />
          {[-60, -30, 0, 30, 60].map((deg) => (
            <line
              key={deg}
              x1={round(100 + 34 * Math.cos(((deg - 90) * Math.PI) / 180))}
              y1={round(90 + 34 * Math.sin(((deg - 90) * Math.PI) / 180))}
              x2={round(100 + 42 * Math.cos(((deg - 90) * Math.PI) / 180))}
              y2={round(90 + 42 * Math.sin(((deg - 90) * Math.PI) / 180))}
              stroke={fillUrl}
              strokeWidth="3"
              opacity={0.6}
            />
          ))}
          <line x1="100" y1="90" x2="128" y2="66" stroke={fillUrl} strokeWidth="5" strokeLinecap="round" />
          <circle cx="100" cy="90" r="6" fill={fillUrl} />
        </g>
      );
    case "exterior":
      return (
        <path
          d="M35 105 C45 75 75 62 100 62 C125 62 155 75 165 105 L165 118 L35 118 Z"
          fill={fillUrl}
        />
      );
    case "interior":
      return (
        <g fill={fillUrl}>
          <rect x="65" y="45" width="70" height="55" rx="14" />
          <rect x="60" y="100" width="80" height="34" rx="10" />
        </g>
      );
    case "lighting":
      return (
        <g>
          <path d="M55 90 C55 65 75 50 100 50 C125 50 145 65 145 90 L100 100 Z" fill={fillUrl} />
          {[20, 0, -20].map((deg) => (
            <line
              key={deg}
              x1={150}
              y1={90 + deg * 0.3}
              x2={180}
              y2={90 + deg * 0.6}
              stroke={fillUrl}
              strokeWidth="4"
              strokeLinecap="round"
              opacity={0.6}
            />
          ))}
        </g>
      );
    default:
      return null;
  }
}

export function PartArt({
  icon,
  hue,
  className,
}: {
  icon: IconKind;
  hue: number;
  className?: string;
}) {
  const reactId = useId();
  const gradId = `pa-grad-${reactId}`;
  const bgId = `pa-bg-${reactId}`;
  const c1 = `hsl(${hue} 85% 65%)`;
  const c2 = `hsl(${hue} 70% 38%)`;
  return (
    <svg viewBox="0 0 200 160" className={className} role="img" aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={c1} />
          <stop offset="100%" stopColor={c2} />
        </linearGradient>
        <radialGradient id={bgId} cx="50%" cy="45%" r="65%">
          <stop offset="0%" stopColor={c1} stopOpacity="0.16" />
          <stop offset="100%" stopColor={c1} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width="200" height="160" fill="var(--color-panel-strong)" />
      <rect x="0" y="0" width="200" height="160" fill={`url(#${bgId})`} />
      <IconShape kind={icon} gradId={gradId} />
    </svg>
  );
}
