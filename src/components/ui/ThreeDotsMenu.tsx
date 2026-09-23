import { useEffect, useRef, useState } from "react";
import { MoreVertical } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface ThreeDotsMenuItem {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  tone?: "default" | "danger";
  /** لو موجودة، أول ضغطة تبدّل نص العنصر لها بدل ما تنفّذ onClick فورًا —
      تأكيد بضغطة ثانية بدون حاجة لنافذة منبثقة منفصلة (زي زر النسخ اللي
      يتحول لـ "تم النسخ" بباقي الموقع، بس هنا التأكيد يمنع حذف بالخطأ) */
  confirmLabel?: string;
}

/** قائمة نقاط ثلاث قابلة لإعادة الاستخدام — تُغلق تلقائيًا بالضغط برّا أو
    Escape. تُستخدم بكل مكان بالموقع يحتاج إجراءات إضافية (حذف غالبًا) على
    عنصر/بطاقة بدون ما نملي الواجهة بأزرار ظاهرة دايمًا. */
export default function ThreeDotsMenu({ items }: { items: ThreeDotsMenuItem[] }) {
  const [open, setOpen] = useState(false);
  const [confirmingIndex, setConfirmingIndex] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = () => {
      setOpen(false);
      setConfirmingIndex(null);
    };
    const onPointerDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
          setConfirmingIndex(null);
        }}
        aria-label="خيارات إضافية"
        className="flex h-8 w-8 items-center justify-center rounded-lg text-brand-950/35 transition-colors hover:bg-surface-muted hover:text-brand-950/70"
      >
        <MoreVertical size={16} />
      </button>
      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute end-0 top-full z-20 mt-1 min-w-[11rem] overflow-hidden rounded-xl border border-brand-100 bg-white py-1 shadow-lg shadow-brand-950/10"
        >
          {items.map((item, i) => {
            const isConfirming = confirmingIndex === i;
            return (
              <button
                key={item.label}
                onClick={() => {
                  if (item.confirmLabel && !isConfirming) {
                    setConfirmingIndex(i);
                    return;
                  }
                  item.onClick();
                  setOpen(false);
                  setConfirmingIndex(null);
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-start text-sm font-semibold transition-colors ${
                  item.tone === "danger" || isConfirming
                    ? "text-rose-600 hover:bg-rose-50"
                    : "text-brand-950/75 hover:bg-surface-muted"
                }`}
              >
                {item.icon && <item.icon size={14} className="shrink-0" />}
                {isConfirming ? item.confirmLabel : item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
