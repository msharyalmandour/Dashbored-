import { Bell, MessageSquare, Search } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Avatar from "./ui/Avatar";
import ThemeSwitcher from "./ThemeSwitcher";

export default function Header({ title }: { title: string }) {
  const { currentUser } = useAuth();

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-brand-100/70 bg-paper/85 px-8 py-4 backdrop-blur">
      <h1 className="font-display text-xl font-bold text-brand-950">{title}</h1>

      <div className="flex flex-1 items-center justify-end gap-4">
        <div className="relative hidden w-full max-w-sm md:block">
          <Search
            size={16}
            className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-brand-950/30"
          />
          <input
            type="text"
            placeholder="ابحث عن مهام، أوراق بحثية، ملفات..."
            className="w-full rounded-xl border border-brand-100 bg-surface-muted py-2 pe-9 ps-3 text-sm outline-none placeholder:text-brand-950/30 focus:border-brand-300 focus:bg-paper"
          />
        </div>

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
