import {
  BookMarked,
  BookOpenText,
  CalendarDays,
  Compass,
  Download,
  FlaskConical,
  FolderClosed,
  LayoutDashboard,
  Library,
  ListChecks,
  ListTree,
  MapPinned,
  Users,
} from "lucide-react";
import Card, { CardHeader, type CardTone } from "../components/ui/Card";
import { useAuth } from "../context/AuthContext";
import { useTour } from "../context/TourContext";
import { useTasksData } from "../hooks/useTasksData";
import { useTaskComments } from "../hooks/useTaskComments";
import { useTeamRoster } from "../hooks/useTeamRoster";
import { useCalendarEvents } from "../hooks/useCalendarEvents";
import {
  evidenceLibrary,
  files,
  methodology,
  projectMeta,
  proposalSections,
  recentActivity,
  researchGap,
  studyAim,
} from "../data/mockData";
import { downloadBackup } from "../lib/backup";

const sections: { icon: typeof LayoutDashboard; title: string; desc: string; tone: CardTone }[] = [
  {
    icon: LayoutDashboard,
    title: "الرئيسية",
    desc: "نظرة سريعة تجاوب على: وين وصل بحثي؟ ما المرحلة الحالية؟ وش المهمة والخطوة القادمة؟",
    tone: "teal",
  },
  {
    icon: BookOpenText,
    title: "المقترح البحثي",
    desc: "مكونات المقترح السبعة (Background إلى Methodology) بحالتها، بالإضافة إلى بطاقتي الفجوة البحثية وهدف الدراسة.",
    tone: "cream",
  },
  {
    icon: BookMarked,
    title: "مراجعة الأدبيات",
    desc: "الدراسات المجمّعة والمُراجَعة، مصنّفة حسب الموضوع البحثي (Theme) مع أهم نتائج كل دراسة.",
    tone: "sky",
  },
  {
    icon: FlaskConical,
    title: "المنهجية",
    desc: "قرارات المنهجية: تصميم الدراسة، العينة، أداة الدراسة، وطريقة جمع البيانات.",
    tone: "amber",
  },
  {
    icon: ListChecks,
    title: "مهامي",
    desc: "مهام الكتابة البحثية الفعلية. تقدر تفلتر حسب الحالة، وقائدة الفريق فقط تقدر تسند مهام جديدة.",
    tone: "violet",
  },
  {
    icon: Library,
    title: "مكتبة الأدلة",
    desc: "كل المصادر العلمية اللي يجمعها الفريق، مصنّفة حسب القسم اللي تدعمه (خلفية، أدبيات، فجوة، منهجية).",
    tone: "rose",
  },
  {
    icon: Users,
    title: "الفريق",
    desc: "بطاقة لكل باحث فيها نسبة إنجازه وعدد مهامه المكتملة والمتأخرة.",
    tone: "sky",
  },
  {
    icon: ListTree,
    title: "الجدول الزمني",
    desc: "عرض بصري (Gantt) لرحلة البحث الثمانية من المقترح إلى البحث النهائي.",
    tone: "cream",
  },
  {
    icon: MapPinned,
    title: "الميدان",
    desc: "مواقع جمع البيانات الميدانية — تُفعَّل لاحقًا عند الوصول لمرحلة Data Collection.",
    tone: "teal",
  },
  {
    icon: FolderClosed,
    title: "الملفات",
    desc: "كل ملفات ومستندات البحث، مصنّفة حسب القسم اللي تتبعه.",
    tone: "amber",
  },
  {
    icon: CalendarDays,
    title: "التقويم",
    desc: "تقويم شهري كامل لكل الاجتماعات ومواعيد التسليم النهائية.",
    tone: "violet",
  },
];

