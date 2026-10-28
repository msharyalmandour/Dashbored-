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
import { tr } from "./i18n";

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
    label: tr("أبحث"),
    icon: Search,
    stages: ["topic", "literature-review"],
    pages: [
      { to: "/research-search", label: tr("الوكيل") },
      { to: "/research-search?tab=studies", label: tr("البحث عن دراسات") },
      { to: "/evidence", label: tr("مكتبة الأدلة") },
      { to: "/literature-review", label: tr("مراجعة الأدبيات") },
    ],
  },
  {
    id: "write",
    label: tr("أكتب"),
    icon: BookOpenText,
    stages: ["proposal", "research-gap", "research-questions", "methodology"],
    pages: [
      { to: "/proposal", label: tr("المقترح البحثي") },
      { to: "/methodology", label: tr("المنهجية") },
      { to: "/ethical-approval", label: tr("الموافقة الأخلاقية") },
    ],
  },
  {
    id: "collect",
    label: tr("أجمع وأحلل"),
    icon: ClipboardList,
    stages: ["data-collection", "analysis"],
    pages: [
      { to: "/collect", label: tr("المحطات") },
      { to: "/study-kit", label: tr("الاستبيانات والموافقات") },
      { to: "/surveys", label: tr("منشئ الاستبيان") },
      { to: "/tools-library", label: tr("أدوات القياس") },
      { to: "/fieldwork", label: tr("الميدان") },
      { to: "/stats", label: tr("الإحصاء") },
    ],
  },
];

export const workSections: NavSection[] = [
  {
    id: "team",
    label: tr("الفريق"),
    icon: Users,
    pages: [
      { to: "/tasks", label: tr("مهامي") },
      { to: "/team", label: tr("الفريق") },
      { to: "/timeline", label: tr("الجدول الزمني") },
    ],
  },
  {
    id: "supervisor",
    label: tr("المشرف/ة"),
    icon: NotebookPen,
    pages: [
      { to: "/meeting-minutes", label: tr("الاجتماعات والقرارات") },
      { to: "/feedback", label: tr("ملاحظات المشرف/ة") },
    ],
  },
  {
    id: "calendar",
    label: tr("التقويم والملفات"),
    icon: CalendarDays,
    pages: [
      { to: "/calendar", label: tr("التقويم") },
      { to: "/files", label: tr("الملفات") },
    ],
  },
];

export const homeSection = { to: "/", label: tr("الرئيسية"), icon: LayoutDashboard };

/** الصفحات اللي نادرًا تنفتح — مطوية تحت «المزيد» */
export const morePages: { to: string; label: string; icon: LucideIcon }[] = [
  { to: "/planner", label: tr("مخطط الموعد"), icon: CalendarClock },
  { to: "/viva", label: tr("تدريب المناقشة"), icon: GraduationCap },
  { to: "/proposal/export", label: tr("تصدير المقترح"), icon: FileDown },
  { to: "/glossary", label: tr("قاموس المصطلحات"), icon: BookA },
  { to: "/story", label: tr("قصة بحثك"), icon: Flag },
  { to: "/pricing", label: tr("الباقات والاشتراك"), icon: CreditCard },
];

export const allSections = [...journeySections, ...workSections];

/** الرابط ممكن يحمل ?tab=… (تبويب داخل نفس الصفحة) — المقارنة بالمسار تتجاهله */
export function isPathIn(pathname: string, to: string): boolean {
  const path = to.split("?")[0];
  return path === "/" ? pathname === "/" : pathname === path || pathname.startsWith(`${path}/`);
}

/** هل هذا التبويب هو الحالي؟ لو الرابط يحمل ?tab=… لازم يطابقه، وإلا يطابق المسار فقط */
export function isTabActive(pathname: string, search: string, to: string): boolean {
  const [, qs] = to.split("?");
  if (!isPathIn(pathname, to)) return false;
  return qs ? new URLSearchParams(search).get(qs.split("=")[0]) === qs.split("=")[1] : true;
}

export function sectionForPath(pathname: string): NavSection | undefined {
  return allSections.find((s) => s.pages.some((p) => isPathIn(pathname, p.to)));
}
