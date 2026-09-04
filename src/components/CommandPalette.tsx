import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  Compass,
  CreditCard,
  FlaskConical,
  ShieldCheck,
  Sparkles,
  Search,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const baseItems = [
  { to: "/", label: "الرئيسية", icon: LayoutDashboard },
  { to: "/proposal", label: "المقترح البحثي", icon: BookOpenText },
  { to: "/literature-review", label: "مراجعة الأدبيات", icon: BookMarked },
  { to: "/methodology", label: "المنهجية", icon: FlaskConical },
  { to: "/tasks", label: "مهامي", icon: ListChecks },
  { to: "/evidence", label: "مكتبة الأدلة", icon: Library },
  { to: "/team", label: "الفريق", icon: Users },
  { to: "/timeline", label: "الجدول الزمني", icon: ListTree },
  { to: "/fieldwork", label: "الميدان", icon: MapPinned },
  { to: "/files", label: "الملفات", icon: FolderClosed },
  { to: "/calendar", label: "التقويم", icon: CalendarDays },
  { to: "/story", label: "قصة بحثك", icon: Sparkles },
  { to: "/guide", label: "دليل الطالب", icon: Compass },
  { to: "/pricing", label: "الباقات والاشتراك", icon: CreditCard },
];

export default function CommandPalette() {
  const { currentUser, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const items = useMemo(
    () =>
      isSuperAdmin
        ? [...baseItems, { to: "/admin/subscriptions", label: "إدارة الاشتراكات", icon: ShieldCheck }]
        : baseItems,
    [isSuperAdmin],
  );

  const filtered = useMemo(
    () => items.filter((i) => i.label.includes(query.trim())),
    [items, query],
  );

  useEffect(() => {
    if (!currentUser) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    const onOpenEvent = () => setOpen(true);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("nursync:open-command-palette", onOpenEvent);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("nursync:open-command-palette", onOpenEvent);
    };
  }, [currentUser]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  if (!open || !currentUser) return null;

  const go = (to: string) => {
    navigate(to);
    setOpen(false);
  };

  const onInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[activeIndex]) go(filtered[activeIndex].to);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-[15vh] backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-brand-100 bg-paper shadow-2xl shadow-black/20"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 border-b border-brand-100 px-4 py-3">
          <Search size={16} className="text-brand-950/40" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder="اكتب عشان تنتقل بسرعة..."
            className="w-full bg-transparent text-sm text-brand-950 outline-none placeholder:text-brand-950/35"
          />
          <kbd className="rounded-md border border-brand-100 bg-surface-muted px-1.5 py-0.5 text-[10px] font-bold text-brand-950/40">
            Esc
          </kbd>
        </div>
        <ul className="max-h-80 overflow-y-auto p-2">
          {filtered.map((item, i) => (
            <li key={item.to}>
              <button
                onClick={() => go(item.to)}
                onMouseEnter={() => setActiveIndex(i)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                  i === activeIndex
                    ? "bg-brand-500 text-white"
                    : "text-brand-950/70 hover:bg-surface-muted"
                }`}
              >
                <item.icon size={16} />
                {item.label}
              </button>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="py-6 text-center text-sm text-brand-950/40">ولا نتيجة</li>
          )}
        </ul>
      </div>
    </div>
  );
}
