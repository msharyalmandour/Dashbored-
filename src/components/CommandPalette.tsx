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
  NotebookPen,
  FileCheck2,
  Search,
  ClipboardList,
  MessageSquareText,
  CalendarClock,
  GraduationCap,
  Ruler,
  Plus,
  Calculator,
  BookA,
  FileDown,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface PaletteItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** كلمات بحث إضافية (مرادفات) */
  keywords?: string;
  /** أمر مباشر (مو مجرد انتقال لصفحة) */
  action?: boolean;
}

const baseItems: PaletteItem[] = [
  { to: "/tasks?new=1", label: "مهمة جديدة", icon: Plus, action: true, keywords: "اضافة اضف مهمة task new" },
  { to: "/research-search", label: "ابحث عن دراسات لبحثكم", icon: Search, action: true, keywords: "بحث دراسات ابحاث pubmed scholar" },
  { to: "/stats", label: "احسب حجم العينة", icon: Calculator, action: true, keywords: "عينة sample size كوكران" },
  { to: "/feedback", label: "أضف ملاحظات المشرفة", icon: MessageSquareText, action: true, keywords: "ملاحظات دكتورة مشرفة feedback" },
  { to: "/", label: "الرئيسية", icon: LayoutDashboard },
  { to: "/proposal", label: "المقترح البحثي", icon: BookOpenText, keywords: "proposal بروبوزل" },
  { to: "/literature-review", label: "مراجعة الأدبيات", icon: BookMarked, keywords: "literature review" },
  { to: "/methodology", label: "المنهجية", icon: FlaskConical, keywords: "methods تصميم عينة" },
  { to: "/ethical-approval", label: "الموافقة الأخلاقية", icon: FileCheck2, keywords: "irb ethics اخلاقيات" },
  { to: "/tasks", label: "مهامي", icon: ListChecks, keywords: "tasks" },
  { to: "/evidence", label: "مكتبة الأدلة", icon: Library, keywords: "مراجع references papers" },
  { to: "/research-search", label: "وكيل البحث العلمي", icon: Search, keywords: "agent" },
  { to: "/stats", label: "استوديو الإحصاء", icon: Calculator, keywords: "spss احصاء تحليل statistics t-test" },
  { to: "/feedback", label: "ملاحظات المشرف", icon: MessageSquareText },
  { to: "/study-kit", label: "الاستبيان والموافقات", icon: ClipboardList, keywords: "consent موافقة استبيان ترجمة" },
  { to: "/surveys", label: "منشئ الاستبيان", icon: ClipboardList, keywords: "survey questionnaire استبيان استمارة اسئلة ليكرت عينة" },
  { to: "/tools-library", label: "مكتبة أدوات القياس", icon: Ruler, keywords: "scale questionnaire مقياس" },
  { to: "/planner", label: "مخطط الموعد", icon: CalendarClock, keywords: "deadline جدول تسليم" },
  { to: "/viva", label: "تدريب المناقشة", icon: GraduationCap, keywords: "viva defense مناقشة" },
  { to: "/proposal/export", label: "تصدير المقترح", icon: FileDown, keywords: "word pdf تحميل" },
  { to: "/glossary", label: "قاموس المصطلحات", icon: BookA, keywords: "معنى مصطلح" },
  { to: "/team", label: "الفريق", icon: Users },
  { to: "/timeline", label: "الجدول الزمني", icon: ListTree },
  { to: "/fieldwork", label: "الميدان", icon: MapPinned },
  { to: "/files", label: "الملفات", icon: FolderClosed },
  { to: "/meeting-minutes", label: "محاضر الاجتماعات", icon: NotebookPen },
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

  const items = useMemo<PaletteItem[]>(
    () =>
      isSuperAdmin
        ? [...baseItems, { to: "/admin/subscriptions", label: "إدارة الاشتراكات", icon: ShieldCheck }]
        : baseItems,
    [isSuperAdmin],
  );

  // بدون كتابة: الأوامر السريعة أولًا. مع الكتابة: نطابق الاسم أو المرادفات (عربي/إنجليزي)
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.label.toLowerCase().includes(q) || (i.keywords ?? "").toLowerCase().includes(q));
  }, [items, query]);

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
        className="w-full max-w-lg overflow-hidden glass-panel rounded-[1.75rem] border border-brand-100/50 bg-paper/75 backdrop-blur-2xl backdrop-saturate-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 border-b border-brand-100 px-4 py-3">
          <Search size={16} className="text-brand-950/40" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder="اكتب أمر أو صفحة… (مثلًا: مهمة، عينة، spss، موافقة)"
            className="w-full bg-transparent text-sm text-brand-950 outline-none placeholder:text-brand-950/35"
          />
          <kbd className="rounded-md border border-brand-100 bg-surface-muted px-1.5 py-0.5 text-[10px] font-bold text-brand-950/40">
            Esc
          </kbd>
        </div>
        <ul className="max-h-80 overflow-y-auto p-2">
          {filtered.map((item, i) => (
            <li key={`${item.to}-${item.label}`}>
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
                <span className="flex-1 text-start">{item.label}</span>
                {item.action && (
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${i === activeIndex ? "bg-white/20" : "bg-brand-500/15 text-brand-600"}`}>أمر</span>
                )}
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
