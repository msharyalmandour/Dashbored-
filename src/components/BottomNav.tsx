import { NavLink } from "react-router-dom";
import { Compass, LayoutDashboard, ListChecks, Menu, Users } from "lucide-react";
import clsx from "clsx";
import { useResearchStages } from "../hooks/useResearchStages";
import { getCurrentStage } from "../lib/progress";
import { STAGE_ACTION } from "../lib/nextSteps";

/** شريط تنقل سفلي بالجوال فقط — أهم ٤ صفحات + القائمة الكاملة. خانة «مرحلتكم» تفتح شغل المرحلة الحالية. الديسكتوب يبقى على القائمة الجانبية. */
export default function BottomNav({ onMenu }: { onMenu: () => void }) {
  const { stages } = useResearchStages();
  const current = getCurrentStage(stages);
  const stageTo = current ? STAGE_ACTION[current.stageKey]?.to : undefined;
  const items = [
    { to: "/", label: "الرئيسية", icon: LayoutDashboard, end: true },
    { to: "/tasks", label: "مهامي", icon: ListChecks },
    { to: stageTo ?? "/research-search", label: "مرحلتكم", icon: Compass },
    { to: "/team", label: "الفريق", icon: Users },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex items-stretch justify-around border-t border-brand-100/60 bg-paper/85 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-2xl print:hidden md:hidden">
      {items.map((it) => (
        <NavLink
          key={it.to}
          to={it.to}
          end={it.end}
          className={({ isActive }) =>
            clsx("flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-bold", isActive ? "text-brand-500" : "text-brand-950/50")
          }
        >
          <it.icon size={20} />
          {it.label}
        </NavLink>
      ))}
      <button onClick={onMenu} className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-bold text-brand-950/50">
        <Menu size={20} />
        القائمة
      </button>
    </nav>
  );
}
