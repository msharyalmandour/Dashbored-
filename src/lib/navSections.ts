import {
  BookOpenText,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  NotebookPen,
  Search,
  Users,
  CalendarClock,
  GraduationCap,
  FileDown,
  BookA,
  Flag,
  CreditCard,
  type LucideIcon,
} from "lucide-react";
import type { StageKey } from "../data/types";

export interface NavPage {
  to: string;
  label: string;
}

export interface NavSection {
  id: string;
  label: string;
  icon: LucideIcon;
  /** الصفحات القريبة من بعض — تظهر كتبويبات فوق الصفحة، وبالقائمة الجانبية بند واحد */
  pages: NavPage[];
  /** مراحل الرحلة اللي يغطيها القسم — تحدد «أنتم هنا / خلصتوا» */
  stages?: StageKey[];
}

/** القائمة الرئيسية: ٧ أبواب بدل ٢٥ صفحة. كل المسارات القديمة تبقى شغالة (روابط، بحث سريع، إشعارات). */
export const journeySections: NavSection[] = [
  {
    id: "search",
    label: "أبحث",
    icon: Search,
    stages: ["topic", "literature-review"],
    pages: [
      { to: "/research-search", label: "وكيل البحث" },
      { to: "/evidence", label: "مكتبة الأدلة" },
      { to: "/literature-review", label: "مراجعة الأدبيات" },
    ],
  },
  {
    id: "write",
    label: "أكتب",
    icon: BookOpenText,
    stages: ["proposal", "research-gap", "research-questions", "methodology"],
    pages: [
      { to: "/proposal", label: "المقترح البحثي" },
      { to: "/methodology", label: "المنهجية" },
      { to: "/ethical-approval", label: "الموافقة الأخلاقية" },
    ],
  },
  {
    id: "collect",
    label: "أجمع وأحلل",
    icon: ClipboardList,
    stages: ["data-collection", "analysis"],
    pages: [
      { to: "/study-kit", label: "الاستبيانات والموافقات" },
      { to: "/surveys", label: "منشئ الاستبيان" },
      { to: "/tools-library", label: "أدوات القياس" },
      { to: "/fieldwork", label: "الميدان" },
      { to: "/stats", label: "الإحصاء" },
    ],
  },
];

export const workSections: NavSection[] = [
  {
    id: "team",
    label: "الفريق",
    icon: Users,
    pages: [
      { to: "/tasks", label: "مهامي" },
      { to: "/team", label: "الفريق" },
      { to: "/timeline", label: "الجدول الزمني" },
    ],
  },
  {
    id: "supervisor",
    label: "المشرف/ة",
    icon: NotebookPen,
    pages: [
      { to: "/meeting-minutes", label: "الاجتماعات والقرارات" },
      { to: "/feedback", label: "ملاحظات المشرف/ة" },
    ],
  },
  {
    id: "calendar",
    label: "التقويم والملفات",
    icon: CalendarDays,
    pages: [
      { to: "/calendar", label: "التقويم" },
      { to: "/files", label: "الملفات" },
    ],
  },
];

export const homeSection = { to: "/", label: "الرئيسية", icon: LayoutDashboard };

/** الصفحات اللي نادرًا تنفتح — مطوية تحت «المزيد» */
export const morePages: { to: string; label: string; icon: LucideIcon }[] = [
  { to: "/planner", label: "مخطط الموعد", icon: CalendarClock },
  { to: "/viva", label: "تدريب المناقشة", icon: GraduationCap },
  { to: "/proposal/export", label: "تصدير المقترح", icon: FileDown },
  { to: "/glossary", label: "قاموس المصطلحات", icon: BookA },
  { to: "/story", label: "قصة بحثك", icon: Flag },
  { to: "/pricing", label: "الباقات والاشتراك", icon: CreditCard },
];

export const allSections = [...journeySections, ...workSections];

export function isPathIn(pathname: string, to: string): boolean {
  return to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(`${to}/`);
}

export function sectionForPath(pathname: string): NavSection | undefined {
  return allSections.find((s) => s.pages.some((p) => isPathIn(pathname, p.to)));
}
