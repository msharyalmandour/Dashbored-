import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
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
  CreditCard,
  FlaskConical,
  ShieldCheck,
  Sparkles,
  NotebookPen,
  FileCheck2,
  Search,
  BarChart3,
  ClipboardList,
  ClipboardPen,
  MessageSquareText,
  CalendarClock,
  GraduationCap,
  Ruler,
  FileDown,
  BookA,
  Check,
  ChevronDown,
  type LucideIcon,
} from "lucide-react";
import clsx from "clsx";
import { useAuth } from "../context/AuthContext";
import { researchStages } from "../data/mockData";
import { getResearcherTitle } from "../lib/identity";
import { isFemaleUser } from "../lib/gender";
import { useResearchStages } from "../hooks/useResearchStages";
import { getCurrentStage } from "../lib/progress";
import type { StageKey } from "../data/types";
import Avatar from "./ui/Avatar";
import Logo from "./Logo";
import IdeaButton from "./IdeaButton";
import InstallAppButton from "./InstallAppButton";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

interface NavGroup {
  label: string | null;
  /** مراحل الرحلة اللي تغطيها المجموعة — تحدد «أنتم هنا / خلصت / جاية» */
  stages?: StageKey[];
  /** مطوية افتراضيًا ما لم يكن فيها الصفحة المفتوحة */
  collapsed?: boolean;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: null,
    items: [{ to: "/", label: "الرئيسية", icon: LayoutDashboard, end: true }],
  },
  {
    label: "١. أفهم موضوعي",
    stages: ["topic", "literature-review"],
    items: [
      { to: "/research-search", label: "وكيل البحث العلمي", icon: Search },
      { to: "/evidence", label: "مكتبة الأدلة", icon: Library },
      { to: "/literature-review", label: "مراجعة الأدبيات", icon: BookMarked },
    ],
  },
  {
    label: "٢. أكتب وأخطط",
    stages: ["proposal", "research-gap", "research-questions", "methodology"],
    items: [
      { to: "/proposal", label: "المقترح البحثي", icon: BookOpenText },
      { to: "/methodology", label: "المنهجية", icon: FlaskConical },
      { to: "/ethical-approval", label: "الموافقة الأخلاقية", icon: FileCheck2 },
      { to: "/feedback", label: "ملاحظات المشرف", icon: MessageSquareText },
    ],
  },
  {
    label: "٣. أجمع وأحلل",
    stages: ["data-collection", "analysis"],
    items: [
      { to: "/study-kit", label: "الاستبيان والموافقات", icon: ClipboardList },
      { to: "/surveys", label: "منشئ الاستبيان", icon: ClipboardPen },
      { to: "/tools-library", label: "مكتبة أدوات القياس", icon: Ruler },
      { to: "/fieldwork", label: "الميدان", icon: MapPinned },
      { to: "/stats", label: "استوديو الإحصاء", icon: BarChart3 },
    ],
  },
  {
    label: "٤. أسلّم",
    stages: ["writing", "final-submission"],
    items: [
      { to: "/planner", label: "مخطط الموعد", icon: CalendarClock },
      { to: "/viva", label: "تدريب المناقشة", icon: GraduationCap },
      { to: "/proposal/export", label: "تصدير المقترح", icon: FileDown },
    ],
  },
  {
    label: "الفريق",
    items: [
      { to: "/tasks", label: "مهامي", icon: ListChecks },
      { to: "/team", label: "الفريق", icon: Users },
      { to: "/timeline", label: "الجدول الزمني", icon: ListTree },
      { to: "/meeting-minutes", label: "محاضر الاجتماعات", icon: NotebookPen },
      { to: "/calendar", label: "التقويم", icon: CalendarDays },
      { to: "/files", label: "الملفات", icon: FolderClosed },
    ],
  },
  {
    label: "أخرى",
    collapsed: true,
    items: [
      { to: "/glossary", label: "قاموس المصطلحات", icon: BookA },
      { to: "/story", label: "قصة بحثك", icon: Sparkles },
      { to: "/pricing", label: "الباقات والاشتراك", icon: CreditCard },
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
  const { pathname } = useLocation();
  const { stages } = useResearchStages();
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  const currentStage = getCurrentStage(stages);

  const isHere = (to: string) => (to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(`${to}/`));
  const groupState = (g: NavGroup): "done" | "current" | "upcoming" | null => {
    if (!g.stages || stages.length === 0) return null;
    const mine = stages.filter((st) => g.stages!.includes(st.stageKey));
    if (mine.length > 0 && mine.every((st) => st.status === "done")) return "done";
    if (currentStage && g.stages.includes(currentStage.stageKey)) return "current";
    return "upcoming";
  };
  const isExpanded = (g: NavGroup) => {
    if (g.label === null) return true;
    const manual = toggled[g.label];
    if (manual !== undefined) return manual;
    if (g.items.some((it) => isHere(it.to))) return true;
    if (g.stages) return groupState(g) === "current" || groupState(g) === null;
    return !g.collapsed;
  };

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
          "fixed inset-y-0 start-0 z-40 flex h-screen w-72 shrink-0 flex-col border-e border-brand-100/50 bg-paper/55 backdrop-blur-2xl backdrop-saturate-150 transition-transform duration-300 print:hidden md:static md:z-auto md:w-64 md:translate-x-0",
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
            Wesync
          </span>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3">
          {navGroups.map((group, gi) => {
            const state = groupState(group);
            const expanded = isExpanded(group);
            return (
              <div key={group.label ?? `group-${gi}`} className={gi > 0 ? "mt-3" : undefined}>
                {group.label && (
                  <button
                    onClick={() => setToggled((t) => ({ ...t, [group.label!]: !expanded }))}
                    aria-expanded={expanded}
                    className="mb-1 flex w-full items-center gap-2 rounded-full px-3 py-1 text-start hover:bg-surface-muted/70"
                  >
                    <span className={clsx("flex-1 text-[11px] font-bold tracking-wide", state === "current" ? "text-brand-600" : "text-brand-950/35")}>
                      {group.label}
                    </span>
                    {state === "current" && (
                      <span className="rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-extrabold text-white">أنتم هنا</span>
                    )}
                    {state === "done" && (
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-500/15 text-brand-600" title="خلصتوا هالجزء">
                        <Check size={11} />
                      </span>
                    )}
                    <ChevronDown size={13} className={clsx("text-brand-950/30 transition-transform", expanded && "rotate-180")} />
                  </button>
                )}
                {expanded &&
                  group.items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      onClick={onClose}
                      className={({ isActive }) =>
                        clsx(
                          "flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors",
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
            );
          })}

          <div className="my-2 border-t border-brand-100/70" />

          <NavLink
            to="/guide"
            onClick={onClose}
            className={({ isActive }) =>
              clsx(
                "flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors",
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
                  "flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors",
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
            <div className="glass-panel flex items-center gap-3 rounded-full border border-brand-100/50 bg-surface-muted/60 p-2 pe-3">
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
                className="rounded-full p-2 text-brand-950/40 hover:bg-paper hover:text-brand-700"
              >
                <LogOut size={16} />
              </button>
            </div>
            <IdeaButton />
            <InstallAppButton variant="light" className="mt-2 w-full" />
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
