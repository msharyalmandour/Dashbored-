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
import overviewShot from "../assets/tour/overview.png";
import proposalShot from "../assets/tour/proposal.png";
import tasksShot from "../assets/tour/tasks.png";
import evidenceShot from "../assets/tour/evidence.png";
import teamShot from "../assets/tour/team.png";
import calendarShot from "../assets/tour/calendar.png";
import guideShot from "../assets/tour/guide.png";

/** اسم المرشد اللي ياخذ المستخدمة بالجولة التعريفية — يعرّف عن نفسه
    بأول خطوة قبل ما يبدأ يشرح */
export const guideName = "مشاري";

/** جملة تعريفية واثقة بلهجة سعودية/خليجية عامية — تُقال صوتيًا بأول خطوة
    قبل شرح الصفحة نفسها. بدون إيموجي عشان القراءة الصوتية تطلع نظيفة */
export const guideIntro =
  "أنا مشاري، مرشدكم في NURSYNC، وأبي أوريكم بسرعة ليش هالمنصة بتغيّر طريقة شغلكم البحثي من الجذور.";

export interface TourStep {
  id: string;
  route: string;
  label: string;
  icon: LucideIcon;
  title: string;
  body: string;
  /** لقطة حقيقية من الصفحة نفسها — تبان كصورة مصغّرة تحت النص عشان
      توضح فعليًا شكل الصفحة اللي يتكلم عنها المرشد */
  image: string;
}

/** جولة تعريفية قصيرة تمشي بالمستخدمة الجديدة على أهم صفحات NURSYNC، خطوة
    خطوة، وتنقلها فعليًا لكل صفحة وهي تشرح. النبرة عامية وواثقة، بأسلوب
    تسويقي حديث — تبيع الفايدة مو بس تصف الوظيفة، وبدون إيموجي بالنص عشان
    القراءة الصوتية (Web Speech API) تطلع سليمة */
export const tourSteps: TourStep[] = [
  {
    id: "overview",
    route: "/",
    label: "الرئيسية",
    icon: LayoutDashboard,
    title: "لوحتك الذكية",
    body: "هذي مو صفحة عادية، هذي مركز قيادتكم. بلمحة وحدة تعرفون وين وصلتوا، وش الجاي، ووش يستاهل تركيزكم اليوم. خلاص ودّعوا الفوضى.",
    image: overviewShot,
  },
  {
    id: "proposal",
    route: "/proposal",
    label: "المقترح البحثي",
    icon: BookOpenText,
    title: "المقترح البحثي، أساس كل شي",
    body: "من هنا يبدأ بحثكم فعليًا. الخلفية، الفجوة البحثية، الهدف، كله موثّق بمكان وحد، ويبان لمشرفكم إنكم فريق يعرف شغله.",
    image: proposalShot,
  },
  {
    id: "tasks",
    route: "/tasks",
    label: "مهامي",
    icon: ListChecks,
    title: "المهام، صفر فوضى",
    body: "وزّعوا الشغل، وتابعوا كل مهمة لحظة بلحظة. ما فيه بعد اليوم حجة ما كنت أدري إني علي مهمة.",
    image: tasksShot,
  },
  {
    id: "evidence",
    route: "/evidence",
    label: "مكتبة الأدلة",
    icon: BookMarked,
    title: "مكتبة الأدلة، ذخيرتكم العلمية",
    body: "كل دراسة تجمعونها تنحفظ هنا جاهزة باقتباس صحيح. هذي مو مجرد أرشيف، هذا سلاحكم وقت الكتابة.",
    image: evidenceShot,
  },
  {
    id: "team",
    route: "/team",
    label: "الفريق",
    icon: Users,
    title: "فريقك",
    body: "شوفوا مين شغال أكثر، ادعوا زملاءكم برابط وحد، وحتى مشرفكم يتابعكم بدون ما يسجل دخول. شفافية كاملة، صفر تعقيد.",
    image: teamShot,
  },
  {
    id: "calendar",
    route: "/calendar",
    label: "التقويم",
    icon: CalendarDays,
    title: "التقويم",
    body: "كل اجتماع وكل تسليم نهائي بمكان وحد، وتقدرون تصدّرونه لجوالكم بضغطة وحدة. صفر أعذار بعد اليوم.",
    image: calendarShot,
  },
  {
    id: "guide",
    route: "/guide",
    label: "دليل الطالب",
    icon: Compass,
    title: "دليل الطالب",
    body: "احتجتوا تفاصيل أكثر عن أي صفحة؟ هذا الدليل جاهز لكم وقت ما تبون ترجعون له.",
    image: guideShot,
  },
];
