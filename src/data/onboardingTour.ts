import {
  BookMarked,
  BookOpenText,
  CalendarDays,
  Compass,
  LayoutDashboard,
  ListChecks,
  Users,
  type LucideIcon,
} from "lucide-react";

/** اسم المرشدة اللي تاخذ المستخدمة بالجولة التعريفية — تعرّف عن نفسها
    بأول خطوة قبل ما تبدأ تشرح */
export const guideName = "نور";

export interface TourStep {
  id: string;
  route: string;
  label: string;
  icon: LucideIcon;
  title: string;
  body: string;
}

/** جولة تعريفية قصيرة تمشي بالمستخدمة الجديدة على أهم صفحات NURSYNC،
    خطوة خطوة، وتنقلها فعليًا لكل صفحة وهي تشرح — مو بس نص بنافذة منبثقة */
export const tourSteps: TourStep[] = [
  {
    id: "overview",
    route: "/",
    label: "الرئيسية",
    icon: LayoutDashboard,
    title: "لوحتك الرئيسية",
    body: "هذي أول شي تشوفينه كل يوم — ملخص تقدم بحثكم، مهامك القادمة، وتقويمكم بمكان واحد.",
  },
  {
    id: "proposal",
    route: "/proposal",
    label: "المقترح البحثي",
    icon: BookOpenText,
    title: "المقترح البحثي",
    body: "هنا تكتبون خلفية البحث والفجوة البحثية والهدف — أساس بحثكم كامل يتوثق بهذي الصفحة.",
  },
  {
    id: "tasks",
    route: "/tasks",
    label: "مهامي",
    icon: ListChecks,
    title: "المهام",
    body: "وزّعوا المهام بين أعضاء الفريق وتابعوا حالتها — قائدة الفريق تقدر تسند مهام جديدة من هنا.",
  },
  {
    id: "evidence",
    route: "/evidence",
    label: "مكتبة الأدلة",
    icon: BookMarked,
    title: "مكتبة الأدلة",
    body: "احفظوا الدراسات اللي تجمعونها هنا، مع اقتباس جاهز تنسخينه مباشرة لمقترحكم.",
  },
  {
    id: "team",
    route: "/team",
    label: "الفريق",
    icon: Users,
    title: "فريقك",
    body: "شوفوا تقدم كل عضو، ادعوا زملاءكم برابط واحد، وشاركوا مشرفكم رابط متابعة بدون تسجيل دخول.",
  },
  {
    id: "calendar",
    route: "/calendar",
    label: "التقويم",
    icon: CalendarDays,
    title: "التقويم",
    body: "كل اجتماعاتكم ومواعيدكم النهائية بمكان واحد — وتقدرون تصدّرونها لتقويم جوالكم.",
  },
  {
    id: "guide",
    route: "/guide",
    label: "دليل الطالب",
    icon: Compass,
    title: "دليل الطالب",
    body: "احتجتوا تفاصيل أكثر عن أي صفحة؟ كل شي موثّق بهذا الدليل — ارجعوا له وقت ما تبين.",
  },
];
