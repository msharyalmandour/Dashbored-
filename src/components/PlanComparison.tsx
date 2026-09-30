import { Check, Minus, Sparkles } from "lucide-react";
import { AI_PRICE, BASIC_PRICE, planComparison, type CompareRow } from "../lib/plans";

type Variant = "dark" | "light";

const tone: Record<Variant, Record<string, string>> = {
  dark: {
    wrap: "border-white/10 bg-white/[0.04] backdrop-blur-2xl",
    head: "text-white",
    group: "bg-white/[0.06] text-amber-300",
    row: "border-white/[0.07] text-white/75",
    muted: "text-white/30",
    basicText: "text-white/55",
    aiText: "font-semibold text-amber-200",
    aiCol: "bg-amber-400/[0.06]",
    ok: "bg-white/10 text-white/70",
    okAi: "bg-amber-400/20 text-amber-300",
  },
  light: {
    wrap: "border-brand-100 bg-paper",
    head: "text-brand-950",
    group: "bg-surface-muted text-brand-700",
    row: "border-brand-100/70 text-brand-950/75",
    muted: "text-brand-950/25",
    basicText: "text-brand-950/55",
    aiText: "font-semibold text-amber-accent-700",
    aiCol: "bg-amber-accent-50/60",
    ok: "bg-brand-100 text-brand-600",
    okAi: "bg-amber-accent-100 text-amber-accent-700",
  },
};

function Cell({ value, ai, v }: { value: CompareRow["basic"]; ai?: boolean; v: Variant }) {
  const t = tone[v];
  if (value === true)
    return (
      <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full ${ai ? t.okAi : t.ok}`}>
        <Check size={12} strokeWidth={3} />
      </span>
    );
  if (value === false) return <Minus size={16} className={t.muted} />;
  return <span className={`text-[11px] leading-snug ${ai ? t.aiText : t.basicText}`}>{value}</span>;
}

/** جدول مقارنة Basic مقابل AI — مصدره plans.ts (نفس الحقيقة بالصفحة الرئيسية وصفحة الباقات) */
export default function PlanComparison({ variant = "dark" }: { variant?: Variant }) {
  const t = tone[variant];
  return (
    <div className={`overflow-hidden rounded-[1.75rem] border text-start ${t.wrap}`}>
      <div className="grid grid-cols-[1fr_5.5rem_6.5rem] items-end gap-2 px-4 py-4 sm:grid-cols-[1fr_9rem_10rem] sm:px-6">
        <p className={`font-display text-base font-extrabold ${t.head}`}>الفرق بنظرة</p>
        <div className="text-center">
          <p className={`text-xs font-extrabold ${t.head}`}>Basic</p>
          <p className={`text-[11px] ${t.basicText}`}>{BASIC_PRICE} ريال</p>
        </div>
        <div className="text-center">
          <p className={`inline-flex items-center gap-1 text-xs font-extrabold ${t.aiText}`}>
            <Sparkles size={11} />
            AI
          </p>
          <p className={`text-[11px] ${t.basicText}`}>{AI_PRICE} ريال</p>
        </div>
      </div>
      {planComparison.map((g) => (
        <div key={g.title}>
          <p className={`px-4 py-2 text-[11px] font-extrabold tracking-wide sm:px-6 ${t.group}`}>{g.title}</p>
          {g.rows.map((r) => (
            <div
              key={r.label}
              className={`grid grid-cols-[1fr_5.5rem_6.5rem] items-center gap-2 border-t px-4 py-3 text-xs leading-relaxed sm:grid-cols-[1fr_9rem_10rem] sm:px-6 sm:text-sm ${t.row}`}
            >
              <span>{r.label}</span>
              <span className="flex justify-center text-center">
                <Cell value={r.basic} v={variant} />
              </span>
              <span className={`-my-3 flex items-center justify-center self-stretch text-center ${t.aiCol}`}>
                <Cell value={r.ai} ai v={variant} />
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
