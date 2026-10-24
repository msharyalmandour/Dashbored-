import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  Check,
  Copy,
  FileText,
  LifeBuoy,
  MessageCircle,
  Mic,
  PenLine,
  Search,
  Users,
  X,
} from "lucide-react";
import { g } from "../lib/gender";
import { tr, trx } from "../lib/i18n";

interface StuckHelpProps {
  isFemale: boolean;
  supervisorName: string;
  projectTitle: string;
}

interface Blocker {
  id: string;
  label: string;
  icon: typeof Search;
  /** أداة موجودة بالموقع تحل العلقة */
  tool: { to: string; cta: string; tip: string };
  /** صيغة الجملة اللي تنرسل للمشرف/ة لو الأداة ما كفت */
  ask: () => string;
}

const BLOCKERS: Blocker[] = [
  {
    id: "no-papers",
    label: tr("ما ألقى دراسات مرتبطة ببحثنا"),
    icon: Search,
    tool: { to: "/research-search?tab=studies", cta: tr("ابحثوا بعنوانكم"), tip: tr("اكتبوا عنوانكم كما هو، والبحث يجيب دراسات حقيقية قريبة منه. جرّبوا بعدها كلمات أعم لو النتائج قليلة.") },
    ask: () => tr("ما قدرت ألقى دراسات كافية قريبة من عنوان بحثنا، ممكن ترشدنا لكلمات بحث أو قواعد بيانات أنسب؟"),
  },
  {
    id: "no-start",
    label: tr("ما أدري من وين أبدأ الكتابة"),
    icon: PenLine,
    tool: { to: "/proposal", cta: tr("افتحوا المقترح"), tip: tr("ابدأوا بأسهل قسم، حتى لو مسودة. وزر «حسّن الصياغة» يساعد بعد ما تكتبون أول نسخة.") },
    ask: () => tr("نحتاج توجيه لبداية كتابة المقترح، تنصحون نبدأ بأي قسم؟"),
  },
  {
    id: "stats",
    label: tr("ما أفهم الإحصاء أو اختيار الاختبار"),
    icon: BarChart3,
    tool: { to: "/stats", cta: tr("افتحوا الإحصاء"), tip: tr("الصقوا الجدول، واختاروا الاختبار، والنتيجة تطلع مشروحة. وللمصطلحات فيه قاموس بالموقع.") },
    ask: () => tr("نحتاج مراجعة للاختبار الإحصائي المناسب لبياناتنا قبل ما نكمل التحليل."),
  },
  {
    id: "method",
    label: tr("ما أدري كيف أحدد المنهجية والعينة"),
    icon: BookOpen,
    tool: { to: "/methodology", cta: tr("افتحوا المنهجية"), tip: tr("حدّدوا التصميم والمجتمع، وبعدها احسبوا حجم العينة من نفس الصفحة.") },
    ask: () => tr("نحتاج نتأكد من التصميم المنهجي وحجم العينة قبل ما نبدأ جمع البيانات."),
  },
  {
    id: "letters",
    label: tr("أحتاج خطاب للمستشفى أو موافقات"),
    icon: FileText,
    tool: { to: "/study-kit", cta: tr("افتحوا الحقيبة"), tip: tr("فيه خطاب طلب تسهيل، وإذن الأداة، وورقة المعلومات والموافقة جاهزين ببيانات فريقكم. حمّلوها Word وعدّلوا عليها.") },
    ask: () => tr("نحتاج خطاب رسمي من القسم/المشرف لطلب تسهيل جمع البيانات، كيف نرتب الإجراء؟"),
  },
  {
    id: "team",
    label: tr("فيه تأخر أو خلاف بالفريق"),
    icon: Users,
    tool: { to: "/team", cta: tr("شوفوا الفريق"), tip: tr("افتحوا توزيع المهام وأعيدوا توزيع الحمل بهدوء. الأفضل تكلمون زميلكم مباشرة قبل أي شي ثاني.") },
    ask: () => tr("نواجه صعوبة بتوزيع العمل داخل الفريق، نبغى رأيكم نرتبه بشكل عادل."),
  },
  {
    id: "viva",
    label: tr("متوتر من المناقشة"),
    icon: Mic,
    tool: { to: "/viva", cta: tr("تدرّبوا على المناقشة"), tip: tr("اطلعوا بأسئلة متوقعة على بحثكم وتدرّبوا عليها بدون ضغط. المرة الأولى بتكون أصعب، وبعدها تتحسن.") },
    ask: () => tr("نبغى نرتب جلسة تدريب قبل المناقشة، متى يناسبكم؟"),
  },
];

