import { Link } from "react-router-dom";
import { Lock, Wand2 } from "lucide-react";
import { teamMonthlyTotal } from "../lib/plans";
import { useTeamRoster } from "../hooks/useTeamRoster";
import { tr, trx } from "../lib/i18n";

/** بطاقة "المساعد مقفل" — تظهر بدل أدوات الذكاء الاصطناعي لفريق قديم على باقة Basic
    بعد انتهاء التجربة. من 2026-11-19 الاشتراك شامل: أول دفعة تفتح المساعد (الويبهوك يثبّت plan='ai').
    القفل الحقيقي بالسيرفر؛ هذي بس عشان الفريق يفهم كيف يفتحها. */
export default function AiLockedCard({ feature }: { feature: string }) {
  const { roster } = useTeamRoster();
  const price = teamMonthlyTotal(roster.length || 1);

  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border border-amber-accent-300/40 bg-gradient-to-b from-amber-accent-50/60 to-transparent p-6 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-accent-100 text-amber-accent-700">
        <Lock size={18} />
      </span>
      <p className="font-display text-base font-extrabold text-brand-950">{trx("{0} ضمن اشتراك Wesync", feature)}</p>
      <p className="max-w-sm text-sm text-brand-950/55">{trx("الاشتراك صار شامل كل شي: {0} ريال شهريًا للفريق كامل (أو سنوي بشهرين مجانًا) يفتح ويسي والبحث العلمي وتحسين الصياغة والصوت الطبيعي.", price)}</p>
      <Link
        to="/pricing"
        className="inline-flex items-center gap-1.5 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-600"
      >
        <Wand2 size={14} />
        {tr("شوفوا الاشتراك")}
      </Link>
    </div>
  );
}
