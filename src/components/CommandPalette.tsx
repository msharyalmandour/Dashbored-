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
  Wand2,
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
import { tr } from "../lib/i18n";

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
  { to: "/tasks?new=1", label: tr("مهمة جديدة"), icon: Plus, action: true, keywords: tr("اضافة اضف مهمة task new") },
  { to: "/research-search?tab=studies", label: tr("ابحث عن دراسات لبحثكم"), icon: Search, action: true, keywords: tr("بحث دراسات ابحاث pubmed scholar") },
  { to: "/stats", label: tr("احسب حجم العينة"), icon: Calculator, action: true, keywords: tr("عينة sample size كوكران") },
  { to: "/feedback", label: tr("أضف ملاحظات المشرفة"), icon: MessageSquareText, action: true, keywords: tr("ملاحظات دكتورة مشرفة feedback") },
  { to: "/", label: tr("الرئيسية"), icon: LayoutDashboard },
  { to: "/proposal", label: tr("المقترح البحثي"), icon: BookOpenText, keywords: tr("proposal بروبوزل") },
  { to: "/literature-review", label: tr("مراجعة الأدبيات"), icon: BookMarked, keywords: "literature review" },
  { to: "/methodology", label: tr("المنهجية"), icon: FlaskConical, keywords: tr("methods تصميم عينة") },
  { to: "/ethical-approval", label: tr("الموافقة الأخلاقية"), icon: FileCheck2, keywords: tr("irb ethics اخلاقيات") },
  { to: "/tasks", label: tr("مهامي"), icon: ListChecks, keywords: "tasks" },
  { to: "/evidence", label: tr("مكتبة الأدلة"), icon: Library, keywords: tr("مراجع references papers") },
  { to: "/research-search", label: tr("وكيل البحث العلمي"), icon: Search, keywords: "agent" },
  { to: "/stats", label: tr("استوديو الإحصاء"), icon: Calculator, keywords: tr("spss احصاء تحليل statistics t-test") },
  { to: "/feedback", label: tr("ملاحظات المشرف"), icon: MessageSquareText },
  { to: "/study-kit", label: tr("الاستبيان والموافقات"), icon: ClipboardList, keywords: tr("consent موافقة استبيان ترجمة") },
  { to: "/surveys", label: tr("منشئ الاستبيان"), icon: ClipboardList, keywords: tr("survey questionnaire استبيان استمارة اسئلة ليكرت عينة") },
  { to: "/tools-library", label: tr("مكتبة أدوات القياس"), icon: Ruler, keywords: tr("scale questionnaire مقياس") },
  { to: "/planner", label: tr("مخطط الموعد"), icon: CalendarClock, keywords: tr("deadline جدول تسليم") },
  { to: "/viva", label: tr("تدريب المناقشة"), icon: GraduationCap, keywords: tr("viva defense مناقشة") },
  { to: "/proposal/export", label: tr("تصدير المقترح"), icon: FileDown, keywords: tr("word pdf تحميل") },
  { to: "/glossary", label: tr("قاموس المصطلحات"), icon: BookA, keywords: tr("معنى مصطلح") },
  { to: "/team", label: tr("الفريق"), icon: Users },
  { to: "/timeline", label: tr("الجدول الزمني"), icon: ListTree },
  { to: "/fieldwork", label: tr("الميدان"), icon: MapPinned },
  { to: "/files", label: tr("الملفات"), icon: FolderClosed },
  { to: "/meeting-minutes", label: tr("محاضر الاجتماعات"), icon: NotebookPen },
  { to: "/calendar", label: tr("التقويم"), icon: CalendarDays },
  { to: "/story", label: tr("قصة بحثك"), icon: Wand2 },
  { to: "/guide", label: tr("دليل الطالب"), icon: Compass },
  { to: "/pricing", label: tr("الباقات والاشتراك"), icon: CreditCard },
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
        ? [...baseItems, { to: "/admin/subscriptions", label: tr("إدارة الاشتراكات"), icon: ShieldCheck }]
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
            placeholder={tr("اكتب أمر أو صفحة… (مثلًا: مهمة، عينة، spss، موافقة)")}
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
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${i === activeIndex ? "bg-white/20" : "bg-brand-500/15 text-brand-600"}`}>{tr("أمر")}</span>
                )}
              </button>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="py-6 text-center text-sm text-brand-950/40">{tr("ولا نتيجة")}</li>
          )}
        </ul>
      </div>
    </div>
  );
}
