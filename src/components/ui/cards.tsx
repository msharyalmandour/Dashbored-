import { useState, type ComponentType, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronDown, X } from "lucide-react";
import clsx from "clsx";
import Card, { type CardTone } from "./Card";
import ProgressBar from "./ProgressBar";

/** ==========================================================================
    نظام بطاقات premium — Insight / Progress / Action / Alert / Expandable
    كلها مبنية فوق Card/CardHeader/ProgressBar الموجودة، بدون إعادة اختراع
    أي منطق أو تصميم أساسي. ========================================== */

/* -------------------------------------------------------------------- */
/* Insight — رقم كبير بارز (KPI) مع أيقونة واتجاه اختياري                */
/* -------------------------------------------------------------------- */
export function InsightCard({
  icon: Icon,
  label,
  value,
  trend,
  tone = "paper",
  interactive,
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  trend?: string;
  tone?: CardTone;
  interactive?: boolean;
  className?: string;
}) {
  return (
    <Card tone={tone} interactive={interactive} className={clsx("flex flex-col", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-brand-950/50">{label}</span>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white">
          <Icon size={15} />
        </span>
      </div>
      <p className="font-display mt-2 text-3xl font-extrabold text-brand-950">{value}</p>
      {trend && <p className="mt-1 text-xs font-bold text-brand-700">{trend}</p>}
    </Card>
  );
}

/* -------------------------------------------------------------------- */
/* Progress — عنوان + شريط تقدّم + وصف                                   */
/* -------------------------------------------------------------------- */
export function ProgressCard({
  title,
  caption,
  value,
  color = "brand",
  tone = "paper",
  className,
}: {
  title: string;
  caption?: string;
  value: number;
  color?: string;
  tone?: CardTone;
  className?: string;
}) {
  return (
    <Card tone={tone} className={className}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-brand-950">{title}</p>
        <span className="font-display text-sm font-extrabold text-brand-700">{value}%</span>
      </div>
      <ProgressBar value={value} color={color} track="bg-[var(--color-track)]" />
      {caption && <p className="mt-2 text-xs text-brand-950/45">{caption}</p>}
    </Card>
  );
}

/* -------------------------------------------------------------------- */
/* Action — دعوة لاتخاذ إجراء: عنوان + وصف + زر رئيسي                    */
/* -------------------------------------------------------------------- */
export function ActionCard({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  actionDisabled = false,
  highlighted = false,
  tone = "paper",
  className,
  children,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
  highlighted?: boolean;
  tone?: CardTone;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <Card
      tone={tone}
      className={clsx(
        highlighted && "ring-2 ring-brand-500 ring-offset-2 ring-offset-surface",
        className,
      )}
    >
      {Icon && (
        <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-500 text-white">
          <Icon size={18} />
        </span>
      )}
      <h3 className="font-display text-lg font-extrabold text-brand-950">{title}</h3>
      {description && <p className="mt-1.5 text-sm text-brand-950/55">{description}</p>}
      {children}
      {actionLabel && (
        <button
          onClick={onAction}
          disabled={actionDisabled}
          className="mt-4 w-full rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-600 disabled:cursor-default disabled:opacity-70 disabled:hover:bg-brand-500"
        >
          {actionLabel}
        </button>
      )}
    </Card>
  );
}

/* -------------------------------------------------------------------- */
/* Alert — بانر تنبيه/معلومة بأيقونة، مع إجراء و/أو زر إغلاق اختياري     */
/* -------------------------------------------------------------------- */
export type AlertTone = "info" | "warning" | "danger" | "success" | "violet";

const alertToneClasses: Record<
  AlertTone,
  { border: string; bg: string; chip: string; text: string; iconText: string }
> = {
  info: {
    border: "border-sky-accent-200",
    bg: "bg-sky-accent-50",
    chip: "bg-sky-accent-500",
    text: "text-sky-accent-700",
    iconText: "text-sky-accent-600",
  },
  warning: {
    border: "border-amber-accent-200",
    bg: "bg-amber-accent-100",
    chip: "bg-amber-accent-500",
    text: "text-amber-accent-700",
    iconText: "text-amber-accent-600",
  },
  danger: {
    border: "border-rose-200",
    bg: "bg-rose-50",
    chip: "bg-rose-500",
    text: "text-rose-700",
    iconText: "text-rose-600",
  },
  success: {
    border: "border-brand-200",
    bg: "bg-brand-50",
    chip: "bg-brand-500",
    text: "text-brand-700",
    iconText: "text-brand-600",
  },
  violet: {
    border: "border-violet-100",
    bg: "bg-violet-50",
    chip: "bg-violet-500",
    text: "text-violet-700",
    iconText: "text-violet-600",
  },
};

export function AlertCard({
  icon: Icon,
  tone = "info",
  children,
  action,
  onDismiss,
  className,
}: {
  icon: ComponentType<{ size?: number; className?: string }>;
  tone?: AlertTone;
  children: ReactNode;
  action?: ReactNode;
  onDismiss?: () => void;
  className?: string;
}) {
  const t = alertToneClasses[tone];
  return (
    <div
      className={clsx(
        "flex items-start gap-4 rounded-3xl border px-5 py-4 print:hidden",
        t.border,
        t.bg,
        className,
      )}
    >
      <span
        className={clsx(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-white",
          t.chip,
        )}
      >
        <Icon size={18} />
      </span>
      <div className={clsx("min-w-0 flex-1 text-sm font-semibold", t.text)}>{children}</div>
      {action}
      {onDismiss && (
        <button
          onClick={onDismiss}
          className={clsx("shrink-0 rounded-lg p-1.5 hover:bg-black/5", t.iconText)}
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------- */
/* Expandable — بطاقة قابلة للطي بانتقال ناعم (grid-rows، بدون قياس JS)   */
/* -------------------------------------------------------------------- */
export function ExpandableCard({
  title,
  subtitle,
  defaultOpen = false,
  tone = "paper",
  className,
  children,
}: {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  tone?: CardTone;
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card tone={tone} className={className}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 text-start"
      >
        <div>
          <p className="font-display text-base font-bold text-brand-950">{title}</p>
          {subtitle && <p className="mt-0.5 text-sm text-brand-950/50">{subtitle}</p>}
        </div>
        <ChevronDown
          size={18}
          className={clsx(
            "shrink-0 text-brand-950/40 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="pt-4">{children}</div>
        </div>
      </div>
    </Card>
  );
}
