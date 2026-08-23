import {
  BookOpenText,
  CalendarDays,
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

const sections: { icon: typeof LayoutDashboard; title: string; desc: string; tone: CardTone }[] = [
  {
    icon: LayoutDashboard,
    title: "الرئيسية",
    desc: "نظرة سريعة على كل شيء: كم باقي على التسليم، مؤشراتكم العامة، أولويات اليوم، وتقويم الشهر.",
    tone: "teal",
  },
  {
    icon: BookOpenText,
    title: "خطة البحث",
    desc: "الخطة الكاملة بـ 12 مرحلة من اختيار الموضوع إلى المناقشة النهائية، كل مرحلة فيها مسؤولها وتاريخها.",
    tone: "cream",
  },
  {
    icon: ListChecks,
    title: "المهام",
    desc: "كل مهامك ومهام الفريق. تقدر تفلتر حسب الحالة، وقائدة الفريق فقط تقدر تسند مهام جديدة من هنا.",
    tone: "sky",
  },
  {
    icon: Users,
    title: "الفريق",
    desc: "بطاقة لكل عضو فيها نسبة إنجازه وعدد مهامه المكتملة والمتأخرة.",
    tone: "violet",
  },
  {
    icon: ListTree,
    title: "الجدول الزمني",
    desc: "عرض بصري (Gantt) لمدة كل مرحلة من مراحل البحث ومتى تبدأ وتنتهي.",
    tone: "amber",
  },
  {
    icon: MapPinned,
    title: "الميدان",
    desc: "مواقع جمع البيانات الميدانية وعدد المشاركين اللي تم جمع بياناتهم في كل موقع.",
    tone: "rose",
  },
  {
    icon: Library,
    title: "المراجع",
    desc: "قائمة المصادر العلمية اللي يجمعها الفريق، مصنّفة حسب النوع (مقالات، كتب، تقارير، أدلة).",
    tone: "sky",
  },
  {
    icon: FolderClosed,
    title: "الملفات",
    desc: "كل ملفات ومستندات البحث، مصنّفة حسب المجلد اللي تتبعه.",
    tone: "cream",
  },
  {
    icon: CalendarDays,
    title: "التقويم",
    desc: "تقويم شهري كامل لكل الاجتماعات والمواعيد النهائية وأيام الجمع الميداني.",
    tone: "teal",
  },
];

export default function Guide() {
  const { isLeader } = useAuth();

  return (
    <div className="space-y-6">
      <Card tone="amber">
        <h2 className="font-display text-lg font-bold text-brand-950">
          أهلًا فيك في NURSYNC 👋
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-brand-950/60">
          هذا الدليل يوضح لك وين تروح لكل شيء داخل الموقع، وكيف تشتغل على مهامك
          خطوة بخطوة.
        </p>
      </Card>

      <div>
        <h3 className="font-display mb-3 text-base font-bold text-brand-950">
          وين تروح لكل شيء؟
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sections.map((s) => (
            <Card key={s.title} tone={s.tone} className="flex gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/70 text-brand-700">
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
                افتح صفحة <b>المهام</b> من القائمة الجانبية.
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-brand-600">٢.</span>
                اضغط زر <b>«إسناد مهمة جديدة»</b> أعلى الصفحة (يظهر لك فقط بصفتك
                قائدة الفريق).
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-brand-600">٣.</span>
                اكتب عنوان المهمة ووصفها، واختر العضو المسؤول وتاريخ التسليم
                والأولوية.
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-brand-600">٤.</span>
                اضغط <b>«إسناد المهمة»</b> — المهمة تظهر فورًا في قائمة العضو
                وفي أولويات اليوم بالرئيسية.
              </li>
            </ol>
          ) : (
            <ol className="space-y-3 text-sm text-brand-950/70">
              <li className="flex gap-2">
                <span className="font-bold text-brand-600">١.</span>
                افتح صفحة <b>المهام</b> واضغط تبويب <b>«مهامي»</b> عشان تشوف
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
              راجع <b>الرئيسية</b> كل يوم — فيها أولوياتك وأقرب موعد نهائي.
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-brand-600">•</span>
              اربط كل مهمة أو ملف بمرحلته في <b>خطة البحث</b> عشان يبقى كل شي
              منظم.
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-brand-600">•</span>
              حدّث بياناتك الميدانية أول بأول في صفحة <b>الميدان</b> حتى يشوف
              الفريق التقدم الفعلي.
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-brand-600">•</span>
              ارفع كل ملف بحثي في <b>الملفات</b> بدل ما يبقى عندك بس، عشان
              يوصل لباقي الفريق.
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
