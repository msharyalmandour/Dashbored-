import { Moon, Sun } from "lucide-react";
import clsx from "clsx";
import { tr } from "../../lib/i18n";

/** تبديل «داكن / وضع الورقة» فوق محررات الكتابة */
export default function PaperToggle({ on, onChange }: { on: boolean; onChange: (on: boolean) => void }) {
  return (
    <div className="v3-g flex gap-1 !rounded-full p-1" role="radiogroup" aria-label={tr("شكل منطقة الكتابة")}>
      <button
        type="button"
        role="radio"
        aria-checked={!on}
        onClick={() => onChange(false)}
        className={clsx("v3-tap flex min-h-[40px] items-center gap-1.5 rounded-full px-3.5 text-sm transition-colors", !on ? "bg-white/[0.1] font-bold text-[var(--ws-c-text)]" : "text-[var(--ws-c-muted)]")}
      >
        <Moon size={15} aria-hidden />
        {tr("داكن")}
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={on}
        onClick={() => onChange(true)}
        className={clsx("v3-tap flex min-h-[40px] items-center gap-1.5 rounded-full px-3.5 text-sm transition-colors", on ? "bg-[#EADBBE] font-bold text-[#3B2A1E]" : "text-[var(--ws-c-muted)]")}
      >
        <Sun size={15} aria-hidden />
        {tr("وضع الورقة")}
      </button>
    </div>
  );
}
