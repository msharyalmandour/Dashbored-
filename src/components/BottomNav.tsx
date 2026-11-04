import { NavLink } from "react-router-dom";
import { Check, House, MessagesSquare, PenLine } from "lucide-react";
import clsx from "clsx";
import AgentWave from "./ui/AgentWave";
import { openAgent } from "../lib/agentBus";
import { tr } from "../lib/i18n";
import { useChatUnread } from "../hooks/useTeamChat";

/** شريط التبويبات بالجوال فقط (زجاج عائم): الرئيسية · أكتب · [الوكيل بالنص] · مهامي · المحادثة.
    زر الوكيل كرة برتقالية فوقها موجة صوت — القائمة الكاملة من زر القائمة بالشريط العلوي. الديسكتوب يبقى على القائمة الجانبية. */
export default function BottomNav() {
  const unread = useChatUnread();
  const tab = (to: string, label: string, Icon: typeof House, end?: boolean, badge = 0) => (
    <NavLink to={to} end={end} className={({ isActive }) => clsx("hg-tab", isActive && "on")} aria-label={badge ? `${label} · ${tr("{0} رسائل جديدة", badge)}` : undefined}>
      <span className="hg-ti relative">
        <Icon size={21} strokeWidth={1.7} aria-hidden />
        {badge > 0 && (
          <span className="tc-badge" aria-hidden>
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </span>
      {label}
    </NavLink>
  );
  return (
    <nav className="hg-tabbar print:hidden md:hidden" aria-label={tr("التنقل")}>
      {tab("/", tr("الرئيسية"), House, true)}
      {tab("/proposal", tr("أكتب"), PenLine)}
      <button type="button" className="hg-fab" onClick={() => openAgent()} aria-label={tr("وكيل Wesync")}>
        <AgentWave size={26} color="#1A0802" />
      </button>
      {tab("/tasks", tr("مهامي"), Check)}
      {tab("/chat", tr("المحادثة"), MessagesSquare, false, unread)}
    </nav>
  );
}
