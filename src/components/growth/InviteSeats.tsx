import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Check, Link2, MessageCircle, Plus, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTeamRoster } from "../../hooks/useTeamRoster";
import { publicBase } from "../../lib/publicUrl";
import { tr } from "../../lib/i18n";
import Avatar from "../ui/Avatar";

/* «مقاعد فريقكم»: لين يصير الفريق 3 أو أكثر، شريط صغير فوق كل صفحة فيه المقاعد الفاضية + واتساب.
   السبب (أرقام 2026-11-19): 5 من 7 فرق فيها شخص واحد — الدعوة كانت بصفحة الفريق بس.
   ما يطلع بالرئيسية (فيها «الجاي لكم» = ادعوا) ولا بصفحة الفريق (فيها كرت الدعوة). يتسكّر ليوم. */

const TARGET = 4;
const dayKey = (teamId: string) => `wesync.seats.hidden.${teamId}.${new Date().toISOString().slice(0, 10)}`;

export default function InviteSeats() {
  const { team, currentUser, mode } = useAuth();
  const { roster, loading } = useTeamRoster();
  const { pathname } = useLocation();
  const [hidden, setHidden] = useState(() => {
    try {
      return team ? localStorage.getItem(dayKey(team.id)) === "1" : false;
    } catch {
      return false;
    }
  });
  const [copied, setCopied] = useState(false);

  if (mode !== "supabase" || !team || !currentUser || loading || hidden) return null;
  if (roster.length >= 3 || pathname === "/" || pathname === "/team") return null;

  const link = `${publicBase()}#/login?team=${team.id}`;
  const wa = `https://wa.me/?text=${encodeURIComponent(tr("انضموا لفريق بحثنا على Wesync عشان نشتغل على البحث مع بعض: {0}", link))}`;
  const empty = Math.max(1, TARGET - roster.length);
  const close = () => {
    try {
      localStorage.setItem(dayKey(team.id), "1");
    } catch {
      // التخزين ممنوع: يتسكّر لهالجلسة بس
    }
    setHidden(true);
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // المتصفح رفض النسخ
    }
  };

  return (
    <section className="gs-seats" aria-labelledby="gs-seats-h">
      <span className="gs-faces" aria-hidden>
        {roster.slice(0, 2).map((m) => (
          <Avatar key={m.id} initials={m.initials} name={m.name} avatar={m.avatar} px={34} />
        ))}
        {Array.from({ length: empty }, (_, i) => (
          <span key={i} className="gs-slot">
            <Plus size={13} />
          </span>
        ))}
      </span>
      <div className="min-w-0 flex-1">
        <b id="gs-seats-h" className="block text-[15px] text-[#f4f0ec]">
          {roster.length <= 1 ? tr("بحثكم لحالكم؟ فريقكم ينتظركم") : tr("فريقكم {0} من {1}", roster.length, TARGET)}
        </b>
        <span className="block text-[13px] text-[#b8ada2]">{tr("رابط واحد بالقروب، وكل من يفتحه يدخل فريقكم على طول.")}</span>
      </div>
      <a href={wa} target="_blank" rel="noopener noreferrer" className="gs-btn">
        <MessageCircle size={16} aria-hidden />
        {tr("ادعوهم بواتساب")}
      </a>
      <button type="button" className="gs-icon" onClick={copy} aria-label={copied ? tr("انتسخ الرابط ✓") : tr("انسخوا الرابط")}>
        {copied ? <Check size={16} aria-hidden /> : <Link2 size={16} aria-hidden />}
      </button>
      <button type="button" className="gs-icon" onClick={close} aria-label={tr("أخفوه اليوم")}>
        <X size={16} aria-hidden />
      </button>
    </section>
  );
}
