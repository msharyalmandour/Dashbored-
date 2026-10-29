import { NavLink } from "react-router-dom";
import { Check, House, PenLine, Users } from "lucide-react";
import clsx from "clsx";
import AgentWave from "./ui/AgentWave";
import { openAgent } from "../lib/agentBus";
import { tr } from "../lib/i18n";

/** شريط التبويبات بالجوال فقط (زجاج عائم): الرئيسية · أكتب · [الوكيل بالنص] · مهامي · الفريق.
    زر الوكيل كرة برتقالية فوقها موجة صوت — القائمة الكاملة من زر القائمة بالشريط العلوي. الديسكتوب يبقى على القائمة الجانبية. */
export default function BottomNav() {
  const tab = (to: string, label: string, Icon: typeof House, end?: boolean) => (
    <NavLink to={to} end={end} className={({ isActive }) => clsx("hg-tab", isActive && "on")}>
      <span className="hg-ti">
        <Icon size={21} strokeWidth={1.7} aria-hidden />
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
      {tab("/team", tr("الفريق"), Users)}
    </nav>
  );
}
