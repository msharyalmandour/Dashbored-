import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

/** حالة فاضية ودودة — دايرة توهج عائمة بخفة خلف الأيقونة وحلقة متقطعة
    حولها بدل مربّع أيقونة جامد، عشان تحس "رسمة" مو مجرد رسالة خطأ.

    مع `preview`: الحالة الفاضية «تعلّم» — تبيّن شكل الصفحة وهي مليانة
    (صفوف باهتة خلف) وزر واحد بس، بدل ما تقول «لا يوجد بيانات». */
export default function EmptyState({
  icon: Icon,
  title,
  desc,
  preview,
  action,
}: {
  icon: LucideIcon;
  title: string;
  desc?: string;
  preview?: string[];
  action?: ReactNode;
}) {
  if (preview?.length) {
    return (
      <div className="relative overflow-hidden rounded-3xl py-6">
        <ul aria-hidden="true" className="space-y-2.5 px-2 opacity-60 [mask-image:linear-gradient(to_bottom,black_10%,transparent_95%)]">
          {preview.map((line, i) => (
            <li
              key={i}
              className="flex items-center gap-3 rounded-2xl border border-brand-100/70 bg-paper/70 px-4 py-3 blur-[1.5px]"
            >
              <span className="h-4 w-4 shrink-0 rounded-full border-2 border-brand-300" />
              <span className="truncate text-sm text-brand-950/70">{line}</span>
              <span className="ms-auto h-6 w-6 shrink-0 rounded-full bg-brand-100" />
            </li>
          ))}
        </ul>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-paper text-brand-500 shadow-sm shadow-brand-950/10">
            <Icon size={22} />
          </span>
          <p className="font-display font-bold text-brand-950">{title}</p>
          {desc && <p className="max-w-xs text-sm text-brand-950/55">{desc}</p>}
          {action && <div className="mt-1">{action}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 py-14 text-center">
      <div className="relative flex h-20 w-20 items-center justify-center">
        <span
          className="absolute inset-0 rounded-full bg-brand-100/70 animate-[card-float_4s_ease-in-out_3]"
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
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