function buildMessage(b: Blocker, title: string, supervisor: string): string {
  const greet = supervisor ? tr("السلام عليكم {0}", supervisor) : tr("السلام عليكم ورحمة الله");
  const about = title ? tr("بخصوص بحثنا «{0}»:", title) : tr("بخصوص بحثنا:");
  return tr("{0}\n{1}\n{2}\n\nشاكرين وقتكم.\n(أُرسلت من Wesync)", greet, about, b.ask());
}

/** «أنا عالق» — الطالب يختار وين علق، فنوجّهه لأداة موجودة بالموقع ونجهّز له رسالة للمشرف/ة لو ما كفت. */
export default function StuckHelp({ isFemale, supervisorName, projectTitle }: StuckHelpProps) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<Blocker | null>(null);
  const [copied, setCopied] = useState(false);

  const close = () => {
    setOpen(false);
    setPicked(null);
    setCopied(false);
  };
  const message = picked ? buildMessage(picked, projectTitle, supervisorName) : "";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // الحقل قابل للتحديد والنسخ يدويًا
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={tr("أنا عالق — اختاروا وين علقتم")}
        title={tr("أنا عالق؟ نوجّهك للأداة المناسبة أو نجهّز لك رسالة للمشرف/ة")}
        className="fixed bottom-[9.25rem] start-4 z-40 flex items-center gap-1.5 rounded-full border border-amber-accent-300/60 bg-paper/90 px-3.5 py-2 text-xs font-extrabold text-amber-accent-700 shadow-lg shadow-brand-950/15 backdrop-blur-xl transition-transform hover:scale-105 motion-reduce:transition-none md:bottom-[5.75rem] md:start-6 print:hidden"
      >
        <LifeBuoy size={16} />
        {g(isFemale, tr("عالقة؟"), tr("عالق؟"))}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={close} role="dialog" aria-modal="true" aria-label={tr("أنا عالق")}>
          <div className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-paper p-5 shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-extrabold text-brand-950">{picked ? picked.label : tr("وين علقت؟")}</h2>
                {!picked && <p className="mt-0.5 text-xs text-brand-950/55">{trx("العلقة طبيعية بأي بحث — {0} الأقرب لوضعك.", g(isFemale, tr("اختاري"), tr("اختر")))}</p>}
              </div>
              <button onClick={close} aria-label={tr("إغلاق")} className="rounded-lg p-1.5 text-brand-950/50 hover:bg-surface-muted">
                <X size={18} />
              </button>
            </div>

            {!picked ? (
              <ul className="space-y-2">
                {BLOCKERS.map((b) => (
                  <li key={b.id}>
                    <button
                      onClick={() => setPicked(b)}
                      className="flex w-full items-center gap-3 rounded-xl border border-brand-100 px-3.5 py-3 text-start text-sm font-bold text-brand-950 hover:bg-surface-muted"
                    >
                      <b.icon size={18} className="shrink-0 text-brand-500" />
                      {b.label}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl bg-brand-50 p-3.5">
                  <p className="text-xs font-bold text-brand-950/50">{tr("جرّبوا هذا أول شي")}</p>
                  <p className="mt-1 text-sm leading-relaxed text-brand-950/80">{picked.tool.tip}</p>
                  <Link
                    to={picked.tool.to}
                    onClick={close}
                    className="mt-3 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-600"
                  >
                    {picked.tool.cta}
                    <ArrowLeft size={15} />
                  </Link>
                </div>

                <div>
                  <p className="mb-1.5 text-xs font-bold text-brand-950/50">{trx("وإذا ما كفى، هذي رسالة جاهزة {0}", supervisorName ? tr("لـ {0}", supervisorName) : tr("للمشرف/ة"))}</p>
                  <textarea
                    readOnly
                    value={message}
                    rows={6}
                    dir="rtl"
                    className="w-full resize-none rounded-xl border border-brand-100 bg-surface-muted p-3 text-sm leading-relaxed text-brand-950/80"
                  />
                  <div className="mt-2.5 flex flex-wrap gap-2.5">
                    <button onClick={copy} className="flex items-center gap-2 rounded-xl border border-brand-100 px-4 py-2.5 text-sm font-bold text-brand-700 hover:bg-surface-muted">
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                      {copied ? tr("تم النسخ") : tr("نسخ الرسالة")}
                    </button>
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(message)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 rounded-xl border border-brand-100 px-4 py-2.5 text-sm font-bold text-brand-700 hover:bg-surface-muted"
                    >
                      <MessageCircle size={16} />{tr("واتساب")}</a>
                  </div>
                </div>

                <button onClick={() => setPicked(null)} className="text-xs font-bold text-brand-950/50 hover:text-brand-950">{tr("← رجوع للقائمة")}</button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
