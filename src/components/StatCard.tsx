import type { LucideIcon } from "lucide-react";
import { colorClasses } from "../lib/colors";
import ProgressBar from "./ui/ProgressBar";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  color?: string;
  progress?: number;
}

export default function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = "brand",
  progress,
}: StatCardProps) {
  const c = colorClasses(color);
  return (
    <div className="rounded-2xl border border-brand-100/70 bg-white p-4 shadow-sm shadow-brand-950/5">
      <div className="flex items-center gap-2 text-sm text-brand-950/50">
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${c.bg50} ${c.text600}`}>
          <Icon size={16} />
        </span>
        {label}
      </div>
      <p className="mt-3 text-2xl font-extrabold text-brand-950">{value}</p>
      {progress !== undefined ? (
        <div className="mt-3">
          <ProgressBar value={progress} color={color} />
        </div>
      ) : (
        sub && <p className={`mt-1 text-xs font-semibold ${c.text600}`}>{sub}</p>
      )}
    </div>
  );
}
