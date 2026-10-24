import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { tr } from "../../lib/i18n";

/** نافذة زجاجية: تتقفل بـEsc أو بالضغط خارجها أو زر الإغلاق، والتركيز ينتقل لها أول ما تنفتح */
export default function Dialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    box.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      prev?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="max-h-[90vh] w-full max-w-[560px] overflow-y-auto rounded-t-[32px] border border-[rgba(255,107,0,.3)] bg-[rgba(24,16,8,.96)] p-6 text-[#F4F0EC] shadow-[0_40px_120px_rgba(0,0,0,.6)] outline-none backdrop-blur-[18px] sm:rounded-[32px]"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-kufi text-xl font-extrabold">{title}</h2>
          <button onClick={onClose} aria-label={tr("إغلاق")} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 text-[#B8ADA2] hover:text-[#F4F0EC]">
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
