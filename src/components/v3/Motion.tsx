import { useEffect, useState } from "react";
import { tr } from "../../lib/i18n";

/* قطع الحركة المشتركة لصفحات v3 (أكتب · مهامي · أجمع وأحلّل). الحركة نفسها بـ styles/motion.css */

/** علامة الصح — تنرسم لما تكون داخل .v3-saved */
export const CheckSvg = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12.5l4.5 4.5L19 7" />
  </svg>
);

/** نقاط «يكتب…» (1.2s، فرق 150ms) — تنعرض بس والوكيل شغّال */
export const Typing = () => (
  <span className="v3-typing" aria-hidden="true">
    <i />
    <i />
    <i />
  </span>
);

/** «انحفظ ✓» صغيرة تطلع لحظة الحفظ وتختفي بعد ٤ ثواني. at = وقت آخر حفظ (أو null) */
export function SavedTick({ at }: { at: number | null }) {
  const [hiddenAt, setHiddenAt] = useState<number | null>(null);
  useEffect(() => {
    if (!at) return;
    const t = setTimeout(() => setHiddenAt(at), 4000);
    return () => clearTimeout(t);
  }, [at]);
  if (!at || hiddenAt === at) return null;
  return (
    <span key={at} className="v3-saved text-xs font-bold text-[#7FE0A6]" role="status">
      {tr("انحفظ")}
      <CheckSvg size={12} />
    </span>
  );
}
