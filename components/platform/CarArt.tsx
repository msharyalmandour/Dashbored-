import type { Car, Environment, Silhouette } from "@/lib/types";

interface SilhouetteCfg {
  noseX: number;
  tailX: number;
  hoodY: number;
  roofY: number;
  roofFrontX: number;
  roofBackX: number;
  deckY: number;
  beltY: number;
  frontWheelX: number;
  rearWheelX: number;
  wheelR: number;
}

const GROUND_Y = 150;

const SILHOUETTES: Record<Silhouette, SilhouetteCfg> = {
  supercar: {
    noseX: 18, tailX: 422, hoodY: 112, roofY: 80, roofFrontX: 180, roofBackX: 258,
    deckY: 104, beltY: 122, frontWheelX: 96, rearWheelX: 344, wheelR: 30,
  },
  coupe: {
    noseX: 14, tailX: 426, hoodY: 104, roofY: 66, roofFrontX: 150, roofBackX: 300,
    deckY: 112, beltY: 116, frontWheelX: 92, rearWheelX: 348, wheelR: 29,
  },
  sedan: {
    noseX: 16, tailX: 424, hoodY: 100, roofY: 62, roofFrontX: 160, roofBackX: 290,
    deckY: 100, beltY: 114, frontWheelX: 100, rearWheelX: 340, wheelR: 28,
  },
  suv: {
    noseX: 30, tailX: 410, hoodY: 88, roofY: 44, roofFrontX: 140, roofBackX: 300,
    deckY: 88, beltY: 100, frontWheelX: 108, rearWheelX: 332, wheelR: 32,
  },
  classic: {
    noseX: 26, tailX: 414, hoodY: 96, roofY: 56, roofFrontX: 170, roofBackX: 270,
    deckY: 100, beltY: 112, frontWheelX: 104, rearWheelX: 336, wheelR: 29,
  },
};

function buildBody(cfg: SilhouetteCfg): string {
  const { noseX, tailX, hoodY, roofY, roofFrontX, roofBackX, deckY, beltY } = cfg;
  const roofMid = (roofFrontX + roofBackX) / 2;
  return [
    `M ${noseX} ${beltY}`,
    `C ${noseX - 6} ${hoodY + 16} ${noseX + 18} ${hoodY} ${roofFrontX - 36} ${hoodY}`,
    `C ${roofFrontX - 8} ${roofY + 18} ${roofFrontX + 8} ${roofY} ${roofMid} ${roofY}`,
    `C ${roofBackX - 8} ${roofY} ${roofBackX + 8} ${roofY + 14} ${roofBackX + 28} ${deckY}`,
    `C ${tailX - 16} ${deckY - 4} ${tailX - 4} ${deckY + 8} ${tailX} ${beltY}`,
    `L ${tailX} ${GROUND_Y - 10}`,
    `C ${tailX} ${GROUND_Y - 2} ${tailX - 10} ${GROUND_Y} ${tailX - 22} ${GROUND_Y}`,
    `L ${noseX + 22} ${GROUND_Y}`,
    `C ${noseX + 10} ${GROUND_Y} ${noseX} ${GROUND_Y - 2} ${noseX} ${GROUND_Y - 10}`,
    "Z",
  ].join(" ");
}

