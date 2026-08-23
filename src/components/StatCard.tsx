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
    <Card tone={tone} className="flex flex-col">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-brand-950/55">{label}</span>
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${chipClasses[color] ?? chipClasses.brand}`}
        >
          <Icon size={16} />
        </span>
      </div>
      <p className="font-display mt-3 text-3xl font-extrabold text-brand-950">{value}</p>
      {progress !== undefined ? (
        <div className="mt-3">
          <ProgressBar value={progress} color={color} track="bg-white/70" />
        </div>
      ) : (
        sub && (
          <p className={`mt-1 text-xs font-bold ${subTextClasses[color] ?? subTextClasses.brand}`}>
            {sub}
          </p>
        )
      )}
    </Card>
  );
}
