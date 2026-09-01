type PerfumeBottleProps = {
  accentColor: string;
  className?: string;
};

/**
 * Minimal line-art perfume bottle used as placeholder artwork until real
 * product photography is uploaded. Tinted per-product via `accentColor`.
 */
export function PerfumeBottle({ accentColor, className }: PerfumeBottleProps) {
  const gradientId = `bottle-glow-${accentColor.replace("#", "")}`;

  return (
    <svg
      viewBox="0 0 200 280"
      className={className}
      role="img"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={gradientId} cx="50%" cy="40%" r="65%">
          <stop offset="0%" stopColor={accentColor} stopOpacity="0.35" />
          <stop offset="100%" stopColor={accentColor} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${gradientId}-glass`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={accentColor} stopOpacity="0.9" />
          <stop offset="100%" stopColor={accentColor} stopOpacity="0.45" />
        </linearGradient>
      </defs>

      <circle cx="100" cy="140" r="110" fill={`url(#${gradientId})`} />

      {/* cap */}
      <rect x="80" y="18" width="40" height="34" rx="6" fill="#0d0d0d" stroke="#caa14d" strokeWidth="1.5" />
      <rect x="90" y="8" width="20" height="14" rx="3" fill="#caa14d" />

      {/* neck */}
      <rect x="90" y="50" width="20" height="20" fill="#0d0d0d" />

      {/* bottle body */}
      <path
        d="M62 72 H138 C144 72 148 78 148 86 V228 C148 244 136 256 120 256 H80 C64 256 52 244 52 228 V86 C52 78 56 72 62 72 Z"
        fill={`url(#${gradientId}-glass)`}
        stroke="#caa14d"
        strokeWidth="1.5"
        opacity="0.9"
      />

      {/* liquid line */}
      <path
        d="M52 150 H148"
        stroke="#0d0d0d"
        strokeOpacity="0.15"
        strokeWidth="1"
      />

      {/* label */}
      <rect x="72" y="150" width="56" height="40" rx="2" fill="#0d0d0d" opacity="0.85" />
      <line x1="82" y1="164" x2="118" y2="164" stroke="#caa14d" strokeWidth="1" />
      <line x1="86" y1="172" x2="114" y2="172" stroke="#caa14d" strokeWidth="0.75" />

      {/* highlight */}
      <path d="M66 90 C66 90 62 160 66 220" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="3" fill="none" />
    </svg>
  );
}
