import { colorClasses } from "../../lib/colors";

export default function ProgressBar({
  value,
  color = "brand",
  track = "bg-brand-50",
  className,
}: {
  value: number;
  color?: string;
  track?: string;
  className?: string;
}) {
  const c = colorClasses(color);
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full ${track} ${className ?? ""}`}>
      <div
        className={`h-full rounded-full ${c.bg500} transition-all`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
