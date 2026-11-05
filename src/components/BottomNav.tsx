import { NavLink } from "react-router-dom";
import { Check, House, MessagesSquare, PenLine } from "lucide-react";
import clsx from "clsx";
import { openAgent } from "../lib/agentBus";
import { tr } from "../lib/i18n";
import { useChatUnread } from "../hooks/useTeamChat";

/** شريط التبويبات بالجوال فقط (زجاج عائم): الرئيسية · أكتب · [الوكيل بالنص] · مهامي · المحادثة.
    زر الوكيل كرة برتقالية فوقها موجة صوت — القائمة الكاملة من زر القائمة بالشريط العلوي. الديسكتوب يبقى على القائمة الجانبية. */
export default function BottomNav() {
  const unread = useChatUnread();
  const tab = (to: string, label: string, Icon: typeof House, end?: boolean, badge = 0) => (
    <NavLink to={to} end={end} className={({ isActive }) => clsx("hg-tab", isActive && "on")} aria-label={badge ? `${label} · ${tr("{0} رسائل جديدة", badge)}` : undefined}>
      <span className="hg-ti">
        <Icon size={21} strokeWidth={1.7} aria-hidden />
      </span>
      {badge > 0 && (
        <span className="tc-badge !end-auto !top-0 ms-1 start-1/2" aria-hidden>
          {badge > 99 ? "99+" : badge}
        </span>
      )}
      {label}
    </NavLink>
  );
  return (
    <nav className="hg-tabbar print:hidden md:hidden" aria-label={tr("التنقل")}>
      {tab("/", tr("الرئيسية"), House, true)}
      {tab("/proposal", tr("أكتب"), PenLine)}
      <button type="button" className="hg-fab" data-learn="agent" onClick={() => openAgent()} aria-label={tr("وكيل Wesync")}>
        {/* موجة ثابتة (بدون حلقة حركة) */}
        <svg aria-hidden width="24" height="24" viewBox="0 0 26 26">
          <g fill="#FF9A3C">
            <rect x="4" y="10" width="3" height="6" rx="1.5" />
            <rect x="9.2" y="6" width="3" height="14" rx="1.5" />
            <rect x="14.4" y="3.5" width="3" height="19" rx="1.5" />
            <rect x="19.6" y="8.5" width="3" height="9" rx="1.5" />
          </g>
        </svg>
      </button>
      {tab("/tasks", tr("مهامي"), Check)}
      {tab("/chat", tr("المحادثة"), MessagesSquare, false, unread)}
    </nav>
  );
}
