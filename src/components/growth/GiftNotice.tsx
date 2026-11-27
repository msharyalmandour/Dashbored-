import { useState } from "react";
import { HeartHandshake, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTeamRoster } from "../../hooks/useTeamRoster";
import { useTeamPayments } from "../../hooks/useTeamPayments";
import { tr } from "../../lib/i18n";

/** «ادفع عن صاحبك»: لو زميل دفع حصتك خلال آخر 7 أيام، تطلع لك بطاقة شكر صغيرة (مرة لكل دفعة).
    الصياغة بدون فعل مذكّر/مؤنث: «حصتك مدفوعة من نورة 💛». */
const KEY = (at: string) => `wesync.gift.seen.${at}`;

export default function GiftNotice() {
  const { currentUser, mode } = useAuth();
  const { roster } = useTeamRoster();
  const { giftsToMe } = useTeamPayments(roster.map((m) => m.id), currentUser?.id);
  const [, force] = useState(0);
  if (mode !== "supabase" || !currentUser) return null;
  const gift = giftsToMe.find((g) => {
    try {
      return localStorage.getItem(KEY(g.created_at)) !== "1";
    } catch {
      return true;
    }
  });
  if (!gift) return null;
  const payer = roster.find((m) => m.id === gift.paid_by);
  const close = () => {
    try {
      localStorage.setItem(KEY(gift.created_at), "1");
    } catch {
      // التخزين ممنوع
    }
    force((n) => n + 1);
  };
  return (
    <section className="gs-seats" role="status">
      <span className="gs-slot" aria-hidden>
        <HeartHandshake size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <b className="block text-[15px] text-[#f4f0ec]">{tr("حصتك مدفوعة من {0} 💛", payer?.name?.split(" ")[0] ?? tr("زميلك"))}</b>
        <span className="block text-[13px] text-[#b8ada2]">{tr("اشتراك الفريق تمدد بنصيبك. الشكر بالمحادثة يفرق 🙏")}</span>
      </div>
      <button type="button" className="gs-icon" onClick={close} aria-label={tr("إغلاق")}>
        <X size={16} aria-hidden />
      </button>
    </section>
  );
}
