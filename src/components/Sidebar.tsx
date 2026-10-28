import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Check, ChevronDown, Compass, LogOut, ShieldCheck } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "../context/AuthContext";
import { researchStages } from "../data/mockData";
import { getResearcherTitle } from "../lib/identity";
import { isFemaleUser } from "../lib/gender";
import { useResearchStages } from "../hooks/useResearchStages";
import { getCurrentStage } from "../lib/progress";
import { homeSection, isPathIn, journeySections, morePages, workSections, type NavSection } from "../lib/navSections";
import Avatar from "./ui/Avatar";
import Logo from "./Logo";
import IdeaButton from "./IdeaButton";
import InstallAppButton from "./InstallAppButton";
import { tr } from "../lib/i18n";

const linkBase = "flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors";
const linkOn = "bg-brand-500 text-white shadow-sm shadow-brand-500/30";
const linkOff = "text-brand-950/55 hover:bg-surface-muted hover:text-brand-900";

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
  const [moreOpen, setMoreOpen] = useState<boolean | null>(null);
  const currentStage = getCurrentStage(stages);

  const sectionState = (sec: NavSection): "done" | "current" | null => {
    if (!sec.stages || stages.length === 0) return null;
    const mine = stages.filter((st) => sec.stages!.includes(st.stageKey));
    if (mine.length > 0 && mine.every((st) => st.status === "done")) return "done";
    if (currentStage && sec.stages.includes(currentStage.stageKey)) return "current";
    return null;
  };

  const moreHere = morePages.some((m) => isPathIn(pathname, m.to));
  const moreExpanded = moreOpen ?? moreHere;

  const renderSection = (sec: NavSection) => {
    const active = sec.pages.some((pg) => isPathIn(pathname, pg.to));
    const state = sectionState(sec);
    return (
      <NavLink
        key={sec.id}
        to={active ? pathname : sec.pages[0].to}
        onClick={onClose}
        className={clsx(linkBase, active ? linkOn : linkOff)}
      >
        <sec.icon size={18} />
        <span className="flex-1">{sec.label}</span>
        {state === "current" && (
          <span className={clsx("rounded-full px-2 py-0.5 text-[10px] font-extrabold", active ? "bg-black/25 text-white" : "bg-brand-500 text-white")}>{tr("أنتم هنا")}</span>
        )}
        {state === "done" && (
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-500/15 text-brand-600" title={tr("خلصتوا هالجزء")}>
            <Check size={11} />
          </span>
        )}
      </NavLink>
    );
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
          open ? "translate-x-0" : "translate-x-full ltr:-translate-x-full md:ltr:translate-x-0",
        )}
      >
        <div className="flex items-center gap-2.5 px-6 py-6">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center">
            <span className="absolute inset-[-6px] rounded-full bg-amber-accent-400/20 blur-md" />
            <span className="absolute inset-[-2px] rounded-full ring-1 ring-amber-accent-400/40" />
            <Logo size={40} />
          </div>
          <span className="font-display text-lg font-extrabold tracking-tight text-brand-950">
            Wesync
          </span>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3">
          <NavLink
            to={homeSection.to}
            end
            onClick={onClose}
            className={({ isActive }) => clsx(linkBase, isActive ? linkOn : linkOff)}
          >
            <homeSection.icon size={18} />
            {homeSection.label}
          </NavLink>

          <div aria-hidden className="gold-groove mx-3 !my-3" />
          <p className="px-4 pb-1 text-[11px] font-bold tracking-wide text-amber-accent-400/70">{tr("رحلة البحث")}</p>
          {journeySections.map(renderSection)}

          <div aria-hidden className="gold-groove mx-3 !my-3" />
          <p className="px-4 pb-1 text-[11px] font-bold tracking-wide text-amber-accent-400/70">{tr("شغل الفريق")}</p>
          {workSections.map(renderSection)}

          <div aria-hidden className="gold-groove mx-3 !my-3" />
          <button
            onClick={() => setMoreOpen(!moreExpanded)}
            aria-expanded={moreExpanded}
            className="flex w-full items-center gap-2 rounded-full px-4 py-1.5 text-start text-[11px] font-bold tracking-wide text-amber-accent-400/70 hover:bg-surface-muted/70"
          >
            <span className="flex-1">{tr("المزيد")}</span>
            <ChevronDown size={13} className={clsx("transition-transform", moreExpanded && "rotate-180")} />
          </button>
          {moreExpanded &&
            morePages.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) => clsx(linkBase, isActive ? linkOn : linkOff)}
              >
                <item.icon size={18} />
                {item.label}
              </NavLink>
            ))}

          <div aria-hidden className="gold-groove mx-3 !my-3" />

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
            <Compass size={18} />{tr("دليل الطالب")}</NavLink>

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
              <ShieldCheck size={18} />{tr("إدارة الاشتراكات")}</NavLink>
          )}
        </nav>

        {currentUser && (
          <div className="p-4 pt-0"><div aria-hidden className="gold-groove mb-4" />
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
                title={tr("تسجيل الخروج")}
                className="rounded-full p-2 text-brand-950/40 hover:bg-paper hover:text-brand-700"
              >
                <LogOut size={16} />
              </button>
            </div>
            <IdeaButton />
            <InstallAppButton variant="light" className="mt-2 w-full" />
            <p className="mt-2 flex items-center gap-1.5 px-1 text-xs font-semibold text-brand-600">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-brand-500" />
              {getResearcherTitle(researchStages, isFemaleUser(currentUser)).ar}
            </p>
          </div>
        )}
      </aside>
    </>
  );
}
