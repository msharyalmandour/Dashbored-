import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Check, CheckSquare, CircleHelp, Compass, CreditCard, Flag, GraduationCap, House, LogOut, MoreHorizontal, Search, ShieldCheck, Download, Volume2, VolumeX } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "../context/AuthContext";
import { useResearchStages } from "../hooks/useResearchStages";
import { useChatUnread } from "../hooks/useTeamChat";
import { useAcademy } from "../hooks/useAcademy";
import { useLandedBadges } from "../lib/landed";
import { isPathIn, journeySections, morePages, workSections, type NavSection } from "../lib/navSections";
import { isSoundEnabled, setSoundEnabled } from "../lib/sound";
import Avatar from "./ui/Avatar";
import IdeaButton from "./IdeaButton";
import InstallAppButton from "./InstallAppButton";
import NotificationsBell from "./NotificationsBell";
import ThemeSwitcher from "./ThemeSwitcher";
import LangToggle from "./ui/LangToggle";
import { tr } from "../lib/i18n";

/* القائمة الجانبية (HomeLux / TasksLux / MeetLux): لوحة زجاجية عائمة، الصفحة الحالية حبة كريمية + «أنتم هنا»،
   «مهامي» بند لحاله تحت شغل الفريق، وتحت: «تعلّموا Wesync n/16» + بطاقة الشخص (الجرس والإعدادات واللغة والصوت والمزيد).
   على الديسكتوب ما فيه شريط علوي — أدواته انتقلت لبطاقة الشخص. */

type Item = { id: string; to: string; label: string; icon: NavSection["icon"]; match: string[]; stages?: NavSection["stages"] };

/** «الفريق» بالقائمة ينقسم: مهامي (/tasks) بند لحاله، والفريق (/team + الجدول الزمني) */
function itemsOf(secs: NavSection[]): Item[] {
  const out: Item[] = [];
  for (const s of secs) {
    if (s.id === "team") {
      out.push({ id: "tasks", to: "/tasks", label: tr("مهامي"), icon: CheckSquare, match: ["/tasks"] });
      const rest = s.pages.filter((p) => p.to !== "/tasks");
      out.push({ id: "team", to: rest[0]?.to ?? "/team", label: s.label, icon: s.icon, match: rest.map((p) => p.to) });
    } else out.push({ id: s.id, to: s.pages[0].to, label: s.label, icon: s.icon, match: s.pages.map((p) => p.to), stages: s.stages });
  }
  return out;
}

