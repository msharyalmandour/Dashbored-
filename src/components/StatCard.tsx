import type { LucideIcon } from "lucide-react";
import Card, { type CardTone } from "./ui/Card";
import ProgressBar from "./ui/ProgressBar";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  color?: string;
  tone?: CardTone;
  progress?: number;
}

const chipClasses: Record<string, string> = {
  brand: "bg-brand-500 text-white",
  "sky-accent": "bg-sky-accent-500 text-white",
  "amber-accent": "bg-amber-accent-500 text-white",
};

const subTextClasses: Record<string, string> = {
  brand: "text-brand-700",
  "sky-accent": "text-sky-accent-600",
  "amber-accent": "text-amber-accent-600",
};

export default function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = "brand",
  tone = "paper",
  progress,
}: StatCardProps) {
  return (
    <Card tone={tone} className="flex flex-col p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-wide text-brand-950/45">{label}</span>
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${chipClasses[color] ?? chipClasses.brand}`}
        >
          <Icon size={14} />
        </span>
      </div>
      <p className="font-display mt-2 text-lg font-extrabold leading-snug text-brand-950">{value}</p>
      {progress !== undefined ? (
        <div className="mt-2.5">
          <ProgressBar value={progress} color={color} track="bg-[var(--color-track)]" />
        </div>
      ) : (
        sub && (
          <p className={`mt-1 text-[11px] font-bold leading-snug ${subTextClasses[color] ?? subTextClasses.brand}`}>
            {sub}
          </p>
        )
      )}
    </Card>
  );
}
