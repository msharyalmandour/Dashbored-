import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpenText,
  ListChecks,
  Users,
  MapPinned,
  Library,
  FolderClosed,
  CalendarDays,
  ListTree,
  LogOut,
  Stethoscope,
} from "lucide-react";
import clsx from "clsx";
import { useAuth } from "../context/AuthContext";
import Avatar from "./ui/Avatar";

const navItems = [
  { to: "/", label: "الرئيسية", icon: LayoutDashboard, end: true },
  { to: "/plan", label: "خطة البحث", icon: BookOpenText },
  { to: "/tasks", label: "المهام", icon: ListChecks },
  { to: "/team", label: "الفريق", icon: Users },
  { to: "/timeline", label: "الجدول الزمني", icon: ListTree },
  { to: "/fieldwork", label: "الميدان", icon: MapPinned },
  { to: "/references", label: "المراجع", icon: Library },
  { to: "/files", label: "الملفات", icon: FolderClosed },
  { to: "/calendar", label: "التقويم", icon: CalendarDays },
];

export default function Sidebar() {
  const { currentUser, logout } = useAuth();

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-e border-brand-100 bg-white">
      <div className="flex items-center gap-2 px-6 py-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-white">
          <Stethoscope size={18} />
        </div>
        <span className="text-lg font-extrabold tracking-tight text-brand-950">
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
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-brand-50 text-brand-700"
                  : "text-brand-950/60 hover:bg-surface-muted hover:text-brand-900",
              )
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {currentUser && (
        <div className="border-t border-brand-100 p-4">
          <div className="flex items-center gap-3 rounded-xl bg-surface-muted p-3">
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
              className="rounded-lg p-1.5 text-brand-950/40 hover:bg-white hover:text-brand-700"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
