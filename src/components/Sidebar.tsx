import { useEffect, useRef, useState } from "react";
import WLogo from "./brand/WLogo";
import { NavLink, useLocation } from "react-router-dom";
import { Check, CheckSquare, Compass, CreditCard, Flag, House, Lock, LogOut, MoreHorizontal, Search, ShieldCheck, Download, Smile, Volume2, VolumeX } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "../context/AuthContext";
import { useResearchStages } from "../hooks/useResearchStages";
import { useChatUnread } from "../hooks/useTeamChat";
import { useDoors } from "../hooks/useDoors";
import { DOOR_HINT, DOOR_ORDER, SECTION_DOOR, journeyStep, type DoorId } from "../lib/doors";
import DoorUnlock from "./DoorUnlock";
import ShareAchievement from "./ShareAchievement";
import { DOOR_SHARE } from "../lib/achievementCard";
import { useLandedBadges } from "../lib/landed";
import { isPathIn, journeySections, morePages, workSections, type NavSection } from "../lib/navSections";
import { isSoundEnabled, isSyncSoundOn, setSoundEnabled, setSyncSoundOn } from "../lib/sound";
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

type Item = { id: string; to: string; label: string; icon: NavSection["icon"]; match: string[]; stages?: NavSection["stages"]; door?: DoorId };

/** «الفريق» بالقائمة ينقسم: مهامي (/tasks) بند لحاله، والفريق (/team + الجدول الزمني) */
function itemsOf(secs: NavSection[]): Item[] {
  const out: Item[] = [];
  for (const s of secs) {
    if (s.id === "team") {
      out.push({ id: "tasks", to: "/tasks", label: tr("مهامي"), icon: CheckSquare, match: ["/tasks"] });
      const rest = s.pages.filter((p) => p.to !== "/tasks");
      out.push({ id: "team", to: rest[0]?.to ?? "/team", label: s.label, icon: s.icon, match: rest.map((p) => p.to) });
    } else out.push({ id: s.id, to: s.pages[0].to, label: s.label, icon: s.icon, match: s.pages.map((p) => p.to), stages: s.stages, door: SECTION_DOOR[s.id] });
  }
  return out;
}