function EnvironmentArt({ kind, hue, uid }: { kind: Environment; hue: number; uid: string }) {
  const line = `hsl(${hue} 40% 30% / 0.5)`;
  switch (kind) {
    case "track":
      return (
        <g opacity={0.7}>
          <rect x="0" y="118" width="440" height="32" fill={`hsl(${hue} 10% 14%)`} />
          <line x1="0" y1="150" x2="440" y2="150" stroke={line} strokeWidth="2" strokeDasharray="16 12" />
          {[...Array(4)].map((_, i) => (
            <line key={i} x1={0} y1={40 + i * 14} x2={130 - i * 18} y2={40 + i * 14} stroke={`hsl(${hue} 90% 60% / 0.18)`} strokeWidth="2" />
          ))}
        </g>
      );
    case "desert":
      return (
        <g opacity={0.8}>
          <path d="M0 150 C60 120 140 128 220 138 C300 148 360 118 440 128 L440 150 Z" fill={`hsl(${hue} 45% 18%)`} />
          <path d="M0 150 C90 138 180 150 260 146 C340 142 400 150 440 144 L440 150 Z" fill={`hsl(${hue} 40% 12%)`} />
        </g>
      );
    case "night-city":
      return (
        <g opacity={0.85}>
          {[...Array(10)].map((_, i) => (
            <rect key={i} x={12 + i * 42} y={40 + ((i * 37) % 60)} width="3" height="3" fill={`hsl(${hue} 90% 70%)`} opacity={0.5} />
          ))}
          <rect x="0" y="20" width="70" height="130" fill={`hsl(${hue} 30% 10%)`} opacity={0.6} />
          <rect x="360" y="0" width="80" height="150" fill={`hsl(${hue} 30% 8%)`} opacity={0.6} />
        </g>
      );
    case "mountain":
      return (
        <g opacity={0.8}>
          <path d="M0 130 L60 90 L110 118 L170 70 L230 122 L300 96 L360 128 L440 100 L440 150 L0 150 Z" fill={`hsl(${hue} 30% 14%)`} />
          <path d="M0 145 L90 122 L180 140 L280 118 L380 138 L440 126 L440 150 L0 150 Z" fill={`hsl(${hue} 30% 10%)`} />
        </g>
      );
    case "architecture":
      return (
        <g opacity={0.55} stroke={`hsl(${hue} 40% 40% / 0.4)`} strokeWidth="1">
          <line x1="40" y1="0" x2="40" y2="150" />
          <line x1="120" y1="0" x2="120" y2="150" />
          <line x1="320" y1="0" x2="320" y2="150" />
          <line x1="400" y1="0" x2="400" y2="150" />
          <line x1="0" y1="30" x2="440" y2="30" />
          <line x1="0" y1="60" x2="440" y2="60" />
        </g>
      );
    case "studio":
    default:
      return (
        <g>
          <ellipse cx="220" cy="150" rx="230" ry="18" fill={`url(#spot-${uid})`} />
        </g>
      );
  }
}

export function CarArt({ car, className }: { car: Car; className?: string }) {
  const cfg = SILHOUETTES[car.silhouette];
  const body = buildBody(cfg);
  const uid = car.slug;
  const c1 = `hsl(${car.hue} 85% 62%)`;
  const c2 = `hsl(${car.hue} 70% 32%)`;

  return (
    <svg viewBox="0 0 440 170" className={className} role="img" aria-label={`${car.brand} ${car.model}`}>
      <defs>
        <linearGradient id={`bg-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--bg-3)" />
          <stop offset="100%" stopColor="var(--bg)" />
        </linearGradient>
        <linearGradient id={`body-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={c1} />
          <stop offset="100%" stopColor={c2} />
        </linearGradient>
        <radialGradient id={`glow-${uid}`} cx="50%" cy="55%" r="55%">
          <stop offset="0%" stopColor={c1} stopOpacity="0.35" />
          <stop offset="100%" stopColor={c1} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`spot-${uid}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--line)" stopOpacity="0.6" />
          <stop offset="100%" stopColor="var(--line)" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect x="0" y="0" width="440" height="170" fill={`url(#bg-${uid})`} />
      <EnvironmentArt kind={car.environment} hue={car.hue} uid={uid} />
      <rect x="0" y="0" width="440" height="170" fill={`url(#glow-${uid})`} />

      <ellipse cx={(cfg.noseX + cfg.tailX) / 2} cy={GROUND_Y + 6} rx={(cfg.tailX - cfg.noseX) / 2 + 10} ry="7" fill="black" opacity="0.4" />

      <circle cx={cfg.rearWheelX} cy={GROUND_Y} r={cfg.wheelR} fill="#050505" />
      <circle cx={cfg.rearWheelX} cy={GROUND_Y} r={cfg.wheelR * 0.42} fill="#232320" />
      <circle cx={cfg.frontWheelX} cy={GROUND_Y} r={cfg.wheelR} fill="#050505" />
      <circle cx={cfg.frontWheelX} cy={GROUND_Y} r={cfg.wheelR * 0.42} fill="#232320" />

      <path d={body} fill={`url(#body-${uid})`} stroke="rgba(0,0,0,0.35)" strokeWidth="1" />
      <path
        d={`M ${cfg.roofFrontX - 20} ${cfg.hoodY - 4} L ${cfg.roofBackX + 10} ${cfg.deckY - 6}`}
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function BrandGlyph({ hue, initial }: { hue: number; initial: string }) {
  return (
    <svg viewBox="0 0 48 48" className="h-8 w-8" aria-hidden="true">
      <circle cx="24" cy="24" r="22" fill="none" stroke={`hsl(${hue} 60% 55% / 0.5)`} strokeWidth="1.5" />
      <text
        x="24"
        y="24"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="var(--font-display)"
        fontSize="18"
        fill={`hsl(${hue} 70% 62%)`}
      >
        {initial}
      </text>
    </svg>
  );
}
