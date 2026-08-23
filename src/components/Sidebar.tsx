import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpenText,
  BookMarked,
  ListChecks,
  Users,
  MapPinned,
  Library,
  FolderClosed,
  CalendarDays,
  ListTree,
  LogOut,
  Stethoscope,
  Compass,
  FlaskConical,
  Sparkles,
} from "lucide-react";
import clsx from "clsx";
import { useAuth } from "../context/AuthContext";
import { researchStages } from "../data/mockData";
import { getResearcherTitle } from "../lib/identity";
import Avatar from "./ui/Avatar";

const navItems = [
  { to: "/", label: "الرئيسية", icon: LayoutDashboard, end: true },
  { to: "/proposal", label: "المقترح البحثي", icon: BookOpenText },
  { to: "/literature-review", label: "مراجعة الأدبيات", icon: BookMarked },
  { to: "/methodology", label: "المنهجية", icon: FlaskConical },
  { to: "/tasks", label: "مهامي", icon: ListChecks },
  { to: "/evidence", label: "مكتبة الأدلة", icon: Library },
  { to: "/team", label: "الفريق", icon: Users },
  { to: "/timeline", label: "الجدول الزمني", icon: ListTree },
  { to: "/fieldwork", label: "الميدان", icon: MapPinned },
  { to: "/files", label: "الملفات", icon: FolderClosed },
  { to: "/calendar", label: "التقويم", icon: CalendarDays },
  { to: "/story", label: "قصة بحثك", icon: Sparkles },
];

export default function Sidebar() {
  const { currentUser, logout } = useAuth();

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-e border-brand-100/70 bg-paper">
      <div className="flex items-center gap-2.5 px-6 py-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-sm shadow-brand-950/20">
          <Stethoscope size={19} />
        </div>
        <span className="font-display text-lg font-extrabold tracking-tight text-brand-950">
          NURSYNC
        </span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              clsx(
                "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-colors",
                isActive
                  ? "bg-brand-500 text-white shadow-sm shadow-brand-500/30"
                  : "text-brand-950/55 hover:bg-surface-muted hover:text-brand-900",
              )
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}

        <div className="my-2 border-t border-brand-100/70" />

        <NavLink
          to="/guide"
          className={({ isActive }) =>
            clsx(
              "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-colors",
              isActive
                ? "bg-amber-accent-400 text-white shadow-sm shadow-amber-accent-400/30"
                : "text-amber-accent-600 hover:bg-amber-accent-50",
            )
          }
        >
          <Compass size={18} />
          دليل الطالب
        </NavLink>
      </nav>

      {currentUser && (
        <div className="border-t border-brand-100/70 p-4">
          <div className="flex items-center gap-3 rounded-2xl bg-surface-muted p-3">
            <Avatar initials={currentUser.initials} color={currentUser.color} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-brand-950">
                {currentUser.name}
              </p>
              <p className="truncate text-xs text-brand-950/50">{currentUser.title}</p>
            </div>
            <button
              onClick={logout}
              title="تسجيل الخروج"
              className="rounded-lg p-1.5 text-brand-950/40 hover:bg-paper hover:text-brand-700"
            >
              <LogOut size={16} />
            </button>
          </div>
          <p className="mt-2 flex items-center gap-1.5 px-1 text-xs font-semibold text-brand-600">
            <Sparkles size={12} />
            {getResearcherTitle(researchStages, currentUser.title.includes("ة")).ar}
          </p>
        </div>
      )}
    </aside>
  );
}
