import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, GraduationCap } from "lucide-react";
import { useAcademy } from "../../hooks/useAcademy";
import { tr } from "../../lib/i18n";

/** سطر هادي بالرئيسية يوصّل لأكاديمية Wesync — يختفي لما تخلص كل الدروس */
export default function LearnStrip({ style }: { style?: React.CSSProperties }) {
  const { loaded, refresh, done, total, next } = useAcademy();
  useEffect(() => {
    if (!loaded) refresh();
  }, [loaded, refresh]);
  if (!loaded || !next || done >= total) return null;
  const pct = Math.round((done / total) * 100);
  return (
    <Link to="/learn" className="hg-card mb-2.5 flex min-h-[64px] items-center gap-3 !py-3 lg:mb-[18px]" style={style} aria-label={tr("تعلّموا Wesync: {0} من {1}. الدرس الجاي: {2}", done, total, next.title)}>
      <span className="ac-ic" aria-hidden>
        <GraduationCap size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-extrabold text-[#F2EBE3]">
          {tr("تعلّموا Wesync")} <span className="text-[13px] font-bold text-[#ABA095]" dir="ltr">· {done}/{total}</span>
        </span>
        <span className="block truncate text-[13px] text-[#ABA095]">{tr("الدرس الجاي: {0}", next.title)}</span>
        <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-white/10" aria-hidden>
          <span className="block h-full rounded-full bg-gradient-to-l from-[#FFC777] to-[#FF6A00]" style={{ width: `${Math.max(4, pct)}%` }} />
        </span>
      </span>
      <ChevronLeft size={20} className="shrink-0 text-[#ABA095] ltr:rotate-180" aria-hidden />
    </Link>
  );
}