export default function Sidebar({ open = false, onClose }: { open?: boolean; onClose?: () => void }) {
  const { currentUser, isSuperAdmin, logout, isLeader } = useAuth();
  const { pathname } = useLocation();
  const { stages } = useResearchStages();
  const unread = useChatUnread();
  const landed = useLandedBadges();
  const { done, total, loaded, refresh } = useAcademy();
  const [menu, setMenu] = useState(false);
  const [soundOn, setSoundOn] = useState(isSoundEnabled);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loaded) void refresh();
  }, [loaded, refresh]);
  useEffect(() => {
    if (!menu) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    const click = (e: MouseEvent) => menuRef.current && !menuRef.current.contains(e.target as Node) && setMenu(false);
    window.addEventListener("keydown", key);
    window.addEventListener("mousedown", click);
    return () => {
      window.removeEventListener("keydown", key);
      window.removeEventListener("mousedown", click);
    };
  }, [menu]);

  const stageDone = (it: Item) => {
    if (!it.stages || stages.length === 0) return false;
    const mine = stages.filter((st) => it.stages!.includes(st.stageKey));
    return mine.length > 0 && mine.every((st) => st.status === "done");
  };

  const link = (it: Item) => {
    const active = it.match.some((m) => isPathIn(pathname, m));
    const badge = landed[it.id] ?? 0;
    return (
      <NavLink key={it.id} data-nav-id={it.id} to={active ? pathname : it.to} onClick={onClose} aria-current={active ? "page" : undefined} className={clsx("lx-link", active && "on")}>
        <it.icon size={18} strokeWidth={1.8} aria-hidden />
        <span className="min-w-0 flex-1 truncate">{it.label}</span>
        {!!badge && (
          <span className="hd-badge" dir="ltr" aria-label={tr("{0} أشياء جديدة", badge)}>
            +{badge}
          </span>
        )}
        {it.id === "chat" && unread > 0 && !active && (
          <span className="lx-count" dir="ltr" aria-label={tr("{0} رسائل جديدة", unread)}>
            {unread > 99 ? "99+" : unread}
          </span>
        )}
        {active ? (
          <span className="lx-here">{tr("أنتم هنا")}</span>
        ) : (
          stageDone(it) && (
            <span className="lx-done" title={tr("خلصتوا هالجزء")}>
              <Check size={11} strokeWidth={3} />
            </span>
          )
        )}
      </NavLink>
    );
  };

  const home: Item = { id: "home", to: "/", label: tr("الرئيسية"), icon: House, match: [] };
  const homeActive = pathname === "/";
  const work = itemsOf(workSections);
  const extra = morePages.filter((p) => !p.hideInNav);

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={onClose} />}
      <aside className={clsx("lx-side print:hidden", open ? "translate-x-0" : "translate-x-full ltr:-translate-x-full md:translate-x-0 md:ltr:translate-x-0")}>
        <div className="flex items-center gap-2.5 px-3 pb-[18px] pt-1.5">
          <span aria-hidden className="lx-orb" />
          <b className="text-[21px] font-extrabold text-[#F2EBE3]" dir="ltr">
            Wesync
          </b>
        </div>

        <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto" aria-label={tr("التنقل")}>
          <NavLink to="/" end onClick={onClose} aria-current={homeActive ? "page" : undefined} className={clsx("lx-link", homeActive && "on")} data-nav-id="home">
            <home.icon size={18} strokeWidth={1.8} aria-hidden />
            <span className="flex-1">{home.label}</span>
            {homeActive && <span className="lx-here">{tr("أنتم هنا")}</span>}
          </NavLink>
          <NavLink to="/drop" onClick={onClose} data-learn="drop" className={({ isActive }) => clsx("lx-link", isActive && "on")}>
            {({ isActive }) => (
              <>
                <Download size={18} strokeWidth={1.8} aria-hidden />
                <span className="flex-1">{tr("ارموا أي شي")}</span>
                {isActive && <span className="lx-here">{tr("أنتم هنا")}</span>}
              </>
            )}
          </NavLink>

          <div className="lx-group">{tr("رحلة البحث")}</div>
          {itemsOf(journeySections).map(link)}

          <div className="lx-group">{tr("شغل الفريق")}</div>
          {work.map(link)}

          {isSuperAdmin && (
            <NavLink to="/admin/subscriptions" onClick={onClose} className={({ isActive }) => clsx("lx-link mt-2", isActive && "on")}>
              <ShieldCheck size={18} strokeWidth={1.8} aria-hidden />
              <span className="flex-1">{tr("إدارة الاشتراكات")}</span>
            </NavLink>
          )}
        </nav>

        <NavLink to="/explain" onClick={onClose} className={({ isActive }) => clsx("lx-link mt-2 !min-h-[40px] !text-[14px]", isActive && "on")}>
          <CircleHelp size={17} strokeWidth={1.8} aria-hidden />
          <span className="flex-1">{tr("وش هذا المكان؟")}</span>
        </NavLink>
        <NavLink to="/learn" onClick={onClose} className="lx-learn mt-2" data-nav-id="learn">
          <GraduationCap size={18} className="text-[#FFC777]" aria-hidden />
          <span className="flex-1">{tr("تعلّموا Wesync")}</span>
          {loaded && total > 0 && (
            <span className="text-[12px] font-extrabold text-[#FFC777]" dir="ltr">
              {done}/{total}
            </span>
          )}
        </NavLink>

        {currentUser && (
          <div className="lx-me" ref={menuRef}>
            <Avatar initials={currentUser.initials} color={currentUser.color} size="sm" />
            <div className="min-w-0 flex-1 leading-[1.35]">
              <div className="truncate text-[14px] font-bold text-[#F2EBE3]">{currentUser.name}</div>
              <div className="truncate text-[12px] text-[#ABA095]">{isLeader ? tr("قائد الفريق") : tr("عضو الفريق")}</div>
            </div>
            <div className="lx-tools">
              <NotificationsBell up />
              <button type="button" className="lx-tool" aria-label={tr("المزيد")} aria-expanded={menu} aria-haspopup="menu" onClick={() => setMenu((m) => !m)}>
                <MoreHorizontal size={18} />
              </button>
            </div>
            {menu && (
              <div className="lx-menu" role="menu" aria-label={tr("المزيد")}>
                <div className="flex items-center gap-2 px-1 pb-2">
                  <ThemeSwitcher up />
                  <LangToggle className="!h-11 !min-w-11" />
                  <button
                    type="button"
                    className="lx-tool !border !border-white/10"
                    onClick={() => {
                      const next = !soundOn;
                      setSoundEnabled(next);
                      setSoundOn(next);
                    }}
                    aria-label={soundOn ? tr("إيقاف أصوات التفاعل") : tr("تشغيل أصوات التفاعل")}
                    title={soundOn ? tr("إيقاف أصوات التفاعل") : tr("تشغيل أصوات التفاعل")}
                  >
                    {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
                  </button>
                </div>
                <button type="button" role="menuitem" className="lx-mi" onClick={() => (setMenu(false), window.dispatchEvent(new Event("nursync:open-command-palette")))}>
                  <Search size={16} aria-hidden />
                  <span className="flex-1">{tr("ابحث أو انتقل بسرعة...")}</span>
                  <kbd dir="ltr">Ctrl K</kbd>
                </button>
                <NavLink role="menuitem" to="/start" className="lx-mi" onClick={() => (setMenu(false), onClose?.())}>
                  <Flag size={16} aria-hidden />
                  {tr("بدأتوا قبل؟ جيبوا شغلكم")}
                </NavLink>
                <NavLink role="menuitem" to="/guide" className="lx-mi" onClick={() => (setMenu(false), onClose?.())}>
                  <Compass size={16} aria-hidden />
                  {tr("دليل الطالب")}
                </NavLink>
                {extra.map((p) => (
                  <NavLink key={p.to} role="menuitem" to={p.to} className="lx-mi" onClick={() => (setMenu(false), onClose?.())}>
                    {p.to === "/pricing" ? <CreditCard size={16} aria-hidden /> : <p.icon size={16} aria-hidden />}
                    {p.label}
                  </NavLink>
                ))}
                <div className="lx-mi-wrap">
                  <IdeaButton />
                </div>
                <InstallAppButton variant="light" className="my-1 w-full" />
                <button type="button" role="menuitem" className="lx-mi" onClick={logout}>
                  <LogOut size={16} aria-hidden />
                  {tr("تسجيل الخروج")}
                </button>
              </div>
            )}
          </div>
        )}
      </aside>
    </>
  );
}
