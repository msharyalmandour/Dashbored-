import type { LucideIcon } from "lucide-react";

/** حالة فاضية ودودة — دايرة توهج عائمة بخفة خلف الأيقونة وحلقة متقطعة
    حولها بدل مربّع أيقونة جامد، عشان تحس "رسمة" مو مجرد رسالة خطأ */
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
    <div className="flex flex-col items-center gap-3 py-14 text-center">
      <div className="relative flex h-20 w-20 items-center justify-center">
        <span
          className="absolute inset-0 rounded-full bg-brand-100/70 animate-[card-float_4s_ease-in-out_infinite]"
          style={{ "--tilt": "0deg" } as React.CSSProperties}
        />
        <span className="absolute inset-1.5 rounded-full border-2 border-dashed border-brand-200" />
        <span className="relative flex h-14 w-14 items-center justify-center rounded-3xl bg-paper text-brand-400 shadow-sm shadow-brand-950/5">
          <Icon size={24} />
        </span>
        <span className="absolute -top-0.5 end-0 h-2.5 w-2.5 rounded-full bg-amber-accent-400" />
      </div>
      <p className="font-display font-bold text-brand-950">{title}</p>
      {desc && <p className="max-w-xs text-sm text-brand-950/45">{desc}</p>}
    </div>
  );
}
