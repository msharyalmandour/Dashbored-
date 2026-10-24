import type { ReactNode } from "react";
import clsx from "clsx";
import { Check } from "lucide-react";
import RingProgress from "./RingProgress";
import { tr } from "../../lib/i18n";

/* لغة التصميم الموحّدة للصفحات الداخلية (كلها ما عدا الرئيسية):
   ترويسة صفحة → عمود رئيسي + عمود جانبي (بطاقة مميزة + جاهزية) → صفوف هادئة.
   مبنية على نفس متغيرات الثيم (brand / amber-accent) عشان تلبس كل الثيمات. */

/** رأس الصفحة: سطر صغير للقسم، عنوان كبير، شرح، وزر رئيسي (أو تبويبات) بالطرف الثاني */
export function PageHeader({
  kicker,
  title,
  subtitle,
  action,
}: {
  kicker?: string;
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {kicker && <p className="text-sm font-semibold text-amber-accent-400/80">{kicker}</p>}
          <h1 className="font-display text-3xl font-bold leading-tight text-brand-950 sm:text-4xl">{title}</h1>
          {subtitle && <p className="mt-1 max-w-[60ch] text-brand-950/55">{subtitle}</p>}
        </div>
        {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
      </div>
      <div aria-hidden className="gold-groove mt-5" />
    </div>
  );
}

/** الزر الرئيسي المتدرّج (برتقالي → كهرماني) */
export const primaryBtn =
  "inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-l from-amber-accent-400 to-brand-500 px-6 py-3 text-sm font-bold text-[#1a0f00] shadow-[0_8px_28px_-8px_var(--color-brand-500)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50";

/** زر ثانوي بحدّ رفيع */
export const ghostBtn =
  "inline-flex items-center justify-center gap-2 rounded-full border border-brand-500/35 px-5 py-2.5 text-sm font-semibold text-amber-accent-400 transition hover:bg-brand-500/10 disabled:cursor-not-allowed disabled:opacity-50";

/** صف هادئ داخل بطاقة */
export const rowSurface = "rounded-2xl bg-black/25 px-4 py-3.5";

/** تبويبات على شكل كبسولة */
export function Segmented<T extends string>({
  items,
  value,
  onChange,
  className,
}: {
  items: { id: T; label: string; badge?: number }[];
  value: T;
  onChange: (id: T) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={clsx(
        "inline-flex max-w-full flex-wrap gap-1.5 rounded-full border border-brand-500/30 bg-paper/50 p-1.5 backdrop-blur-xl",
        className,
      )}
    >
      {items.map((it) => (
        <button
          key={it.id}
          role="tab"
          aria-selected={value === it.id}
          onClick={() => onChange(it.id)}
          className={clsx(
            "flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-semibold transition-colors",
            value === it.id
              ? "bg-gradient-to-l from-amber-accent-400 to-brand-500 text-[#1a0f00]"
              : "text-brand-950/55 hover:text-brand-950",
          )}
        >
          {it.label}
          {it.badge ? (
            <span
              className={clsx(
                "rounded-full px-1.5 text-[11px] font-bold",
                value === it.id ? "bg-black/20" : "bg-brand-500/20 text-amber-accent-400",
              )}
            >
              {it.badge}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

export type ChipTone = "late" | "active" | "todo" | "done" | "neutral";

const chipTone: Record<ChipTone, string> = {
  late: "border-[#ff7a6b] text-[#ff7a6b]",
  active: "border-amber-accent-400 text-amber-accent-400",
  todo: "border-[#9aa3f0] text-[#9aa3f0]",
  done: "border-[#7fd6a0] text-[#7fd6a0]",
  neutral: "border-brand-950/25 text-brand-950/60",
};

export const chipDot: Record<ChipTone, string> = {
  late: "bg-[#ff7a6b]",
  active: "bg-amber-accent-400",
  todo: "bg-[#9aa3f0]",
  done: "bg-[#7fd6a0]",
  neutral: "bg-brand-950/30",
};

/** شارة حالة بحدّ ملوّن */
export function StatusChip({ tone, children }: { tone: ChipTone; children: ReactNode }) {
  return (
    <span
      className={clsx(
        "inline-block whitespace-nowrap rounded-full border px-3 py-0.5 text-xs font-semibold",
        chipTone[tone],
      )}
    >
      {children}
    </span>
  );
}

/** بطاقة الصفحة الرئيسية: زجاجية بحدّ برتقالي خفيف */
export function Panel({
  title,
  hint,
  children,
  className,
}: {
  title?: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={clsx(
        "glass-panel rounded-[28px] border border-brand-500/30 bg-paper/55 p-5 backdrop-blur-xl backdrop-saturate-150 sm:p-6",
        className,
      )}
    >
      {(title || hint) && (
        <div className="mb-5">
          <div className="flex items-center justify-between gap-3">
            {title && <h2 className="font-display text-xl font-bold text-brand-950">{title}</h2>}
            {hint && <span className="text-sm text-brand-950/50">{hint}</span>}
          </div>
          <div aria-hidden className="gold-groove-soft mt-3" />
        </div>
      )}
      {children}
    </section>
  );
}

/** البطاقة المتدرّجة اللي تلفت النظر (أقرب موعد، الاجتماع القادم…) */
export function HighlightCard({
  kicker,
  title,
  subtitle,
  children,
}: {
  kicker: string;
  title: string;
  subtitle?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-[28px] bg-gradient-to-br from-brand-500/60 to-amber-accent-400/35 p-6">
      <p className="text-sm text-brand-950/80">{kicker}</p>
      <p className="font-display mt-0.5 text-2xl font-bold leading-snug text-brand-950">{title}</p>
      {subtitle && <p className="mt-1 text-sm text-brand-950/80">{subtitle}</p>}
      {children}
    </div>
  );
}

/** حلقة جاهزية + قائمة بنود (خلصت / باقي) */
export function ReadinessPanel({
  title,
  subtitle,
  done,
  total,
  items,
  footer,
}: {
  title: string;
  subtitle?: string;
  done: number;
  total: number;
  items: { label: string; done: boolean }[];
  footer?: ReactNode;
}) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <Panel>
      <div className="flex items-center gap-4">
        <RingProgress value={pct} size={96} strokeWidth={10}>
          <div className="text-center leading-tight">
            <div className="font-display text-xl font-bold text-brand-950">{pct}%</div>
          </div>
        </RingProgress>
        <div className="min-w-0">
          <p className="font-display text-lg font-bold text-brand-950">{title}</p>
          <p className="text-sm text-brand-950/50">
            {subtitle ?? tr("{0} من {1}", done, total)}
          </p>
        </div>
      </div>
      {items.length > 0 && (
        <ul className="mt-4 space-y-2.5">
          {items.map((it, i) => (
            <li key={i} className={clsx("flex items-center gap-3 text-[15px]", !it.done && "text-brand-950/55")}>
              <span
                className={clsx(
                  "flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full",
                  it.done
                    ? "bg-gradient-to-l from-amber-accent-400 to-brand-500 text-[#1a0f00]"
                    : "border-2 border-brand-500/40",
                )}
              >
                {it.done && <Check size={13} strokeWidth={3} />}
              </span>
              <span className="min-w-0 flex-1 truncate">{it.label}</span>
            </li>
          ))}
        </ul>
      )}
      {footer && <div className="mt-4 border-t border-brand-100/20 pt-3 text-sm text-brand-950/50">{footer}</div>}
    </Panel>
  );
}

/** تخطيط الصفحة: عمود رئيسي + عمود جانبي (ينزل تحت على الجوال) */
export function PageColumns({ main, side }: { main: ReactNode; side: ReactNode }) {
  return (
    <div className="grid grid-cols-1 items-start gap-7 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-7">{main}</div>
      <aside className="min-w-0 space-y-7 lg:sticky lg:top-24">{side}</aside>
    </div>
  );
}
