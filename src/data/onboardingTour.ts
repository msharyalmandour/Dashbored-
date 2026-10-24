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
import { tr } from "../lib/i18n";

/** اسم المرشد اللي ياخذ المستخدمة بالجولة التعريفية — يعرّف عن نفسه
    بأول خطوة قبل ما يبدأ يشرح */
export const guideName = tr("مشاري");

/** جملة تعريفية واثقة بلهجة سعودية/خليجية عامية — تُقال صوتيًا بأول خطوة
    قبل شرح الصفحة نفسها. بدون إيموجي عشان القراءة الصوتية تطلع نظيفة */
export const guideIntro =
  tr("أنا مشاري، مرشدكم في Wesync، وأبي أوريكم بسرعة ليش هالمنصة بتغيّر طريقة شغلكم البحثي من الجذور، وتنقذكم من عشرين رسالة واتساب في اليوم.");

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

/** جولة تعريفية قصيرة تمشي بالمستخدمة الجديدة على أهم صفحات Wesync، خطوة
    خطوة، وتنقلها فعليًا لكل صفحة وهي تشرح. النبرة عامية وواثقة، بأسلوب
    تسويقي حديث — تبيع الفايدة مو بس تصف الوظيفة، وبدون إيموجي بالنص عشان
    القراءة الصوتية (Web Speech API) تطلع سليمة */
export const tourSteps: TourStep[] = [
  {
    id: "overview",
    route: "/",
    label: tr("الرئيسية"),
    icon: LayoutDashboard,
    title: tr("لوحتك الذكية"),
    body: tr("هذي مو صفحة عادية، هذي مركز قيادتكم. بلمحة واحدة تعرفون وين وصلتوا، وش الجاي، ووش يستاهل تركيزكم اليوم. خلاص ودّعوا الفوضى، وودّعوا رسائل وصلتوا وين كل خمس دقايق."),
    image: overviewShot,
  },
  {
    id: "proposal",
    route: "/proposal",
    label: tr("المقترح البحثي"),
    icon: BookOpenText,
    title: tr("المقترح البحثي، أساس كل شي"),
    body: tr("من هنا يبدأ بحثكم فعليًا. الخلفية، الفجوة البحثية، والهدف، كله موثّق بمكان واحد، ويبان لمشرفكم إنكم فريق يعرف شغله، مو فريق يجمّع الفصول ليلة التسليم."),
    image: proposalShot,
  },
  {
    id: "tasks",
    route: "/tasks",
    label: tr("مهامي"),
    icon: ListChecks,
    title: tr("المهام، صفر فوضى"),
    body: tr("وزّعوا الشغل، وتابعوا كل مهمة لحظة بلحظة. ما فيه بعد اليوم حجة ما كنت أدري إني عليّ مهمة."),
    image: tasksShot,
  },
  {
    id: "evidence",
    route: "/evidence",
    label: tr("مكتبة الأدلة"),
    icon: BookMarked,
    title: tr("مكتبة الأدلة، ذخيرتكم العلمية"),
    body: tr("كل دراسة تجمعونها تنحفظ هنا جاهزة باقتباس صحيح. هذي مو مجرد أرشيف، هذا سلاحكم وقت الكتابة، ولا داعي تدورون نفس المصدر عشر مرات."),
    image: evidenceShot,
  },
  {
    id: "team",
    route: "/team",
    label: tr("الفريق"),
    icon: Users,
    title: tr("فريقك"),
    body: tr("شوفوا مين شغال أكثر، ادعوا زملاءكم برابط واحد، وحتى مشرفكم يتابعكم بدون ما يسجّل دخول. شفافية كاملة، وصفر دراما بجروب الواتساب."),
    image: teamShot,
  },
  {
    id: "calendar",
    route: "/calendar",
    label: tr("التقويم"),
    icon: CalendarDays,
    title: tr("التقويم"),
    body: tr("كل اجتماع وكل تسليم نهائي بمكان واحد، وتقدرون تصدّرونه لجوالكم بضغطة واحدة. صفر أعذار بعد اليوم، ولا حتى نسيت أحط تنبيه."),
    image: calendarShot,
  },
  {
    id: "guide",
    route: "/guide",
    label: tr("دليل الطالب"),
    icon: Compass,
    title: tr("دليل الطالب"),
    body: tr("احتجتوا تفاصيل أكثر عن أي صفحة؟ هذا الدليل جاهز لكم وقت ما تبون ترجعون له، بدون ما تحرجون تسألون بعض نفس السؤال ثالث مرة."),
    image: guideShot,
  },
];