export default function Guide() {
  const { isLeader } = useAuth();
  const { startTour } = useTour();
  const { tasks } = useTasksData();
  const { comments } = useTaskComments();
  const { roster } = useTeamRoster();
  const { events } = useCalendarEvents();

  const exportBackup = () => {
    downloadBackup({
      projectMeta,
      proposalSections,
      researchGap,
      studyAim,
      methodology,
      tasks,
      taskComments: comments,
      evidenceLibrary,
      team: roster,
      files,
      calendarEvents: events,
      recentActivity,
    });
  };

  return (
    <div className="space-y-6">
      <Card tone="amber" className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-bold text-brand-950">
            أهلًا فيك في Wesync 👋
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-brand-950/60">
            هذا الدليل يوضح لك وين تروح لكل شيء داخل الموقع، وكيف تشتغل على بحثك
            خطوة بخطوة.
          </p>
        </div>
        <button
          onClick={startTour}
          className="flex shrink-0 items-center gap-2 rounded-xl bg-amber-accent-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-amber-accent-600"
        >
          <Compass size={16} />
          ابدأ الجولة التعريفية
        </button>
      </Card>

      <div>
        <h3 className="font-display mb-3 text-base font-bold text-brand-950">
          وين تروح لكل شيء؟
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sections.map((s) => (
            <Card key={s.title} tone={s.tone} className="flex gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-paper text-brand-700">
                <s.icon size={18} />
              </span>
              <div>
                <p className="font-bold text-brand-950">{s.title}</p>
                <p className="mt-1 text-sm text-brand-950/60">{s.desc}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title={isLeader ? "كيف تسند مهمة جديدة" : "كيف تشتغل على مهمة مسندة لك"}
          />
          {isLeader ? (
            <ol className="space-y-3 text-sm text-brand-950/70">
              <li className="flex gap-2">
                <span className="font-bold text-brand-600">١.</span>
                افتح صفحة <b>مهامي</b> من القائمة الجانبية.
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-brand-600">٢.</span>
                اضغط زر <b>«إسناد مهمة جديدة»</b> أعلى الصفحة (يظهر لك فقط بصفتك
                قائدة الفريق).
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-brand-600">٣.</span>
                اكتب عنوان المهمة ووصفها، واختر الباحث المسؤول وتاريخ التسليم
                والأولوية.
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-brand-600">٤.</span>
                اضغط <b>«إسناد المهمة»</b> — المهمة تظهر فورًا في قائمة الباحث
                وفي «مهامي القادمة» بالرئيسية.
              </li>
            </ol>
          ) : (
            <ol className="space-y-3 text-sm text-brand-950/70">
              <li className="flex gap-2">
                <span className="font-bold text-brand-600">١.</span>
                افتح صفحة <b>مهامي</b> واضغط تبويب <b>«مهامي»</b> عشان تشوف
                اللي مسندة لك بس.
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-brand-600">٢.</span>
                راجع تاريخ التسليم والأولوية — المهام المتأخرة تظهر باللون
                الأحمر.
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-brand-600">٣.</span>
                لما تخلّص المهمة أخبر قائدة الفريق حتى تحدّث حالتها إلى
                «مكتملة».
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-brand-600">٤.</span>
                تقدر تشوف تقدمك العام في صفحة <b>الفريق</b>.
              </li>
            </ol>
          )}
        </Card>

        <Card tone="violet">
          <CardHeader title="نصائح سريعة" />
          <ul className="space-y-3 text-sm text-brand-950/70">
            <li className="flex gap-2">
              <span className="font-bold text-brand-600">•</span>
              راجع <b>الرئيسية</b> كل يوم — فيها مرحلتك الحالية وخطوتك التالية.
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-brand-600">•</span>
              لا تكتب <b>Aim</b> قبل ما تُغلق <b>الفجوة البحثية</b> بشكل واضح —
              الترتيب مهم في المقترح البحثي.
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-brand-600">•</span>
              كل دراسة تجمعها ضيفها في <b>مكتبة الأدلة</b> مع تصنيف واضح لموضوعها
              حتى تسهل عليك كتابة مراجعة الأدبيات.
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-brand-600">•</span>
              ارفع كل مسودة في <b>الملفات</b> بدل ما تبقى عندك بس، عشان يوصل
              لباقي الفريق.
            </li>
          </ul>
        </Card>
      </div>

      <Card className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-brand-700">
            <Download size={18} />
          </span>
          <div>
            <p className="font-bold text-brand-950">نسخة احتياطية</p>
            <p className="mt-1 max-w-md text-sm text-brand-950/60">
              نزّل نسخة JSON من كل بيانات فريقكم — المقترح، المهام، مكتبة الأدلة،
              الفريق، والملفات — تقدرون تحتفظون فيها أو ترسلونها لمشرفكم.
            </p>
          </div>
        </div>
        <button
          onClick={exportBackup}
          className="flex shrink-0 items-center gap-2 rounded-xl border border-brand-200 bg-paper px-4 py-2.5 text-sm font-bold text-brand-700 hover:bg-brand-50"
        >
          <Download size={16} />
          تصدير نسخة احتياطية
        </button>
      </Card>
    </div>
  );
}
