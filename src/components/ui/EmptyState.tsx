import type { LucideIcon } from "lucide-react";

export default function EmptyState({
  icon: Icon,
  title,
  desc,
}: {
  icon: LucideIcon;
  title: string;
  desc?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 py-14 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-3xl bg-brand-50 text-brand-400">
        <Icon size={26} />
      </span>
      <p className="font-display font-bold text-brand-950">{title}</p>
      {desc && <p className="max-w-xs text-sm text-brand-950/45">{desc}</p>}
    </div>
  );
}
