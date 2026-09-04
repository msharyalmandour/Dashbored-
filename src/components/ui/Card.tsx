import type { ReactNode } from "react";
import clsx from "clsx";

export type CardTone = "paper" | "cream" | "teal" | "sky" | "amber" | "violet" | "rose";

const toneClasses: Record<CardTone, string> = {
  paper: "bg-paper border-brand-100/60",
  cream: "bg-amber-accent-50 border-amber-accent-100",
  teal: "bg-brand-50 border-brand-100",
  sky: "bg-sky-accent-50 border-sky-accent-100",
  amber: "bg-amber-accent-100 border-amber-accent-200",
  violet: "bg-violet-50 border-violet-100",
  rose: "bg-rose-50 border-rose-100",
};

export default function Card({
  children,
  className,
  as: As = "div",
  tone = "paper",
  interactive = false,
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section";
  tone?: CardTone;
  interactive?: boolean;
}) {
  return (
    <As
      className={clsx(
        "rounded-3xl border p-5 shadow-sm shadow-brand-950/5",
        toneClasses[tone],
        interactive && "card-interactive",
        className,
      )}
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
