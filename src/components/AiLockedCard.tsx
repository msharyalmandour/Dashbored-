import { Link } from "react-router-dom";
import { Lock, Wand2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { aiAddonPrice } from "../lib/plans";
import { useTeamRoster } from "../hooks/useTeamRoster";
import { tr, trx } from "../lib/i18n";

/** بطاقة "هذي الميزة بباقة AI" — تظهر بدل أدوات الذكاء الاصطناعي لفريق على
    باقة Basic بعد انتهاء التجربة. القفل الحقيقي بالسيرفر (ai-assist)؛ هذي فقط
    عشان الفريق يفهم ليش الأداة مقفلة وكيف يفتحها. */
export default function AiLockedCard({ feature }: { feature: string }) {
  const { team, isLeader } = useAuth();
  const { roster } = useTeamRoster();
  const price = aiAddonPrice(roster.length || 1, team?.isFounder ?? false);

  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border border-amber-accent-300/40 bg-gradient-to-b from-amber-accent-50/60 to-transparent p-6 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-accent-100 text-amber-accent-700">
        <Lock size={18} />
      </span>
      <p className="font-display text-base font-extrabold text-brand-950">{trx("{0} ضمن باقة AI", feature)}</p>
      <p className="max-w-sm text-sm text-brand-950/55">{trx("فريقكم الحين بدون المساعد الذكي. إضافته بـ{0} ريال شهريًا للفريق كامل تفتح المساعد البحثي ووكيل البحث العلمي وتحسين الصياغة والصوت الطبيعي.", price)}</p>
      <Link
        to="/pricing"
        className="inline-flex items-center gap-1.5 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-600"
      >
        <Wand2 size={14} />
        {isLeader ? tr("أضيفوا المساعد الذكي") : tr("شوفوا الباقات")}
      </Link>
      {!isLeader && (
        <p className="text-[11px] text-brand-950/40">{tr("تغيير الباقة من قائدة الفريق فقط.")}</p>
      )}
    </div>
  );
}
