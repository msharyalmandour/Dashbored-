import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Circle, FileDown, RefreshCw } from "lucide-react";
import Card, { CardHeader } from "../components/ui/Card";
import {
  evidenceLibrary,
  methodology,
  proposalSections,
  researchGap,
  studyAim,
  teamMembers,
  projectMeta,
} from "../data/mockData";
import type { SectionStatus } from "../data/types";
import { buildReferenceList } from "../lib/citation";
import { formatDateLong } from "../lib/date";

const statusLabel: Record<SectionStatus, string> = {
  done: "مكتمل",
  "in-progress": "قيد العمل",
  "not-started": "لم يبدأ",
};

function StatusIcon({ status }: { status: SectionStatus }) {
  if (status === "done") return <CheckCircle2 size={16} className="shrink-0 text-brand-500" />;
  if (status === "in-progress")
    return <RefreshCw size={15} className="shrink-0 text-amber-accent-500" />;
  return <Circle size={15} className="shrink-0 text-brand-950/25" />;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface-muted p-4">
      <p className="text-xs font-bold text-brand-950/45">{label}</p>
      {value ? (
        <p className="mt-1 text-sm font-semibold text-brand-950">{value}</p>
      ) : (
        <p className="mt-1 text-sm italic text-brand-950/35">لم يُحدد بعد</p>
      )}
    </div>
  );
}

function ListField({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="rounded-2xl bg-surface-muted p-4">
      <p className="text-xs font-bold text-brand-950/45">{label}</p>
      {items.length > 0 ? (
        <ul className="mt-1.5 space-y-1">
          {items.map((item, i) => (
            <li key={i} className="flex gap-2 text-sm text-brand-950/75">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-sm italic text-brand-950/35">لم تُحدد بعد</p>
      )}
    </div>
  );
}

export default function FullDocumentExport() {
  const references = buildReferenceList(evidenceLibrary, "apa").split("\n\n");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          to="/proposal"
          className="flex items-center gap-1.5 text-sm font-semibold text-brand-950/50 hover:text-brand-700"
        >
          <ArrowRight size={16} />
          رجوع للمقترح
        </Link>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-600"
        >
          <FileDown size={16} />
          تصدير PDF
        </button>
      </div>

      {/* غلاف الوثيقة */}
      <Card tone="cream" className="text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-brand-950/40">
          NURSYNC — الوثيقة البحثية الكاملة
        </p>
        <h1 className="mt-3 font-display text-2xl font-extrabold text-brand-950">
          {projectMeta.name}
        </h1>
        <p className="mt-1 text-sm text-brand-950/60" dir="ltr">
          {projectMeta.subtitle}
        </p>
        <p className="mt-4 text-xs text-brand-950/45">
          الفريق البحثي: {teamMembers.map((m) => m.name).join("، ")}
        </p>
        <p className="mt-1 text-xs text-brand-950/45">
          تم إنشاء هذه النسخة بتاريخ {formatDateLong(new Date().toISOString().slice(0, 10))}
        </p>
      </Card>

      {/* القسم 1: المقترح البحثي */}
      <Card className="print:break-inside-avoid">
        <CardHeader title="١. مكونات المقترح البحثي" subtitle="Proposal Components" />
        <ul className="divide-y divide-brand-50">
          {proposalSections.map((section) => (
            <li key={section.key} className="flex items-center gap-3 py-2.5">
              <StatusIcon status={section.status} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-brand-950">{section.labelAr}</p>
                <p className="text-xs text-brand-950/45">{section.labelEn}</p>
              </div>
              <span className="whitespace-nowrap text-xs font-bold text-brand-950/50">
                {statusLabel[section.status]}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <Card tone="amber" className="print:break-inside-avoid">
        <CardHeader title="الفجوة البحثية" subtitle="Research Gap" />
        <div className="rounded-2xl bg-paper p-4">
          <p className="mb-1.5 text-sm font-bold text-amber-accent-700">Research Gap</p>
          <p className="text-sm text-brand-950/80">{researchGap.gapStatement}</p>
        </div>
        <div className="mt-3 rounded-2xl bg-paper p-4">
          <p className="mb-1.5 text-sm font-bold text-brand-950">ما ستدرسه — Your Study</p>
          <p className="text-sm text-brand-950/80">{researchGap.studyConnection}</p>
        </div>
      </Card>

      <Card className="print:break-inside-avoid">
        <CardHeader title="هدف الدراسة وأسئلة البحث" subtitle="Aim & Research Questions" />
        <div className="rounded-2xl bg-surface-muted p-4">
          <p className="mb-1.5 text-sm font-bold text-brand-950">هدف الدراسة — Purpose / Aim</p>
          {studyAim.statement ? (
            <p className="text-sm text-brand-950/80">{studyAim.statement}</p>
          ) : (
            <p className="text-sm italic text-brand-950/40">لم تتم صياغته بعد.</p>
          )}
        </div>
        <div className="mt-3 rounded-2xl bg-surface-muted p-4">
          <p className="mb-1.5 text-sm font-bold text-brand-950">أسئلة البحث — Research Questions</p>
          {studyAim.questions.length > 0 ? (
            <ol className="space-y-1.5">
              {studyAim.questions.map((q) => (
                <li key={q.id} className="flex gap-2 text-sm text-brand-950/80">
                  <span className="font-bold text-brand-600">{q.order}.</span>
                  {q.text}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm italic text-brand-950/40">لم تتم صياغتها بعد.</p>
          )}
        </div>
      </Card>

      {/* القسم 2: المنهجية */}
      <div className="space-y-5 print:break-before-page">
        <Card className="print:break-inside-avoid">
          <CardHeader title="٢. المنهجية" subtitle="Methodology" />
          <Field label="نوع التصميم (كمي / كيفي / مختلط)" value={methodology.studyDesign} />
        </Card>

        <Card className="print:break-inside-avoid">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="مكان الدراسة — Study Setting" value={methodology.studySetting} />
            <Field label="مجتمع الدراسة — Population" value={methodology.population} />
          </div>
        </Card>

        <Card className="print:break-inside-avoid">
          <CardHeader title="العينة" subtitle="Sampling" />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <ListField label="معايير الاشتمال" items={methodology.sampling.inclusionCriteria} />
            <ListField label="معايير الاستبعاد" items={methodology.sampling.exclusionCriteria} />
            <Field label="حجم العينة" value={methodology.sampling.sampleSize} />
            <Field label="أسلوب اختيار العينة" value={methodology.sampling.samplingTechnique} />
          </div>
        </Card>

        <Card className="print:break-inside-avoid">
          <CardHeader title="جمع البيانات" subtitle="Data Collection" />
          <ListField label="طريقة الجمع" items={methodology.dataCollectionMethods} />
        </Card>
      </div>

      {/* القسم 3: قائمة المراجع */}
      <div className="print:break-before-page">
        <Card className="print:break-inside-avoid">
          <CardHeader title="٣. قائمة المراجع" subtitle={`References — APA (${evidenceLibrary.length})`} />
          <div className="space-y-3">
            {references.map((ref, i) => (
              <p key={i} className="text-sm leading-relaxed text-brand-950/80" dir="ltr">
                {ref}
              </p>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
