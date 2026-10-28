import { useState } from "react";
import clsx from "clsx";
import { Menu, Search, Volume2, VolumeX } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Avatar from "./ui/Avatar";
import ThemeSwitcher from "./ThemeSwitcher";
import PresenceStack from "./PresenceStack";
import NotificationsBell from "./NotificationsBell";
import SubscriptionBadge from "./SubscriptionBadge";
import { isSoundEnabled, setSoundEnabled } from "../lib/sound";
import LangToggle from "./ui/LangToggle";
import { tr } from "../lib/i18n";

export default function Header({
  title,
  onMenuClick,
  hideTitleOnDesktop = false,
  hideTitle = false,
  homeMode = false,
}: {
  title: string;
  onMenuClick?: () => void;
  /** الصفحات اللي لها ترويسة خاصة فيها (PageHeader) ما تحتاج تكرار العنوان بالشريط على الشاشات الكبيرة */
  hideTitleOnDesktop?: boolean;
  /** العنوان داخل الصفحة نفسها — ما نكرره بالشريط العلوي بأي حجم شاشة */
  hideTitle?: boolean;
  /** الرئيسية فيها مربع ⌘K والجرس بترويستها، فنخفيهم هنا على الشاشات الكبيرة عشان ما يتكررون */
  homeMode?: boolean;
}) {
  const { currentUser } = useAuth();
  const [soundOn, setSoundOn] = useState(isSoundEnabled);

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-amber-accent-400/20 bg-paper/45 px-4 py-4 backdrop-blur-2xl backdrop-saturate-150 print:hidden sm:gap-4 sm:px-8">
      <div className="flex min-w-0 items-center gap-2">
        <button
          onClick={onMenuClick}
          aria-label={tr("فتح القائمة")}
          className="shrink-0 rounded-full border border-brand-100/60 bg-paper/40 p-2.5 text-brand-950/60 hover:bg-surface-muted md:hidden"
        >
          <Menu size={18} />
        </button>
        <p className={clsx("font-display truncate text-lg font-bold text-brand-950 sm:text-xl", hideTitleOnDesktop && "md:hidden", hideTitle && "hidden")}>{title}</p>
      </div>

      <div className="flex flex-1 items-center justify-end gap-2 sm:gap-4">
        <button
          onClick={() => window.dispatchEvent(new Event("nursync:open-command-palette"))}
          className={clsx("hidden w-full max-w-sm items-center gap-2 rounded-full border border-brand-100/60 bg-paper/40 py-2 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] pe-2.5 ps-3 text-sm", homeMode ? "md:hidden" : "md:flex")}
        >
          <Search size={16} className="shrink-0 text-brand-950/30" />
          <span className="flex-1 truncate text-start text-brand-950/30">{tr("ابحث أو انتقل بسرعة...")}</span>
          <kbd className="shrink-0 rounded-full border border-brand-200/60 bg-paper/60 px-2 py-0.5 text-[10px] font-bold text-brand-950/40">
            Ctrl K
          </kbd>
        </button>

        <PresenceStack />

        <SubscriptionBadge />

        <button
          onClick={() => {
            const next = !soundOn;
            setSoundEnabled(next);
            setSoundOn(next);
          }}
          title={soundOn ? tr("إيقاف أصوات التفاعل") : tr("تشغيل أصوات التفاعل")}
          className="rounded-full border border-brand-100/60 bg-paper/40 p-2.5 text-brand-950/60 hover:bg-surface-muted"
        >
          {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>

        <LangToggle />

        <ThemeSwitcher />

        <div className={clsx(homeMode && "md:hidden")}>
          <NotificationsBell />
        </div>

        {currentUser && (
          <div className="flex items-center gap-2">
            <Avatar initials={currentUser.initials} color={currentUser.color} size="sm" />
            <span className="hidden text-sm font-semibold text-brand-950 lg:block">
              {currentUser.name}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