export default function Sidebar({ open = false, onClose }: { open?: boolean; onClose?: () => void }) {
  const { currentUser, isSuperAdmin, logout, isLeader } = useAuth();
  const { pathname } = useLocation();
  const { stages } = useResearchStages();
  const unread = useChatUnread();
  const landed = useLandedBadges();
  const doors = useDoors({ celebrate: true });
  const [shareDoor, setShareDoor] = useState<DoorId | null>(null);
  const [menu, setMenu] = useState(false);
  const [soundOn, setSoundOn] = useState(isSoundEnabled);
  const [syncOn, setSyncOn] = useState(isSyncSoundOn);
  const menuRef = useRef<HTMLDivElement>(null);

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
    const fresh = !!it.door && doors.fresh.includes(it.door);
    return (
      <NavLink key={it.id} data-nav-id={it.id} to={active ? pathname : it.to} onClick={onClose} aria-current={active ? "page" : undefined} className={clsx("lx-link", active && "on", fresh && "door-new")}>
        {fresh && (
          <>
            {/* لحظة الانفتاح (DoorMotionSpec): خط ذهبي على حافة الكبسولة + القفل يدور وينفك */}
            <svg className="dl-edge" aria-hidden>
              <rect x="1" y="1" rx="16" pathLength={100} style={{ width: "calc(100% - 2px)", height: "calc(100% - 2px)" }} />
            </svg>
            <span className="dl-lock" aria-hidden>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="11" width="14" height="10" rx="2.5" />
                <path d="M8 11V7.5a4 4 0 0 1 8 0" />
              </svg>
            </span>
          </>
        )}
        <it.icon size={18} strokeWidth={1.8} aria-hidden className={fresh ? "dl-fade" : undefined} />
        <span className={clsx("min-w-0 flex-1 truncate", fresh && "dl-fade")}>{it.label}</span>
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
  // الأبواب: القسم يظهر لما ينفتح (أو الصفحة الحالية منه، عشان ما يختفي اللي فاتحينه)
  const shown = (it: Item) => doors.isOpen(it.door) || it.match.some((m) => isPathIn(pathname, m));
  const journey = itemsOf(journeySections);
  const work = itemsOf(workSections);
  const extra = morePages.filter((p) => !p.hideInNav);
  // «الجاي»: باب واحد مقفل بس يطلع، باهت وفيه سطر وش يفتحه
  // أول باب مقفل له مكان بالقائمة (المنهجية مثلًا تبويب داخل «أكتب» فتطلع هناك مو هنا)
  const sideNext = doors.next ? DOOR_ORDER.find((d) => !doors.isOpen(d) && [...journey, ...work].some((it) => it.door === d)) : undefined;
  const nextItem = sideNext ? [...journey, ...work].find((it) => it.door === sideNext) : undefined;
  const locked = nextItem && sideNext && (
    <div className="lx-link door-locked" aria-disabled="true" title={DOOR_HINT[sideNext]}>
      <nextItem.icon size={18} strokeWidth={1.8} aria-hidden />
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block truncate">{nextItem.label}</span>
        <span className="block truncate text-[12px] font-medium text-[#ABA095]">{DOOR_HINT[sideNext]}</span>
      </span>
      <Lock size={14} className="flex-none text-[#FFC777]" aria-hidden />
    </div>
  );
  const nextIsJourney = !!nextItem && journey.includes(nextItem);

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={onClose} />}
      <aside className={clsx("lx-side print:hidden", open ? "translate-x-0" : "translate-x-full ltr:-translate-x-full md:translate-x-0 md:ltr:translate-x-0")}>
        <div className="flex items-center gap-2.5 px-3 pb-[18px] pt-1.5">
          <WLogo size={30} />
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
          {journey.filter(shown).map(link)}
          {nextIsJourney && locked}

          <div className="lx-group">{tr("شغل الفريق")}</div>
          {work.filter(shown).map(link)}
          {nextItem && !nextIsJourney && locked}

          {doors.ready && (doors.next || doors.all) && (
            <button type="button" className="door-all" onClick={() => doors.setAll(!doors.all)}>
              {doors.all ? tr("رتّبوها حسب مرحلتكم") : tr("كل الأبواب")}
            </button>
          )}

          {isSuperAdmin && (
            <NavLink to="/admin/subscriptions" onClick={onClose} className={({ isActive }) => clsx("lx-link mt-2", isActive && "on")}>
              <ShieldCheck size={18} strokeWidth={1.8} aria-hidden />
              <span className="flex-1">{tr("إدارة الاشتراكات")}</span>
            </NavLink>
          )}
        </nav>

        {doors.fresh.length > 0 && (
          <DoorUnlock key={doors.fresh[0]} door={doors.fresh[0]} onDone={doors.clearFresh} onGo={onClose} onShare={DOOR_SHARE[doors.fresh[0]] ? () => setShareDoor(doors.fresh[0]) : undefined} />
        )}
        {shareDoor && DOOR_SHARE[shareDoor] && (
          <ShareAchievement title={DOOR_SHARE[shareDoor]!.title} sub={DOOR_SHARE[shareDoor]!.sub} step={doors.signals ? journeyStep(doors.signals, doors.open) : null} onClose={() => setShareDoor(null)} />
        )}

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
                </button>
                <NavLink role="menuitem" to="/start" className="lx-mi" onClick={() => (setMenu(false), onClose?.())}>
                  <Flag size={16} aria-hidden />
                  {tr("بدأتوا قبل؟ جيبوا شغلكم")}
                </NavLink>
                <button type="button" role="menuitemcheckbox" aria-checked={syncOn} className="lx-mi" onClick={() => (setSyncSoundOn(!syncOn), setSyncOn(!syncOn))}>
                  {syncOn ? <Volume2 size={16} aria-hidden /> : <VolumeX size={16} aria-hidden />}
                  <span className="flex-1">{tr("صوت المزامنة")}</span>
                  <span className="text-[12px] text-[#ABA095]">{syncOn ? tr("شغّال") : tr("مطفي")}</span>
                </button>
                <NavLink role="menuitem" to="/stickers" className="lx-mi" onClick={() => (setMenu(false), onClose?.())}>
                  <Smile size={16} aria-hidden />
                  {tr("ستيكرات ويسي")}
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
