import clsx from "clsx";
import { isEn, setLang } from "../../lib/i18n";

/** زر تبديل اللغة: يطلع اللغة الثانية (EN بالعربي، «ع» بالإنجليزي). التبديل يعيد تحميل الصفحة */
export default function LangToggle({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => setLang(isEn ? "ar" : "en")}
      title={isEn ? "التبديل للعربية" : "Switch to English"}
      aria-label={isEn ? "التبديل للعربية" : "Switch to English"}
      lang={isEn ? "ar" : "en"}
      className={clsx(
        "flex h-[38px] min-w-[38px] items-center justify-center rounded-full border border-brand-100/60 bg-paper/40 px-2.5 text-xs font-bold text-brand-950/70 hover:bg-surface-muted",
        className,
      )}
    >
      {isEn ? "ع" : "EN"}
    </button>
  );
}
