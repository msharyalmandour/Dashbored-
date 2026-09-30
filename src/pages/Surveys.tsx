import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ClipboardPen, Lightbulb, Plus, Trash2 } from "lucide-react";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Term from "../components/Term";
import { useAuth } from "../context/AuthContext";
import { MAX_SURVEYS, useSurveys } from "../hooks/useSurveys";

const statusLabel = { draft: "مسوّدة", open: "مفتوح", closed: "مغلق" } as const;
const statusStyle = { draft: "bg-surface-muted text-brand-950/60", open: "bg-emerald-100 text-emerald-700", closed: "bg-rose-100 text-rose-700" } as const;

export default function Surveys() {
  const nav = useNavigate();
  const { canWrite } = useAuth();
  const { surveys, loading, create, remove } = useSurveys();
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    setError(null);
    const r = await create();
    if (r.error) setError(r.error);
    else if (r.id) nav(`/surveys/${r.id}`);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-brand-950">منشئ الاستبيان</h1>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-brand-950/55">
            نبني معكم استبيان بحثكم خطوة بخطوة — ونشرح لكم ليش كل خطوة، وننبّهكم على الأخطاء الشائعة قبل ما توصلون للمشاركين. ما تحتاجون خبرة سابقة.
          </p>
        </div>
        {canWrite && (
          <button
            onClick={start}
            disabled={surveys.length >= MAX_SURVEYS}
            className="flex items-center gap-2 rounded-2xl bg-brand-500 px-5 py-2.5 text-sm font-extrabold text-white hover:bg-brand-600 disabled:opacity-40"
          >
            <Plus size={16} />
            استبيان جديد
          </button>
        )}
      </div>
      {error && <p className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-500">{error}</p>}

      <Card tone="cream" className="space-y-2">
        <p className="flex items-center gap-2 text-sm font-extrabold text-brand-950">
          <Lightbulb size={15} className="text-brand-500" />
          رحلة الاستبيان بـ ٦ خطوات
        </p>
        <ol className="grid gap-2 text-xs text-brand-950/65 sm:grid-cols-3">
          <li className="rounded-xl bg-paper px-3 py-2"><b>١. الهدف</b> — وش تبغون تعرفون؟</li>
          <li className="rounded-xl bg-paper px-3 py-2"><b>٢. الأسئلة</b> — مع مراجعة تلقائية لصياغتها</li>
          <li className="rounded-xl bg-paper px-3 py-2"><b>٣. الموافقة</b> — <Term id="consent">الموافقة المستنيرة</Term></li>
          <li className="rounded-xl bg-paper px-3 py-2"><b>٤. جرّبوا</b> — <Term id="pilot">دراسة استطلاعية</Term> قبل النشر</li>
          <li className="rounded-xl bg-paper px-3 py-2"><b>٥. انشروا</b> — رابط بدون حساب وحجم العينة</li>
          <li className="rounded-xl bg-paper px-3 py-2"><b>٦. النتائج</b> — جداول وثبات وتصدير</li>
        </ol>
      </Card>

      {loading ? (
        <p className="py-8 text-center text-sm text-brand-950/50">جاري التحميل…</p>
      ) : surveys.length === 0 ? (
        <EmptyState icon={ClipboardPen} title="ما عندكم استبيانات بعد" desc="اضغطوا «استبيان جديد» وأول خطوة نساعدكم فيها تحددون الهدف." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {surveys.map((s) => (
            <Card key={s.id} className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <Link to={`/surveys/${s.id}`} className="min-w-0 flex-1">
                  <p className="truncate font-bold text-brand-950">{s.title || "استبيان بدون عنوان"}</p>
                  <p className="mt-0.5 text-xs text-brand-950/45">{s.questions.length} سؤال{s.isPilot ? " · تجريبي" : ""}</p>
                </Link>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-extrabold ${statusStyle[s.status]}`}>{statusLabel[s.status]}</span>
              </div>
              <div className="flex items-center justify-between">
                <Link to={`/surveys/${s.id}`} className="text-xs font-bold text-brand-600 underline underline-offset-2">
                  افتحوه
                </Link>
                {canWrite && (
                  <button
                    onClick={() => window.confirm("تحذفون هذا الاستبيان وكل ردوده؟ ما ينرجع.") && remove(s.id)}
                    className="rounded-lg p-1.5 text-brand-950/35 hover:bg-rose-500/10 hover:text-rose-500"
                    title="حذف"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
      <p className="text-[11px] leading-relaxed text-brand-950/40">
        حد الفريق {MAX_SURVEYS} استبيانات. الردود مجهولة، وتنحفظ عندنا بحيث تشوفها أنتم بس. لازم يراجع الاستبيان المشرف/ـة و<Term id="irb">لجنة الأخلاقيات</Term> بجهتكم قبل النشر.
      </p>
    </div>
  );
}
