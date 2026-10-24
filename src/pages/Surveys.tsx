import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ClipboardPen, Plus, Trash2 } from "lucide-react";
import { PageColumns, PageHeader, Panel, StatusChip, primaryBtn, rowSurface, type ChipTone } from "../components/ui/page";
import EmptyState from "../components/ui/EmptyState";
import Term from "../components/Term";
import { useAuth } from "../context/AuthContext";
import { MAX_SURVEYS, useSurveys } from "../hooks/useSurveys";
import { tr, trx } from "../lib/i18n";

const statusLabel = { draft: tr("مسوّدة"), open: tr("مفتوح"), closed: tr("مغلق") } as const;
const statusTone: Record<"draft" | "open" | "closed", ChipTone> = { draft: "todo", open: "done", closed: "late" };

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
    <div className="space-y-6">
      <PageHeader
        kicker={tr("اجمع وحلّل")}
        title={tr("منشئ الاستبيان")}
        subtitle={tr("نبني معكم استبيان بحثكم خطوة بخطوة — ونشرح لكم ليش كل خطوة، وننبّهكم على الأخطاء الشائعة قبل ما توصلون للمشاركين.")}
        action={
          canWrite ? (
            <button onClick={start} disabled={surveys.length >= MAX_SURVEYS} className={primaryBtn}>
              <Plus size={16} />{tr("استبيان جديد")}</button>
          ) : undefined
        }
      />
      {error && <p className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-500">{error}</p>}

      <PageColumns
        side={
          <Panel title={tr("رحلة الاستبيان")}>
            <ol className="space-y-2 text-sm text-brand-950/70">
              <li className={rowSurface}><b className="text-brand-950">{tr("١. الهدف")}</b>{tr(" — وش تبغون تعرفون؟")}</li>
              <li className={rowSurface}><b className="text-brand-950">{tr("٢. الأسئلة")}</b>{tr(" — مع مراجعة تلقائية لصياغتها")}</li>
              <li className={rowSurface}><b className="text-brand-950">{tr("٣. الموافقة")}</b> — <Term id="consent">{tr("الموافقة المستنيرة")}</Term></li>
              <li className={rowSurface}><b className="text-brand-950">{tr("٤. جرّبوا")}</b> — <Term id="pilot">{tr("دراسة استطلاعية")}</Term>{tr(" قبل النشر")}</li>
              <li className={rowSurface}><b className="text-brand-950">{tr("٥. انشروا")}</b>{tr(" — رابط بدون حساب وحجم العينة")}</li>
              <li className={rowSurface}><b className="text-brand-950">{tr("٦. النتائج")}</b>{tr(" — جداول وثبات وتصدير")}</li>
            </ol>
          </Panel>
        }
        main={
          <>
            {loading ? (
              <p className="py-8 text-center text-sm text-brand-950/50">{tr("جاري التحميل…")}</p>
            ) : surveys.length === 0 ? (
              <EmptyState icon={ClipboardPen} title={tr("ما عندكم استبيانات بعد")} desc={tr("اضغطوا «استبيان جديد» وأول خطوة نساعدكم فيها تحددون الهدف.")} />
            ) : (
              <Panel title={tr("استبياناتكم")} hint={tr("{0} من {1}", surveys.length, MAX_SURVEYS)}>
                <div className="flex flex-col gap-2.5">
                  {surveys.map((s) => (
                    <div key={s.id} className={`${rowSurface} flex items-center gap-3`}>
                      <Link to={`/surveys/${s.id}`} className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-brand-950">{s.title || tr("استبيان بدون عنوان")}</p>
                        <p className="mt-0.5 text-xs text-brand-950/45">{trx("{0} سؤال{1}", s.questions.length, s.isPilot ? tr(" · تجريبي") : "")}</p>
                      </Link>
                      <StatusChip tone={statusTone[s.status]}>{statusLabel[s.status]}</StatusChip>
                      <Link to={`/surveys/${s.id}`} className="text-sm font-semibold text-amber-accent-400 hover:underline">{tr("افتحوه")}</Link>
                      {canWrite && (
                        <button
                          onClick={() => window.confirm(tr("تحذفون هذا الاستبيان وكل ردوده؟ ما ينرجع.")) && remove(s.id)}
                          className="rounded-lg p-1.5 text-brand-950/35 hover:bg-rose-500/10 hover:text-rose-500"
                          title={tr("حذف")}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </Panel>
            )}
            <p className="text-[11px] leading-relaxed text-brand-950/40">{trx("حد الفريق {0} استبيانات. الردود مجهولة، وتنحفظ عندنا بحيث تشوفها أنتم بس. لازم يراجع الاستبيان المشرف/ـة و", MAX_SURVEYS)}<Term id="irb">{tr("لجنة الأخلاقيات")}</Term>{tr(" بجهتكم قبل النشر.")}</p>
          </>
        }
      />
    </div>
  );
}
