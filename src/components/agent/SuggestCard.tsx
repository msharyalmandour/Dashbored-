import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Sparkles } from "lucide-react";
import clsx from "clsx";
import { tr } from "../../lib/i18n";

/** قالب كرت اقتراح الوكيل الموحّد (توحيد التصميم ٤): أيقونة الاقتراح، عنوان، نص، المحتوى، وتنبيه المراجعة.
    أزرار الموافقة والتجاهل تكون ws-btn-primary / ws-btn-secondary داخل المحتوى. */
export default function SuggestCard({
  title,
  body,
  icon: Icon = Sparkles,
  trailing,
  review = true,
  className,
  children,
  ...rest
}: {
  title: ReactNode;
  body?: ReactNode;
  icon?: LucideIcon;
  trailing?: ReactNode;
  review?: boolean;
  className?: string;
  children?: ReactNode;
  "data-agent"?: string;
}) {
  return (
    <section className={clsx("ws-card ws-card-l space-y-3", className)} {...rest}>
      <header className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ws-accent/15 text-ws-accent3" aria-hidden>
          <Icon size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-extrabold text-ws-text">{title}</h3>
          {body && <p className="mt-0.5 text-sm text-ws-muted">{body}</p>}
        </div>
        {trailing}
      </header>
      {children}
      {review && <p className="border-t border-white/10 pt-2 text-xs text-ws-muted">{tr("راجعوا قبل ما تعتمدون.")}</p>}
    </section>
  );
}
