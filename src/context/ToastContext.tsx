import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type ToastTone = "brand" | "amber" | "rose";

interface ToastInput {
  title: string;
  desc?: string;
  icon: LucideIcon;
  tone?: ToastTone;
}

interface ToastItem extends ToastInput {
  id: number;
}

interface ToastContextValue {
  showToast: (t: ToastInput) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const toneClasses: Record<ToastTone, string> = {
  brand: "bg-brand-500",
  amber: "bg-amber-accent-500",
  rose: "bg-rose-500",
};

let idCounter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((t: ToastInput) => {
    const id = idCounter++;
    setToasts((prev) => [...prev, { ...t, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex flex-col items-center gap-2 px-4 print:hidden">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex max-w-sm items-center gap-3 rounded-2xl border border-brand-100 bg-paper px-5 py-3.5 shadow-lg shadow-brand-950/10 motion-safe:animate-[toast-in_250ms_ease-out]"
          >
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white ${toneClasses[t.tone ?? "brand"]}`}
            >
              <t.icon size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-brand-950">{t.title}</p>
              {t.desc && <p className="truncate text-xs text-brand-950/50">{t.desc}</p>}
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
