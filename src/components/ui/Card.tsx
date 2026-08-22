import type { ReactNode } from "react";
import clsx from "clsx";

export default function Card({
  children,
  className,
  as: As = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section";
}) {
  return (
    <As
      className={clsx(
        "rounded-2xl border border-brand-100/70 bg-white p-5 shadow-sm shadow-brand-950/5",
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
        <h3 className="text-base font-bold text-brand-950">{title}</h3>
        {subtitle && <p className="mt-0.5 text-sm text-brand-950/50">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
