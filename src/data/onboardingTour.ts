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

/** اسم المرشد اللي ياخذ المستخدمة بالجولة التعريفية — يعرّف عن نفسه
    بأول خطوة قبل ما يبدأ يشرح */
export const guideName = "فيصل";

/** جملة تعريفية واثقة بلهجة سعودية/خليجية عامية — تُقال صوتيًا بأول خطوة
    قبل شرح الصفحة نفسها. بدون إيموجي عشان القراءة الصوتية تطلع نظيفة */
export const guideIntro =
  "أنا فيصل، مرشدكم في NURSYNC، وأبي أوريكم بسرعة ليش هالمنصة بتغيّر طريقة شغلكم البحثي من الجذور.";

export interface TourStep {
  id: string;
  route: string;
  label: string;
  icon: LucideIcon;
  title: string;
  body: string;
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
  },
  {
    id: "proposal",
    route: "/proposal",
    label: "المقترح البحثي",
    icon: BookOpenText,
    title: "المقترح البحثي، أساس كل شي",
    body: "من هنا يبدأ بحثكم فعليًا. الخلفية، الفجوة البحثية، الهدف، كله موثّق بمكان وحد، ويبان لمشرفكم إنكم فريق يعرف شغله.",
  },
  {
    id: "tasks",
    route: "/tasks",
    label: "مهامي",
    icon: ListChecks,
    title: "المهام، صفر فوضى",
    body: "وزّعوا الشغل، وتابعوا كل مهمة لحظة بلحظة. ما فيه بعد اليوم حجة ما كنت أدري إني علي مهمة.",
  },
  {
    id: "evidence",
    route: "/evidence",
    label: "مكتبة الأدلة",
    icon: BookMarked,
    title: "مكتبة الأدلة، ذخيرتكم العلمية",
    body: "كل دراسة تجمعونها تنحفظ هنا جاهزة باقتباس صحيح. هذي مو مجرد أرشيف، هذا سلاحكم وقت الكتابة.",
  },
  {
    id: "team",
    route: "/team",
    label: "الفريق",
    icon: Users,
    title: "فريقك",
    body: "شوفوا مين شغال أكثر، ادعوا زملاءكم برابط وحد، وحتى مشرفكم يتابعكم بدون ما يسجل دخول. شفافية كاملة، صفر تعقيد.",
  },
  {
    id: "calendar",
    route: "/calendar",
    label: "التقويم",
    icon: CalendarDays,
    title: "التقويم",
    body: "كل اجتماع وكل تسليم نهائي بمكان وحد، وتقدرون تصدّرونه لجوالكم بضغطة وحدة. صفر أعذار بعد اليوم.",
  },
  {
    id: "guide",
    route: "/guide",
    label: "دليل الطالب",
    icon: Compass,
    title: "دليل الطالب",
    body: "احتجتوا تفاصيل أكثر عن أي صفحة؟ هذا الدليل جاهز لكم وقت ما تبون ترجعون له.",
  },
];
