import type { CSSProperties, ReactNode } from "react";
import clsx from "clsx";

export type CardTone = "paper" | "cream" | "teal" | "sky" | "amber" | "violet" | "rose";

const toneClasses: Record<CardTone, string> = {
  paper: "bg-paper/60 border-brand-100/50",
  cream: "bg-amber-accent-50/55 border-amber-accent-100/60",
  teal: "bg-brand-50/55 border-brand-100/60",
  sky: "bg-sky-accent-50/55 border-sky-accent-100/60",
  amber: "bg-amber-accent-100/50 border-amber-accent-200/60",
  violet: "bg-violet-50/55 border-violet-100/60",
  rose: "bg-rose-50/55 border-rose-100/60",
};

export default function Card({
  children,
  className,
  as: As = "div",
  tone = "paper",
  interactive = false,
  style,
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section";
  tone?: CardTone;
  interactive?: boolean;
  style?: CSSProperties;
}) {
  return (
    <As
      className={clsx(
        "glass-panel rounded-3xl border p-5 backdrop-blur-xl backdrop-saturate-150",
        toneClasses[tone],
        interactive && "card-interactive",
        className,
      )}
      style={style}
    >
      {children}
    </As>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h3 className="font-display text-base font-bold text-brand-950">{title}</h3>
        {subtitle && <p className="mt-0.5 text-sm text-brand-950/50">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
