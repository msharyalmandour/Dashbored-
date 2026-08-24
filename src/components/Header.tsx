import { Bell, MessageSquare, Search } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Avatar from "./ui/Avatar";
import ThemeSwitcher from "./ThemeSwitcher";
import PresenceStack from "./PresenceStack";

export default function Header({ title }: { title: string }) {
  const { currentUser } = useAuth();

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-brand-100/70 bg-paper/85 px-8 py-4 backdrop-blur">
      <h1 className="font-display text-xl font-bold text-brand-950">{title}</h1>

      <div className="flex flex-1 items-center justify-end gap-4">
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

        <ThemeSwitcher />

        <button className="relative rounded-xl border border-brand-100 p-2 text-brand-950/60 hover:bg-surface-muted">
          <Bell size={18} />
          <span className="absolute -top-1 -end-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-accent-500 text-[10px] font-bold text-white">
            3
          </span>
        </button>
        <button className="relative rounded-xl border border-brand-100 p-2 text-brand-950/60 hover:bg-surface-muted">
          <MessageSquare size={18} />
          <span className="absolute -top-1 -end-1 flex h-4 w-4 items-center justify-center rounded-full bg-sky-accent-500 text-[10px] font-bold text-white">
            2
          </span>
        </button>

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
