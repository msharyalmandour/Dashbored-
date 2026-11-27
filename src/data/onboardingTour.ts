import { CalendarDays, CheckSquare, House, MessagesSquare, PenLine, Search, ShieldCheck, Users, type LucideIcon } from "lucide-react";
import { tr } from "../lib/i18n";

/** ويسي هو اللي يمشي معكم بالجولة — يعرّف عن نفسه بأول خطوة */
export const guideName = tr("ويسي");

/** أول جملة يقولها (وتنقال صوتيًا لو الصوت شغّال). بدون إيموجي ولا تعجّب */
export const guideIntro = tr("أنا ويسي. بوريكم المكان في دقيقة.");

export interface TourStep {
  id: string;
  route: string;
  /** البند بالقائمة اللي ويسي يأشّر عليه (data-nav-id بـ Sidebar) */
  nav: string;
  label: string;
  icon: LucideIcon;
  title: string;
  /** جملة وحدة بسيطة: وش المكان + مثال. بدون مصطلحات */
  body: string;
}

/** الجولة: ويسي ينتقل معكم لكل قسم، يضوّي بنده بالقائمة، ويقول جملة وحدة. اختيارية، وتقدرون تطلعون منها أي وقت. */
export const tourSteps: TourStep[] = [
  { id: "overview", route: "/", nav: "home", label: tr("الرئيسية"), icon: House, title: tr("هنا تبدؤون كل يوم"), body: tr("كل يوم تلقون فيها خطوة وحدة تبدؤون فيها، وين وصلتوا، ومواعيدكم.") },
  { id: "tasks", route: "/tasks", nav: "tasks", label: tr("مهامي"), icon: CheckSquare, title: tr("مهامك"), body: tr("كل مهمة لها صاحب وموعد. اضغطوا الدائرة جنبها لما تخلص، والفريق يشوف.") },
  { id: "search", route: "/research-search", nav: "search", label: tr("أبحث"), icon: Search, title: tr("تدوّرون دراسات"), body: tr("اكتبوا موضوعكم بكلمتين، واحفظوا الدراسات في مكتبتكم.") },
  { id: "proposal", route: "/proposal", nav: "write", label: tr("أكتب"), icon: PenLine, title: tr("تكتبون المقترح"), body: tr("المقترح مقسوم أقسام، وكل واحد منكم يمسك قسم.") },
  { id: "chat", route: "/chat", nav: "chat", label: tr("المحادثة"), icon: MessagesSquare, title: tr("تتكلمون كفريق"), body: tr("بدل قروب الواتساب. اللي ينقال هنا ما يضيع.") },
  { id: "team", route: "/team", nav: "team", label: tr("الفريق"), icon: Users, title: tr("فريقكم"), body: tr("تدعون زملاءكم برابط واحد، والمشرف/ة يتابعكم بدون تسجيل.") },
  { id: "supervisor", route: "/meeting-minutes", nav: "supervisor", label: tr("المشرف/ة"), icon: ShieldCheck, title: tr("المشرف/ة والاجتماعات"), body: tr("ملاحظات المشرف/ة تصير مهام، والاجتماعات ومحاضرها هنا.") },
  { id: "calendar", route: "/calendar", nav: "calendar", label: tr("التقويم والملفات"), icon: CalendarDays, title: tr("المواعيد والملفات"), body: tr("كل موعد وكل ملف بمكان واحد. وخلصنا، أنا موجود بالرئيسية لو احتجتوني.") },
];
