import { useState } from "react";
import { Menu, Search, Volume2, VolumeX } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Avatar from "./ui/Avatar";
import ThemeSwitcher from "./ThemeSwitcher";
import PresenceStack from "./PresenceStack";
import NotificationsBell from "./NotificationsBell";
import { isSoundEnabled, setSoundEnabled } from "../lib/sound";

export default function Header({
  title,
  onMenuClick,
}: {
  title: string;
  onMenuClick?: () => void;
}) {
  const { currentUser } = useAuth();
  const [soundOn, setSoundOn] = useState(isSoundEnabled);

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-brand-100/70 bg-paper/85 px-4 py-4 backdrop-blur sm:gap-4 sm:px-8">
      <div className="flex min-w-0 items-center gap-2">
        <button
          onClick={onMenuClick}
          className="shrink-0 rounded-xl border border-brand-100 p-2 text-brand-950/60 hover:bg-surface-muted md:hidden"
        >
          <Menu size={18} />
        </button>
        <h1 className="font-display truncate text-lg font-bold text-brand-950 sm:text-xl">{title}</h1>
      </div>

      <div className="flex flex-1 items-center justify-end gap-2 sm:gap-4">
        <button
          onClick={() => window.dispatchEvent(new Event("nursync:open-command-palette"))}
          className="hidden w-full max-w-sm items-center gap-2 rounded-xl border border-brand-100 bg-surface-muted py-2 pe-2.5 ps-3 text-sm md:flex"
        >
          <Search size={16} className="shrink-0 text-brand-950/30" />
          <span className="flex-1 truncate text-start text-brand-950/30">
            ابحث أو انتقل بسرعة...
          </span>
          <kbd className="shrink-0 rounded-md border border-brand-200 bg-paper px-1.5 py-0.5 text-[10px] font-bold text-brand-950/40">
            Ctrl K
          </kbd>
        </button>

        <PresenceStack />

        <button
          onClick={() => {
            const next = !soundOn;
            setSoundEnabled(next);
            setSoundOn(next);
          }}
          title={soundOn ? "إيقاف أصوات التفاعل" : "تشغيل أصوات التفاعل"}
          className="rounded-xl border border-brand-100 p-2 text-brand-950/60 hover:bg-surface-muted"
        >
          {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>

        <ThemeSwitcher />

        <NotificationsBell />

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
