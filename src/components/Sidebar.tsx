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
  Compass,
  FlaskConical,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import clsx from "clsx";
import { useAuth } from "../context/AuthContext";
import { researchStages } from "../data/mockData";
import { getResearcherTitle } from "../lib/identity";
import { isFemaleUser } from "../lib/gender";
import Avatar from "./ui/Avatar";
import Logo from "./Logo";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

const navGroups: { label: string | null; items: NavItem[] }[] = [
  {
    label: null,
    items: [{ to: "/", label: "الرئيسية", icon: LayoutDashboard, end: true }],
  },
  {
    label: "البحث",
    items: [
      { to: "/proposal", label: "المقترح البحثي", icon: BookOpenText },
      { to: "/literature-review", label: "مراجعة الأدبيات", icon: BookMarked },
      { to: "/methodology", label: "المنهجية", icon: FlaskConical },
      { to: "/evidence", label: "مكتبة الأدلة", icon: Library },
    ],
  },
  {
    label: "العمل والفريق",
    items: [
      { to: "/tasks", label: "مهامي", icon: ListChecks },
      { to: "/team", label: "الفريق", icon: Users },
      { to: "/timeline", label: "الجدول الزمني", icon: ListTree },
      { to: "/fieldwork", label: "الميدان", icon: MapPinned },
    ],
  },
  {
    label: "أخرى",
    items: [
      { to: "/files", label: "الملفات", icon: FolderClosed },
      { to: "/calendar", label: "التقويم", icon: CalendarDays },
      { to: "/story", label: "قصة بحثك", icon: Sparkles },
    ],
  },
];

export default function Sidebar({
  open = false,
  onClose,
}: {
  open?: boolean;
  onClose?: () => void;
}) {
  const { currentUser, isSuperAdmin, logout } = useAuth();

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={clsx(
          "fixed inset-y-0 start-0 z-40 flex h-screen w-72 shrink-0 flex-col border-e border-brand-100/70 bg-paper transition-transform duration-300 print:hidden md:static md:z-auto md:w-64 md:translate-x-0",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex items-center gap-2.5 px-6 py-6">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center">
            <span className="absolute inset-[-6px] rounded-full bg-amber-accent-400/20 blur-md animate-pulse" />
            <span className="absolute inset-[-2px] rounded-full ring-1 ring-amber-accent-400/40" />
            <Logo size={40} />
          </div>
          <span className="font-display text-lg font-extrabold tracking-tight text-brand-950">
            StudySync
          </span>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3">
          {navGroups.map((group, gi) => (
            <div key={group.label ?? `group-${gi}`} className={gi > 0 ? "mt-3" : undefined}>
              {group.label && (
                <p className="mb-1 px-3 text-[11px] font-bold tracking-wide text-brand-950/35">
                  {group.label}
                </p>
              )}
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={onClose}
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
            </div>
          ))}

          <div className="my-2 border-t border-brand-100/70" />

          <NavLink
            to="/guide"
            onClick={onClose}
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

          {isSuperAdmin && (
            <NavLink
              to="/admin/subscriptions"
              onClick={onClose}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-colors",
                  isActive
                    ? "bg-brand-700 text-white shadow-sm shadow-brand-700/30"
                    : "text-brand-700 hover:bg-brand-50",
                )
              }
            >
              <ShieldCheck size={18} />
              إدارة الاشتراكات
            </NavLink>
          )}
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
              {getResearcherTitle(researchStages, isFemaleUser(currentUser)).ar}
            </p>
          </div>
        )}
      </aside>
    </>
  );
}
